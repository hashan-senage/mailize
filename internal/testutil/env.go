// Package testutil builds a complete, isolated backend (temp dir, real SQLite) for tests.
package testutil

import (
	"io"
	"log/slog"
	"testing"

	"mailize/internal/database"
	"mailize/internal/database/repositories"
	"mailize/internal/services"
	mzsmtp "mailize/internal/smtp"
	"mailize/internal/storage"
)

type Env struct {
	Store    *storage.Storage
	Projects *services.ProjectService
	Emails   *services.EmailService
	Settings *services.SettingsService
	SMTP     *mzsmtp.Server
	Events   chan string
}

func New(t *testing.T) *Env {
	t.Helper()
	store, err := storage.New(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	db, err := database.Open(store.DatabasePath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })

	box, err := services.LoadOrCreateSecretBox(store.KeyPath)
	if err != nil {
		t.Fatal(err)
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	events := make(chan string, 64)
	notify := func(e string, _ any) {
		select {
		case events <- e:
		default:
		}
	}
	pr, mr, sr := repositories.NewProjectRepo(db), repositories.NewMessageRepo(db), repositories.NewSettingsRepo(db)
	emails := services.NewEmailService(mr, store, notify, log)
	projects := services.NewProjectService(pr, mr, box, emails, notify)
	return &Env{
		Store: store, Projects: projects, Emails: emails, Events: events,
		Settings: services.NewSettingsService(sr),
		SMTP:     mzsmtp.NewServer(projects, emails, notify, log),
	}
}
