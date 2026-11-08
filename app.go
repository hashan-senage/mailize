package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"time"

	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"

	"mailize/internal/config"
	"mailize/internal/database"
	"mailize/internal/database/repositories"
	"mailize/internal/models"
	"mailize/internal/services"
	mzsmtp "mailize/internal/smtp"
	"mailize/internal/storage"
)

// App is the thin Wails binding layer: it wires services together and delegates. No business
// logic or SQL lives here.
type App struct {
	ctx context.Context

	store    *storage.Storage
	logFile  *os.File
	log      *slog.Logger
	projects *services.ProjectService
	emails   *services.EmailService
	settings *services.SettingsService
	configs  *services.ConfigService
	smtp     *mzsmtp.Server
	closeDB  func() error
}

func NewApp() *App { return &App{} }

// emit pushes a real-time event to the frontend.
func (a *App) emit(event string, data any) {
	if a.ctx != nil {
		wruntime.EventsEmit(a.ctx, event, data)
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	if err := a.init(); err != nil {
		wruntime.MessageDialog(ctx, wruntime.MessageDialogOptions{
			Type: wruntime.ErrorDialog, Title: "Mailize could not start", Message: err.Error(),
		})
		wruntime.Quit(ctx)
		return
	}
	if st, err := a.settings.Get(); err == nil && st.AutoStartSMTP {
		if err := a.StartSMTPServer(); err != nil {
			a.log.Warn("auto-start of SMTP server failed", "err", err)
		}
	}
}

func (a *App) init() error {
	dir := os.Getenv("MAILIZE_DATA_DIR")
	if dir == "" {
		d, err := storage.DefaultDataDir()
		if err != nil {
			return err
		}
		dir = d
	}
	store, err := storage.New(dir)
	if err != nil {
		return err
	}
	a.store = store

	logDir := filepath.Join(store.DataDir, "logs")
	_ = os.MkdirAll(logDir, 0o700)
	var w io.Writer = os.Stderr
	if f, err := os.OpenFile(filepath.Join(logDir, "mailize.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600); err == nil {
		a.logFile = f
		w = f
	}
	a.log = slog.New(slog.NewTextHandler(w, nil))

	db, err := database.Open(store.DatabasePath)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	a.closeDB = db.Close

	box, err := services.LoadOrCreateSecretBox(store.KeyPath)
	if err != nil {
		return fmt.Errorf("load secret key: %w", err)
	}

	pr, mr, sr := repositories.NewProjectRepo(db), repositories.NewMessageRepo(db), repositories.NewSettingsRepo(db)
	a.emails = services.NewEmailService(mr, store, a.emit, a.log)
	a.projects = services.NewProjectService(pr, mr, box, a.emails, a.emit)
	a.settings = services.NewSettingsService(sr)
	a.configs = services.NewConfigService(a.projects, a.settings)
	a.smtp = mzsmtp.NewServer(a.projects, a.emails, a.emit, a.log)
	a.log.Info("mailize started", "version", config.Version, "data_dir", store.DataDir)
	return nil
}

// shutdown stops the SMTP server and closes storage gracefully.
func (a *App) shutdown(ctx context.Context) {
	if a.smtp != nil {
		c, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_ = a.smtp.Stop(c)
		cancel()
	}
	if a.closeDB != nil {
		_ = a.closeDB()
	}
	if a.log != nil {
		a.log.Info("mailize stopped")
	}
	if a.logFile != nil {
		_ = a.logFile.Close()
	}
}

// ---- App info -------------------------------------------------------------------------------

type AppInfo struct {
	Name      string `json:"name"`
	Tagline   string `json:"tagline"`
	Version   string `json:"version"`
	GoVersion string `json:"goVersion"`
	OS        string `json:"os"`
	Arch      string `json:"arch"`
}

func (a *App) GetAppInfo() AppInfo {
	return AppInfo{config.AppName, config.AppTagline, config.Version, runtime.Version(), runtime.GOOS, runtime.GOARCH}
}

func (a *App) GetStorageInfo() models.StorageInfo {
	return models.StorageInfo{DataDir: a.store.DataDir, DatabasePath: a.store.DatabasePath,
		AttachmentsDir: a.store.AttachmentsDir, RawDir: a.store.RawDir}
}

// ---- Dashboard ------------------------------------------------------------------------------

func (a *App) GetDashboardStats() (models.DashboardStats, error) {
	var s models.DashboardStats
	var err error
	if s.TotalMessages, s.MessagesToday, s.UnreadMessages, err = a.emails.Stats(); err != nil {
		return s, err
	}
	projects, err := a.projects.List()
	if err != nil {
		return s, err
	}
	for _, p := range projects {
		if !p.IsSystem {
			s.ProjectCount++
		}
	}
	page, err := a.emails.List(models.MessageFilter{Limit: 6})
	if err != nil {
		return s, err
	}
	s.Recent, s.SMTP = page.Items, a.smtp.Status()
	if s.Insights, err = a.emails.Insights(); err != nil {
		return s, err
	}
	cfg, err := a.settings.Get()
	if err != nil {
		return s, err
	}
	s.Server = models.ServerInfo{
		RequireAuth: cfg.RequireAuth, MaxMessageMB: cfg.MaxMessageMB, MaxConnections: cfg.MaxConnections,
		AutoStart: cfg.AutoStartSMTP, LocalOnly: services.IsLoopback(cfg.SMTPHost),
	}
	return s, nil
}

// GetUnreadCount powers the sidebar badge.
func (a *App) GetUnreadCount() (int, error) { return a.emails.UnreadCount() }

// ---- Projects -------------------------------------------------------------------------------

type CreatedProject struct {
	Project     models.Project            `json:"project"`
	Credentials models.ProjectCredentials `json:"credentials"`
}

func (a *App) GetProjects() ([]models.Project, error)       { return a.projects.List() }
func (a *App) GetProject(id string) (models.Project, error) { return a.projects.Get(id) }
func (a *App) CreateProject(in models.ProjectInput) (CreatedProject, error) {
	p, c, err := a.projects.Create(in)
	return CreatedProject{p, c}, err
}
func (a *App) UpdateProject(in models.UpdateProjectInput) (models.Project, error) {
	return a.projects.Update(in)
}
func (a *App) DeleteProject(id string) error { return a.projects.Delete(id) }
func (a *App) GetProjectCredentials(id string) (models.ProjectCredentials, error) {
	return a.projects.Credentials(id)
}
func (a *App) RegenerateProjectCredentials(id string) (models.ProjectCredentials, error) {
	return a.projects.Regenerate(id)
}

// ---- SMTP -----------------------------------------------------------------------------------

func (a *App) GetSMTPStatus() models.SMTPStatus { return a.smtp.Status() }

func (a *App) StartSMTPServer() error {
	st, err := a.settings.Get()
	if err != nil {
		return err
	}
	if err := services.Validate(st); err != nil {
		return err
	}
	return a.smtp.Start(mzsmtp.Config{
		Host: st.SMTPHost, Port: st.SMTPPort, RequireAuth: st.RequireAuth,
		MaxMessageSize: int64(st.MaxMessageMB) << 20, MaxConnections: st.MaxConnections,
	})
}

func (a *App) StopSMTPServer() error {
	c, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return a.smtp.Stop(c)
}

func (a *App) GetSMTPConfiguration(projectID, framework string) (services.SMTPConfiguration, error) {
	return a.configs.Generate(projectID, framework)
}

// ---- Messages -------------------------------------------------------------------------------

func (a *App) GetMessages(f models.MessageFilter) (models.MessagePage, error) {
	return a.emails.List(f)
}
func (a *App) GetMessage(id string) (models.Message, error)  { return a.emails.Get(id) }
func (a *App) DeleteMessage(id string) error                 { return a.emails.Delete([]string{id}) }
func (a *App) DeleteMessages(ids []string) error             { return a.emails.Delete(ids) }
func (a *App) MarkMessageAsRead(id string) error             { return a.emails.SetRead([]string{id}, true) }
func (a *App) SetMessagesRead(ids []string, read bool) error { return a.emails.SetRead(ids, read) }
func (a *App) ClearInbox(projectID string) error             { return a.emails.Clear(projectID) }
func (a *App) GetAttachments(messageID string) ([]models.Attachment, error) {
	return a.emails.Attachments(messageID)
}

// SaveAttachment opens a native save dialog and copies the stored attachment there. It returns
// the chosen path, or "" if the user cancelled. Attachments are never executed.
func (a *App) SaveAttachment(attachmentID string) (string, error) {
	att, src, err := a.emails.AttachmentFile(attachmentID)
	if err != nil {
		return "", err
	}
	dest, err := wruntime.SaveFileDialog(a.ctx, wruntime.SaveDialogOptions{
		Title: "Save attachment", DefaultFilename: att.Filename,
	})
	if err != nil || dest == "" {
		return "", err
	}
	in, err := os.Open(src)
	if err != nil {
		return "", err
	}
	defer in.Close()
	out, err := os.OpenFile(dest, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err != nil {
		return "", err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		return "", err
	}
	return dest, out.Close()
}

// ---- Settings -------------------------------------------------------------------------------

func (a *App) GetSettings() (models.Settings, error) { return a.settings.Get() }

// UpdateSettings validates and saves settings. If the SMTP server is running with different
// network settings it is restarted so the change takes effect.
func (a *App) UpdateSettings(in models.Settings) (models.Settings, error) {
	out, err := a.settings.Update(in)
	if err != nil {
		return out, err
	}
	if a.smtp.Status().Running {
		if err := a.StopSMTPServer(); err != nil {
			return out, err
		}
		if err := a.StartSMTPServer(); err != nil {
			return out, fmt.Errorf("settings saved, but the SMTP server could not restart: %w", err)
		}
	}
	return out, nil
}

// ClearAllData deletes every message and attachment. Projects and settings are kept.
func (a *App) ClearAllData() error {
	if err := a.emails.Clear(""); err != nil {
		return err
	}
	return nil
}

var _ = errors.New
