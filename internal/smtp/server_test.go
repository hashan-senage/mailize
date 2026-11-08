package smtp_test

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/smtp"
	"os"
	"strings"
	"testing"
	"time"

	"mailize/internal/models"
	mzsmtp "mailize/internal/smtp"
	"mailize/internal/testutil"
)

func freePort(t *testing.T) int {
	t.Helper()
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port
}

func start(t *testing.T, env *testutil.Env, mutate func(*mzsmtp.Config)) string {
	t.Helper()
	cfg := mzsmtp.Config{Host: "127.0.0.1", Port: freePort(t), RequireAuth: true, MaxMessageSize: 5 << 20, MaxConnections: 10}
	if mutate != nil {
		mutate(&cfg)
	}
	if err := env.SMTP.Start(cfg); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		env.SMTP.Stop(ctx)
	})
	return fmt.Sprintf("127.0.0.1:%d", cfg.Port)
}

func newProject(t *testing.T, env *testutil.Env, name string) models.ProjectCredentials {
	t.Helper()
	_, cred, err := env.Projects.Create(models.ProjectInput{Name: name})
	if err != nil {
		t.Fatal(err)
	}
	return cred
}

func send(addr string, cred models.ProjectCredentials, from string, to []string, msg string) error {
	host, _, _ := net.SplitHostPort(addr)
	return smtp.SendMail(addr, smtp.PlainAuth("", cred.Username, cred.Password, host), from, to, []byte(msg))
}

const multipartMsg = "From: Alice <alice@example.test>\r\n" +
	"To: bob@example.test\r\n" +
	"Cc: carol@example.test\r\n" +
	"Reply-To: noreply@example.test\r\n" +
	"Subject: =?UTF-8?Q?Hello_W=C3=B6rld?=\r\n" +
	"Message-ID: <abc123@example.test>\r\n" +
	"MIME-Version: 1.0\r\n" +
	"Content-Type: multipart/mixed; boundary=OUTER\r\n\r\n" +
	"--OUTER\r\nContent-Type: multipart/alternative; boundary=INNER\r\n\r\n" +
	"--INNER\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nplain body\r\n" +
	"--INNER\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<p>html <b>body</b></p>\r\n" +
	"--INNER--\r\n" +
	"--OUTER\r\nContent-Type: text/plain; name=\"../../evil.txt\"\r\nContent-Disposition: attachment; filename=\"../../evil.txt\"\r\nContent-Transfer-Encoding: base64\r\n\r\naGVsbG8gYXR0YWNobWVudA==\r\n" +
	"--OUTER\r\nContent-Type: text/plain; name=\"../../evil.txt\"\r\nContent-Disposition: attachment; filename=\"../../evil.txt\"\r\nContent-Transfer-Encoding: base64\r\n\r\nc2Vjb25k\r\n" +
	"--OUTER--\r\n"

