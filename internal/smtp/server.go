// Package smtp implements the local SMTP capture server.
//
// SECURITY: this server is a sink, not a relay. It accepts messages, stores them locally, and
// never opens an outbound connection. There is no code path that forwards a message.
package smtp

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	gosmtp "github.com/emersion/go-smtp"

	"mailize/internal/models"
	"mailize/internal/services"
)

// Config is the immutable configuration for one server run.
type Config struct {
	Host           string
	Port           int
	RequireAuth    bool
	MaxMessageSize int64
	MaxConnections int
}

// Server owns the listener lifecycle: Start / Stop are safe to call repeatedly and concurrently.
type Server struct {
	projects *services.ProjectService
	emails   *services.EmailService
	notify   func(event string, data any)
	log      *slog.Logger

	mu        sync.Mutex
	srv       *gosmtp.Server
	listener  *limitListener
	cfg       Config
	running   bool
	startedAt time.Time
	lastErr   string
	done      chan struct{}
}

func NewServer(p *services.ProjectService, e *services.EmailService, notify func(string, any), log *slog.Logger) *Server {
	if notify == nil {
		notify = func(string, any) {}
	}
	if log == nil {
		log = slog.Default()
	}
	return &Server{projects: p, emails: e, notify: notify, log: log}
}

// Start binds the listener and serves in the background. It returns once the port is bound,
// so bind errors (port in use) are reported to the caller.
func (s *Server) Start(cfg Config) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.running {
		return errors.New("SMTP server is already running")
	}

	addr := net.JoinHostPort(cfg.Host, strconv.Itoa(cfg.Port))
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		s.lastErr = err.Error()
		return fmt.Errorf("cannot listen on %s: %w", addr, err)
	}
	ll := newLimitListener(ln, cfg.MaxConnections)

	srv := gosmtp.NewServer(&backend{server: s, cfg: cfg})
	srv.Domain = "mailize.local"
	srv.ReadTimeout = 60 * time.Second
	srv.WriteTimeout = 60 * time.Second
	srv.MaxMessageBytes = cfg.MaxMessageSize
	srv.MaxRecipients = 100
	// Credentials are only ever exchanged with a local developer app; TLS is not offered.
	srv.AllowInsecureAuth = true

	s.srv, s.listener, s.cfg, s.running, s.lastErr = srv, ll, cfg, true, ""
	s.startedAt = time.Now()
	s.done = make(chan struct{})

	go func(done chan struct{}) {
		defer close(done)
		if err := srv.Serve(ll); err != nil && !errors.Is(err, gosmtp.ErrServerClosed) && !errors.Is(err, net.ErrClosed) {
			s.mu.Lock()
			s.lastErr = err.Error()
			s.running = false
			s.mu.Unlock()
			s.log.Error("smtp server stopped unexpectedly", "err", err)
			s.notify("smtp:stopped", s.Status())
		}
	}(s.done)

	s.log.Info("smtp server started", "addr", addr, "auth_required", cfg.RequireAuth)
	go s.notify("smtp:started", s.statusLocked())
	return nil
}

// Stop closes the listener and open connections, waiting up to ctx for the serve loop to exit.
func (s *Server) Stop(ctx context.Context) error {
	s.mu.Lock()
	if !s.running {
		s.mu.Unlock()
		return nil
	}
	srv, ln, done := s.srv, s.listener, s.done
	s.running = false
	s.mu.Unlock()

	err := srv.Close()
	// If Stop races ahead of Serve registering the listener, srv.Close() cannot see it and Serve
	// would block in Accept forever; closing the listener ourselves guarantees Serve returns.
	_ = ln.Close()
	select {
	case <-done:
	case <-ctx.Done():
	}
	s.log.Info("smtp server stopped")
	s.notify("smtp:stopped", s.Status())
	return err
}

func (s *Server) Status() models.SMTPStatus {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.statusLocked()
}

func (s *Server) statusLocked() models.SMTPStatus {
	st := models.SMTPStatus{Running: s.running, Host: s.cfg.Host, Port: s.cfg.Port, LastError: s.lastErr}
	if s.cfg.Host != "" {
		st.Address = net.JoinHostPort(s.cfg.Host, strconv.Itoa(s.cfg.Port))
	}
	if s.running {
		st.StartedAt = s.startedAt.UTC().Format(time.RFC3339)
		if s.listener != nil {
			st.ActiveConnections = int(s.listener.active.Load())
		}
	}
	return st
}

// limitListener caps concurrent connections; excess connections are closed immediately.
type limitListener struct {
	net.Listener
	sem    chan struct{}
	active atomic.Int32
}

func newLimitListener(l net.Listener, max int) *limitListener {
	if max < 1 {
		max = 1
	}
	return &limitListener{Listener: l, sem: make(chan struct{}, max)}
}

func (l *limitListener) Accept() (net.Conn, error) {
	for {
		c, err := l.Listener.Accept()
		if err != nil {
			return nil, err
		}
		select {
		case l.sem <- struct{}{}:
			l.active.Add(1)
			return &limitConn{Conn: c, l: l}, nil
		default:
			c.Close() // over the limit
		}
	}
}

type limitConn struct {
	net.Conn
	l    *limitListener
	once sync.Once
}

func (c *limitConn) Close() error {
	c.once.Do(func() {
		<-c.l.sem
		c.l.active.Add(-1)
	})
	return c.Conn.Close()
}
