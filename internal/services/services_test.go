package services_test

import (
	"strings"
	"testing"

	"mailize/internal/models"
	"mailize/internal/services"
	"mailize/internal/testutil"
)

func TestSecretBoxRoundTripAndTamper(t *testing.T) {
	key := make([]byte, 32)
	box, err := services.NewSecretBox(key)
	if err != nil {
		t.Fatal(err)
	}
	enc, _ := box.Encrypt("hunter2")
	if strings.Contains(enc, "hunter2") {
		t.Fatal("ciphertext contains plaintext")
	}
	if got, err := box.Decrypt(enc); err != nil || got != "hunter2" {
		t.Fatalf("roundtrip: %q %v", got, err)
	}
	enc2, _ := box.Encrypt("hunter2")
	if enc == enc2 {
		t.Error("nonce reused: identical ciphertexts")
	}
	if _, err := box.Decrypt(enc[:len(enc)-4] + "AAAA"); err == nil {
		t.Error("tampered ciphertext accepted")
	}
	if _, err := services.NewSecretBox([]byte("short")); err == nil {
		t.Error("short key accepted")
	}
}

func TestProjectServiceValidationAndCredentials(t *testing.T) {
	env := testutil.New(t)

	if _, _, err := env.Projects.Create(models.ProjectInput{Name: "  "}); err == nil {
		t.Error("empty name accepted")
	}
	if _, _, err := env.Projects.Create(models.ProjectInput{Name: strings.Repeat("x", 81)}); err == nil {
		t.Error("over-long name accepted")
	}
	p, cred, err := env.Projects.Create(models.ProjectInput{Name: " My App ", Description: "d"})
	if err != nil {
		t.Fatal(err)
	}
	if p.Name != "My App" || len(cred.Password) < 20 || !strings.HasPrefix(cred.Username, "mz_") {
		t.Errorf("unexpected project/credentials: %+v %+v", p, cred)
	}
	got, err := env.Projects.Credentials(p.ID)
	if err != nil || got.Password != cred.Password {
		t.Errorf("stored credentials do not round-trip: %v", err)
	}
	if _, err := env.Projects.Authenticate(cred.Username, cred.Password); err != nil {
		t.Errorf("valid credentials rejected: %v", err)
	}
	if _, err := env.Projects.Authenticate(cred.Username, "nope"); err != services.ErrAuthFailed {
		t.Errorf("bad password: got %v", err)
	}
	if _, err := env.Projects.Get("does-not-exist"); err != services.ErrNotFound {
		t.Errorf("missing project: got %v", err)
	}

	// each project gets distinct credentials
	_, cred2, _ := env.Projects.Create(models.ProjectInput{Name: "Other"})
	if cred2.Username == cred.Username || cred2.Password == cred.Password {
		t.Error("credentials not unique per project")
	}

	// the system project cannot be disabled or deleted
	sys, err := env.Projects.SystemProject()
	if err != nil {
		t.Fatal(err)
	}
	if err := env.Projects.Delete(sys.ID); err == nil {
		t.Error("system project deleted")
	}
	if _, err := env.Projects.Update(models.UpdateProjectInput{ID: sys.ID, Name: "x", Status: models.ProjectDisabled}); err == nil {
		t.Error("system project disabled")
	}
}

func TestSettingsValidation(t *testing.T) {
	ok := services.Defaults()
	if err := services.Validate(ok); err != nil {
		t.Fatalf("defaults invalid: %v", err)
	}
	cases := map[string]func(*models.Settings){
		"port 0":             func(s *models.Settings) { s.SMTPPort = 0 },
		"port too big":       func(s *models.Settings) { s.SMTPPort = 70000 },
		"size 0":             func(s *models.Settings) { s.MaxMessageMB = 0 },
		"size huge":          func(s *models.Settings) { s.MaxMessageMB = 5000 },
		"connections 0":      func(s *models.Settings) { s.MaxConnections = 0 },
		"empty host":         func(s *models.Settings) { s.SMTPHost = "" },
		"hostname":           func(s *models.Settings) { s.SMTPHost = "example.com" },
		"public w/o confirm": func(s *models.Settings) { s.SMTPHost = "0.0.0.0" },
		"public w/o auth": func(s *models.Settings) {
			s.SMTPHost, s.AllowPublicBind, s.RequireAuth = "0.0.0.0", true, false
		},
	}
	for name, mutate := range cases {
		s := ok
		mutate(&s)
		if err := services.Validate(s); err == nil {
			t.Errorf("%s: accepted", name)
		}
	}
	pub := ok
	pub.SMTPHost, pub.AllowPublicBind = "0.0.0.0", true
	if err := services.Validate(pub); err != nil {
		t.Errorf("confirmed public bind with auth rejected: %v", err)
	}
	for _, h := range []string{"127.0.0.1", "::1", "localhost"} {
		if !services.IsLoopback(h) {
			t.Errorf("%s should be loopback", h)
		}
	}
	if services.IsLoopback("192.168.1.5") {
		t.Error("LAN address treated as loopback")
	}
}