func TestEndToEndCapture(t *testing.T) {
	env := testutil.New(t)
	addr := start(t, env, nil)
	cred := newProject(t, env, "Shop")

	// bcc@ is only in the SMTP envelope, so it must be recorded as Bcc.
	if err := send(addr, cred, "alice@example.test", []string{"bob@example.test", "carol@example.test", "bcc@example.test"}, multipartMsg); err != nil {
		t.Fatalf("send: %v", err)
	}

	page, err := env.Emails.List(models.MessageFilter{ProjectID: ""})
	if err != nil || page.Total != 1 {
		t.Fatalf("want 1 message, got %d (err %v)", page.Total, err)
	}
	m, err := env.Emails.Get(page.Items[0].ID)
	if err != nil {
		t.Fatal(err)
	}
	if m.ProjectName != "Shop" {
		t.Errorf("project = %q", m.ProjectName)
	}
	if m.FromAddress != "alice@example.test" || m.Subject != "Hello Wörld" || m.MessageID != "abc123@example.test" {
		t.Errorf("headers wrong: %+v", m)
	}
	if len(m.ToAddresses) != 1 || m.ToAddresses[0] != "bob@example.test" || len(m.CcAddresses) != 1 {
		t.Errorf("to/cc wrong: %v %v", m.ToAddresses, m.CcAddresses)
	}
	if len(m.BccAddresses) != 1 || m.BccAddresses[0] != "bcc@example.test" {
		t.Errorf("bcc wrong: %v", m.BccAddresses)
	}
	if m.ReplyTo != "noreply@example.test" {
		t.Errorf("reply-to = %q", m.ReplyTo)
	}
	if !strings.Contains(m.TextBody, "plain body") || !strings.Contains(m.HTMLBody, "<b>body</b>") {
		t.Errorf("bodies wrong: %q / %q", m.TextBody, m.HTMLBody)
	}
	if !strings.Contains(m.RawSource, "Message-ID: <abc123@example.test>") {
		t.Errorf("raw source missing")
	}
	if len(m.Headers) == 0 {
		t.Errorf("no headers captured")
	}

	// attachments: sanitised names, no overwrite of duplicates, files stay inside storage
	if len(m.Attachments) != 2 {
		t.Fatalf("want 2 attachments, got %d", len(m.Attachments))
	}
	names := map[string]bool{}
	for _, a := range m.Attachments {
		names[a.Filename] = true
		_, path, err := env.Emails.AttachmentFile(a.ID)
		if err != nil {
			t.Fatal(err)
		}
		data, err := os.ReadFile(path)
		if err != nil || len(data) != int(a.Size) {
			t.Errorf("attachment content/size mismatch: %v", err)
		}
		if !strings.HasPrefix(path, env.Store.AttachmentsDir) {
			t.Errorf("attachment escaped storage: %s", path)
		}
	}
	if !names["evil.txt"] || !names["evil (1).txt"] {
		t.Errorf("filenames not sanitised/deduplicated: %v", names)
	}
}

func TestAuthentication(t *testing.T) {
	env := testutil.New(t)
	addr := start(t, env, nil)
	good := newProject(t, env, "A")
	host, _, _ := net.SplitHostPort(addr)

	// wrong password
	bad := good
	bad.Password = "wrong"
	if err := send(addr, bad, "a@x.test", []string{"b@x.test"}, "Subject: x\r\n\r\nbody\r\n"); err == nil {
		t.Error("wrong password accepted")
	}
	// unknown user
	if err := send(addr, models.ProjectCredentials{Username: "nobody", Password: "x"}, "a@x.test", []string{"b@x.test"}, "Subject: x\r\n\r\nb\r\n"); err == nil {
		t.Error("unknown user accepted")
	}
	// no auth at all must be refused while authentication is required
	if err := smtp.SendMail(addr, nil, "a@x.test", []string{"b@x.test"}, []byte("Subject: x\r\n\r\nb\r\n")); err == nil {
		t.Error("unauthenticated mail accepted")
	}
	// LOGIN mechanism works too
	if err := smtp.SendMail(addr, loginAuth{good.Username, good.Password, host}, "a@x.test", []string{"b@x.test"}, []byte("Subject: login\r\n\r\nb\r\n")); err != nil {
		t.Errorf("LOGIN auth failed: %v", err)
	}
	if page, _ := env.Emails.List(models.MessageFilter{}); page.Total != 1 {
		t.Errorf("only the LOGIN message should be stored, got %d", page.Total)
	}

	// disabled projects are rejected; regenerated credentials invalidate the old ones
	projects, _ := env.Projects.List()
	if _, err := env.Projects.Update(models.UpdateProjectInput{ID: projects[0].ID, Name: "A", Status: models.ProjectDisabled}); err != nil {
		t.Fatal(err)
	}
	if err := send(addr, good, "a@x.test", []string{"b@x.test"}, "Subject: x\r\n\r\nb\r\n"); err == nil {
		t.Error("disabled project accepted")
	}
	env.Projects.Update(models.UpdateProjectInput{ID: projects[0].ID, Name: "A", Status: models.ProjectActive})
	newCred, err := env.Projects.Regenerate(projects[0].ID)
	if err != nil {
		t.Fatal(err)
	}
	if err := send(addr, good, "a@x.test", []string{"b@x.test"}, "Subject: x\r\n\r\nb\r\n"); err == nil {
		t.Error("old credentials still work after regeneration")
	}
	if err := send(addr, newCred, "a@x.test", []string{"b@x.test"}, "Subject: x\r\n\r\nb\r\n"); err != nil {
		t.Errorf("new credentials rejected: %v", err)
	}
}

