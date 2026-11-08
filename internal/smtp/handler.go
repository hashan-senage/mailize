package smtp

import (
	"errors"
	"io"

	"github.com/emersion/go-sasl"
	gosmtp "github.com/emersion/go-smtp"

	"mailize/internal/models"
	"mailize/internal/services"
)

type backend struct {
	server *Server
	cfg    Config
}

func (b *backend) NewSession(c *gosmtp.Conn) (gosmtp.Session, error) {
	return &session{b: b}, nil
}

// session is one SMTP connection's state. Project ownership is decided solely by the
// credentials presented in AUTH, so one project cannot write into another.
type session struct {
	b       *backend
	project *models.Project
	from    string
	rcpt    []string
}

func (s *session) AuthMechanisms() []string { return []string{sasl.Plain, sasl.Login} }

func (s *session) Auth(mech string) (sasl.Server, error) {
	authn := func(username, password string) error {
		p, err := s.b.server.projects.Authenticate(username, password)
		if err != nil {
			// never log the password; the username alone is enough to diagnose
			s.b.server.log.Warn("smtp auth rejected", "username", username, "reason", err.Error())
			if errors.Is(err, services.ErrProjectOff) {
				return &gosmtp.SMTPError{Code: 535, EnhancedCode: gosmtp.EnhancedCode{5, 7, 8}, Message: "Project is disabled"}
			}
			return &gosmtp.SMTPError{Code: 535, EnhancedCode: gosmtp.EnhancedCode{5, 7, 8}, Message: "Authentication failed"}
		}
		s.project = &p
		return nil
	}
	if mech == sasl.Login {
		return newLoginServer(authn), nil
	}
	return sasl.NewPlainServer(func(_, username, password string) error { return authn(username, password) }), nil
}

func (s *session) Mail(from string, _ *gosmtp.MailOptions) error {
	if s.project == nil && s.b.cfg.RequireAuth {
		return gosmtp.ErrAuthRequired
	}
	s.from = from
	return nil
}

func (s *session) Rcpt(to string, _ *gosmtp.RcptOptions) error {
	if len(s.rcpt) >= 100 {
		return &gosmtp.SMTPError{Code: 452, EnhancedCode: gosmtp.EnhancedCode{4, 5, 3}, Message: "Too many recipients"}
	}
	s.rcpt = append(s.rcpt, to)
	return nil
}

func (s *session) Data(r io.Reader) error {
	// The server already enforces MaxMessageBytes; the extra LimitReader is defence in depth.
	raw, err := io.ReadAll(io.LimitReader(r, s.b.cfg.MaxMessageSize+1))
	if err != nil {
		return err
	}
	if int64(len(raw)) > s.b.cfg.MaxMessageSize {
		return gosmtp.ErrDataTooLarge
	}

	project := s.project
	if project == nil { // only reachable when RequireAuth is off
		p, err := s.b.server.projects.SystemProject()
		if err != nil {
			s.b.server.log.Error("system project unavailable", "err", err)
			return &gosmtp.SMTPError{Code: 451, EnhancedCode: gosmtp.EnhancedCode{4, 3, 0}, Message: "Temporary local error"}
		}
		project = &p
	}

	// Per-attachment cap equals the message cap: an attachment can never exceed the message.
	if _, err := s.b.server.emails.Capture(project.ID, s.from, s.rcpt, raw, s.b.cfg.MaxMessageSize); err != nil {
		s.b.server.log.Error("could not store message", "err", err, "project", project.ID)
		return &gosmtp.SMTPError{Code: 451, EnhancedCode: gosmtp.EnhancedCode{4, 3, 0}, Message: "Could not store message"}
	}
	return nil
}

func (s *session) Reset() { s.from, s.rcpt = "", nil }

func (s *session) Logout() error { return nil }