func TestSettingsPersist(t *testing.T) {
	env := testutil.New(t)
	def, _ := env.Settings.Get()
	if def.SMTPHost != "127.0.0.1" || def.SMTPPort != 1025 || !def.RequireAuth {
		t.Fatalf("unsafe defaults: %+v", def)
	}
	in := def
	in.SMTPPort, in.MaxMessageMB, in.AutoStartSMTP = 2525, 10, true
	if _, err := env.Settings.Update(in); err != nil {
		t.Fatal(err)
	}
	got, _ := env.Settings.Get()
	if got != in {
		t.Errorf("settings not persisted: %+v", got)
	}
	bad := in
	bad.SMTPPort = 0
	if _, err := env.Settings.Update(bad); err == nil {
		t.Error("invalid settings saved")
	}
	if again, _ := env.Settings.Get(); again.SMTPPort != 2525 {
		t.Error("invalid update altered stored settings")
	}
}

func TestBuildConfiguration(t *testing.T) {
	cred := models.ProjectCredentials{Username: "mz_user", Password: "s3cret"}
	for _, fw := range []string{"laravel", "php", "node", "generic"} {
		c, err := services.BuildConfiguration(fw, "127.0.0.1", 1025, cred, true)
		if err != nil {
			t.Fatalf("%s: %v", fw, err)
		}
		for _, want := range []string{"mz_user", "s3cret", "127.0.0.1", "1025"} {
			if !strings.Contains(c.Snippet, want) {
				t.Errorf("%s snippet missing %q", fw, want)
			}
		}
		if len(c.Values) < 5 {
			t.Errorf("%s: missing copyable values", fw)
		}
	}
	lar, _ := services.BuildConfiguration("laravel", "127.0.0.1", 1025, cred, true)
	if !strings.Contains(lar.Snippet, "MAIL_ENCRYPTION=null") || !strings.Contains(lar.Snippet, `MAIL_FROM_NAME="${APP_NAME}"`) {
		t.Errorf("laravel preset deviates from spec:\n%s", lar.Snippet)
	}
	if _, err := services.BuildConfiguration("cobol", "h", 1, cred, true); err == nil {
		t.Error("unknown framework accepted")
	}
}

func TestMessageFiltersPaginationAndDelete(t *testing.T) {
	env := testutil.New(t)
	p, _, _ := env.Projects.Create(models.ProjectInput{Name: "P"})
	mk := func(from, to, subj string) {
		raw := "From: " + from + "\r\nTo: " + to + "\r\nSubject: " + subj + "\r\n\r\nbody " + subj + "\r\n"
		if _, err := env.Emails.Capture(p.ID, from, []string{to}, []byte(raw), 1<<20); err != nil {
			t.Fatal(err)
		}
	}
	mk("a@x.test", "one@y.test", "Invoice 100%")
	mk("b@x.test", "two@y.test", "Welcome")
	mk("a@x.test", "two@y.test", "Reset_password")

	count := func(f models.MessageFilter) int {
		pg, err := env.Emails.List(f)
		if err != nil {
			t.Fatal(err)
		}
		return pg.Total
	}
	if n := count(models.MessageFilter{Search: "welcome"}); n != 1 {
		t.Errorf("search: %d", n)
	}
	if n := count(models.MessageFilter{Sender: "a@x"}); n != 2 {
		t.Errorf("sender: %d", n)
	}
	if n := count(models.MessageFilter{Recipient: "two@"}); n != 2 {
		t.Errorf("recipient: %d", n)
	}
	// LIKE wildcards in user input are literal, not patterns
	if n := count(models.MessageFilter{Search: "%"}); n != 1 {
		t.Errorf("%% should match only the literal percent sign, got %d", n)
	}
	if n := count(models.MessageFilter{Search: "_"}); n != 1 {
		t.Errorf("_ should match only the literal underscore, got %d", n)
	}
	if n := count(models.MessageFilter{ProjectID: "other"}); n != 0 {
		t.Errorf("project filter: %d", n)
	}

	pg, _ := env.Emails.List(models.MessageFilter{Limit: 2})
	if len(pg.Items) != 2 || pg.Total != 3 {
		t.Errorf("pagination: %d items of %d", len(pg.Items), pg.Total)
	}
	newest, _ := env.Emails.List(models.MessageFilter{Limit: 1})
	oldest, _ := env.Emails.List(models.MessageFilter{Limit: 1, Oldest: true})
	if newest.Items[0].Subject != "Reset_password" || oldest.Items[0].Subject != "Invoice 100%" {
		t.Errorf("sorting wrong: %q / %q", newest.Items[0].Subject, oldest.Items[0].Subject)
	}
	if huge, _ := env.Emails.List(models.MessageFilter{Limit: 100000}); huge.Limit != 200 {
		t.Errorf("page size not capped: %d", huge.Limit)
	}

	// read state, single delete, clear
	id := newest.Items[0].ID
	env.Emails.SetRead([]string{id}, true)
	if n := count(models.MessageFilter{UnreadOnly: true}); n != 2 {
		t.Errorf("unread: %d", n)
	}
	if err := env.Emails.Delete([]string{id}); err != nil {
		t.Fatal(err)
	}
	if _, err := env.Emails.Get(id); err != services.ErrNotFound {
		t.Errorf("deleted message still readable: %v", err)
	}
	if err := env.Emails.Clear(p.ID); err != nil {
		t.Fatal(err)
	}
	if n := count(models.MessageFilter{}); n != 0 {
		t.Errorf("clear left %d", n)
	}
	total, today, unread, err := env.Emails.Stats()
	if err != nil || total != 0 || today != 0 || unread != 0 {
		t.Errorf("stats after clear: %d %d %d %v", total, today, unread, err)
	}
}