func TestProjectIsolation(t *testing.T) {
	env := testutil.New(t)
	addr := start(t, env, nil)
	a, b := newProject(t, env, "A"), newProject(t, env, "B")
	for i, c := range []models.ProjectCredentials{a, a, b} {
		if err := send(addr, c, "x@x.test", []string{"y@x.test"}, fmt.Sprintf("Subject: m%d\r\n\r\nhi\r\n", i)); err != nil {
			t.Fatal(err)
		}
	}
	for _, tc := range []struct {
		id   string
		want int
	}{{a.ProjectID, 2}, {b.ProjectID, 1}} {
		p, _ := env.Emails.List(models.MessageFilter{ProjectID: tc.id})
		if p.Total != tc.want {
			t.Errorf("project %s: got %d want %d", tc.id, p.Total, tc.want)
		}
		for _, m := range p.Items {
			if m.ProjectID != tc.id {
				t.Errorf("message from another project leaked into %s", tc.id)
			}
		}
	}
	// deleting a project removes only its messages and files
	if err := env.Projects.Delete(a.ProjectID); err != nil {
		t.Fatal(err)
	}
	if p, _ := env.Emails.List(models.MessageFilter{}); p.Total != 1 {
		t.Errorf("after delete want 1 message, got %d", p.Total)
	}
	if entries, _ := os.ReadDir(env.Store.RawDir); len(entries) != 1 {
		t.Errorf("raw files not cleaned up: %d left", len(entries))
	}
}

func TestOversizedMessageRejected(t *testing.T) {
	env := testutil.New(t)
	addr := start(t, env, func(c *mzsmtp.Config) { c.MaxMessageSize = 2048 })
	cred := newProject(t, env, "Big")

	big := "Subject: big\r\n\r\n" + strings.Repeat("A", 10_000) + "\r\n"
	if err := send(addr, cred, "a@x.test", []string{"b@x.test"}, big); err == nil {
		t.Fatal("oversized message accepted")
	}
	if p, _ := env.Emails.List(models.MessageFilter{}); p.Total != 0 {
		t.Errorf("oversized message was stored")
	}
	if err := send(addr, cred, "a@x.test", []string{"b@x.test"}, "Subject: ok\r\n\r\nsmall\r\n"); err != nil {
		t.Errorf("small message rejected after oversized one: %v", err)
	}
}

func TestMalformedMessageIsStoredSafely(t *testing.T) {
	env := testutil.New(t)
	addr := start(t, env, nil)
	cred := newProject(t, env, "Junk")
	junk := "\x00\x01 not a header\r\n\r\n--boundary\r\nContent-Type: multipart/mixed\r\n\r\n\xff\xfe"
	if err := send(addr, cred, "a@x.test", []string{"b@x.test"}, junk); err != nil {
		t.Fatalf("server rejected malformed mail: %v", err)
	}
	p, _ := env.Emails.List(models.MessageFilter{})
	if p.Total != 1 {
		t.Fatalf("malformed message not captured")
	}
	m, _ := env.Emails.Get(p.Items[0].ID)
	if m.FromAddress != "a@x.test" || len(m.ToAddresses) != 1 {
		t.Errorf("envelope fallback not applied: %+v", m)
	}
}