func TestInsightsAndUnreadCount(t *testing.T) {
	env := testutil.New(t)
	a, _, _ := env.Projects.Create(models.ProjectInput{Name: "Alpha"})
	b, _, _ := env.Projects.Create(models.ProjectInput{Name: "Beta"})
	if _, _, err := env.Projects.Create(models.ProjectInput{Name: "Empty"}); err != nil {
		t.Fatal(err)
	}
	send := func(pid, from, subj, extra string) {
		raw := "From: " + from + "\r\nTo: t@y.test\r\nSubject: " + subj + "\r\n" + extra + "\r\nbody\r\n"
		if _, err := env.Emails.Capture(pid, from, []string{"t@y.test"}, []byte(raw), 1<<20); err != nil {
			t.Fatal(err)
		}
	}
	html := "Content-Type: text/html\r\n"
	send(a.ID, "x@x.test", "one", html)
	// different sizes make the average non-integral (regression: AVG() is a float in SQLite)
	send(b.ID, "y@x.test", "padding", "X-Pad: "+strings.Repeat("p", 37)+"\r\n")
	send(a.ID, "X@x.test", "two", "") // sender counting is case-insensitive
	send(b.ID, "z@x.test", "three", "")

	if n, err := env.Emails.UnreadCount(); err != nil || n != 4 {
		t.Fatalf("unread = %d, %v", n, err)
	}
	page, _ := env.Emails.List(models.MessageFilter{Limit: 10})
	env.Emails.SetRead([]string{page.Items[0].ID}, true)
	if n, _ := env.Emails.UnreadCount(); n != 3 {
		t.Errorf("unread after read = %d", n)
	}
	var sum int64
	for _, m := range page.Items {
		sum += m.Size
	}

	in, err := env.Emails.Insights()
	if err != nil {
		t.Fatal(err)
	}
	if len(in.Last7Days) != 7 {
		t.Fatalf("want 7 days, got %d", len(in.Last7Days))
	}
	if last := in.Last7Days[6]; last.Count != 4 {
		t.Errorf("today's bucket = %d, want 4", last.Count)
	}
	if in.Last7Days[0].Count != 0 {
		t.Errorf("zero-fill broken: %+v", in.Last7Days[0])
	}
	if in.WithHTML != 1 || in.MessageBytes != sum || in.LastReceivedAt == "" {
		t.Errorf("aggregates wrong: %+v (sum %d)", in, sum)
	}
	// Regression: SQLite AVG() is a float. The sizes must NOT divide evenly, otherwise this test
	// would not exercise the non-integer path that once broke the overview.
	if sum%4 == 0 {
		t.Fatalf("test setup: sizes sum to %d which divides evenly; adjust the padding", sum)
	}
	if want := (sum*2 + 4) / 8; in.AvgMessageBytes != want { // round(sum/4)
		t.Errorf("avg = %d, want %d", in.AvgMessageBytes, want)
	}
	if len(in.TopSenders) == 0 || in.TopSenders[0].Count != 2 {
		t.Errorf("top senders wrong: %+v", in.TopSenders)
	}
	byName := map[string]models.ProjectStat{}
	for _, p := range in.Projects {
		byName[p.Name] = p
	}
	if byName["Alpha"].Total != 2 || byName["Beta"].Total != 2 {
		t.Errorf("per-project totals wrong: %+v", byName)
	}
	if e, ok := byName["Empty"]; !ok || e.Total != 0 {
		t.Errorf("project without mail must still be listed: %+v", byName)
	}
}