func TestStartStopLifecycle(t *testing.T) {
	env := testutil.New(t)
	port := freePort(t)
	cfg := mzsmtp.Config{Host: "127.0.0.1", Port: port, RequireAuth: true, MaxMessageSize: 1 << 20, MaxConnections: 5}

	if err := env.SMTP.Start(cfg); err != nil {
		t.Fatal(err)
	}
	if st := env.SMTP.Status(); !st.Running || st.Port != port || st.Host != "127.0.0.1" {
		t.Errorf("status wrong: %+v", st)
	}
	if err := env.SMTP.Start(cfg); err == nil {
		t.Error("double start should fail")
	}
	// a second server on the same port must fail with a useful error
	other := testutil.New(t)
	if err := other.SMTP.Start(cfg); err == nil {
		t.Error("port conflict not reported")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	t0 := time.Now()
	if err := env.SMTP.Stop(ctx); err != nil {
		t.Fatal(err)
	}
	t.Logf("stop took %v", time.Since(t0))
	if env.SMTP.Status().Running {
		t.Error("still running after Stop")
	}
	if c, err := net.DialTimeout("tcp", cfg.Host+":"+fmt.Sprint(port), 300*time.Millisecond); err == nil {
		c.Close()
		t.Error("port still accepting connections after Stop")
	}
	// restart on the same port works
	if err := env.SMTP.Start(cfg); err != nil {
		t.Fatalf("restart: %v", err)
	}
	env.SMTP.Stop(ctx)
}

func TestConnectionLimit(t *testing.T) {
	env := testutil.New(t)
	addr := start(t, env, func(c *mzsmtp.Config) { c.MaxConnections = 1 })
	c1, err := net.Dial("tcp", addr)
	if err != nil {
		t.Fatal(err)
	}
	defer c1.Close()
	c1.SetReadDeadline(time.Now().Add(2 * time.Second))
	buf := make([]byte, 64)
	if n, _ := c1.Read(buf); n == 0 {
		t.Fatal("first connection got no greeting")
	}
	c2, err := net.Dial("tcp", addr)
	if err != nil {
		t.Fatal(err)
	}
	defer c2.Close()
	c2.SetReadDeadline(time.Now().Add(2 * time.Second))
	if n, err := c2.Read(buf); n != 0 || err == nil {
		t.Errorf("second connection should be dropped, read %d bytes", n)
	}
}

func TestUnauthenticatedMailGoesToSystemProjectWhenAuthOff(t *testing.T) {
	env := testutil.New(t)
	addr := start(t, env, func(c *mzsmtp.Config) { c.RequireAuth = false })
	if err := smtp.SendMail(addr, nil, "a@x.test", []string{"b@x.test"}, []byte("Subject: anon\r\n\r\nb\r\n")); err != nil {
		t.Fatal(err)
	}
	p, _ := env.Emails.List(models.MessageFilter{})
	if p.Total != 1 || p.Items[0].ProjectName != "Unassigned" {
		t.Errorf("want 1 message in Unassigned, got %+v", p)
	}
}

func TestNeverRelays(t *testing.T) {
	// The package must not import anything capable of outbound SMTP delivery.
	// net/smtp is only imported by tests; verify the production sources do not use it.
	for _, f := range []string{"server.go", "handler.go", "authentication.go"} {
		src, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		if strings.Contains(string(src), `"net/smtp"`) || strings.Contains(string(src), "smtp.Dial") || strings.Contains(string(src), "SendMail") {
			t.Errorf("%s contains outbound SMTP code", f)
		}
	}
}

// loginAuth is a minimal SMTP LOGIN client (net/smtp only ships PLAIN and CRAM-MD5).
type loginAuth struct{ user, pass, host string }

func (a loginAuth) Start(s *smtp.ServerInfo) (string, []byte, error) { return "LOGIN", nil, nil }
func (a loginAuth) Next(from []byte, more bool) ([]byte, error) {
	if !more {
		return nil, nil
	}
	switch strings.ToLower(strings.TrimSpace(string(from))) {
	case "username:":
		return []byte(a.user), nil
	case "password:":
		return []byte(a.pass), nil
	}
	return nil, errors.New("unexpected server challenge: " + string(from))
}
