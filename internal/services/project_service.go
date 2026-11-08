package services

import (
	"errors"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"

	"mailize/internal/database/repositories"
	"mailize/internal/models"
)

type ProjectService struct {
	repo   *repositories.ProjectRepo
	msgs   *repositories.MessageRepo
	box    *SecretBox
	emails *EmailService
	notify func(event string, data any)
}

func NewProjectService(repo *repositories.ProjectRepo, msgs *repositories.MessageRepo, box *SecretBox, emails *EmailService, notify func(string, any)) *ProjectService {
	if notify == nil {
		notify = func(string, any) {}
	}
	return &ProjectService{repo: repo, msgs: msgs, box: box, emails: emails, notify: notify}
}

func mapNotFound(err error) error {
	if errors.Is(err, repositories.ErrNotFound) {
		return ErrNotFound
	}
	return err
}

func validateProject(name, desc string) (string, string, error) {
	name, desc = strings.TrimSpace(name), strings.TrimSpace(desc)
	if name == "" {
		return "", "", invalid("Project name is required.")
	}
	if utf8.RuneCountInString(name) > 80 {
		return "", "", invalid("Project name must be 80 characters or fewer.")
	}
	if utf8.RuneCountInString(desc) > 500 {
		return "", "", invalid("Description must be 500 characters or fewer.")
	}
	return name, desc, nil
}

func newCredentials() (user, pass string, err error) {
	u, err := RandomString(10)
	if err != nil {
		return
	}
	p, err := RandomString(24)
	if err != nil {
		return
	}
	return "mz_" + strings.ToLower(u), p, nil
}

// Create makes a project with freshly generated credentials. The plaintext password is returned
// once so the UI can show the configuration.
func (s *ProjectService) Create(in models.ProjectInput) (models.Project, models.ProjectCredentials, error) {
	return s.create(in, false)
}

func (s *ProjectService) create(in models.ProjectInput, system bool) (models.Project, models.ProjectCredentials, error) {
	name, desc, err := validateProject(in.Name, in.Description)
	if err != nil {
		return models.Project{}, models.ProjectCredentials{}, err
	}
	user, pass, err := newCredentials()
	if err != nil {
		return models.Project{}, models.ProjectCredentials{}, err
	}
	enc, err := s.box.Encrypt(pass)
	if err != nil {
		return models.Project{}, models.ProjectCredentials{}, err
	}
	p := models.Project{ID: uuid.NewString(), Name: name, Description: desc, SMTPUsername: user, Status: models.ProjectActive, IsSystem: system}
	if err := s.repo.Insert(p, enc); err != nil {
		return models.Project{}, models.ProjectCredentials{}, err
	}
	p, err = s.repo.Get(p.ID)
	if err != nil {
		return p, models.ProjectCredentials{}, err
	}
	s.notify("project:updated", p.ID)
	return p, models.ProjectCredentials{ProjectID: p.ID, Username: user, Password: pass}, nil
}

func (s *ProjectService) List() ([]models.Project, error) { return s.repo.List() }

func (s *ProjectService) Get(id string) (models.Project, error) {
	p, err := s.repo.Get(id)
	return p, mapNotFound(err)
}

func (s *ProjectService) Update(in models.UpdateProjectInput) (models.Project, error) {
	name, desc, err := validateProject(in.Name, in.Description)
	if err != nil {
		return models.Project{}, err
	}
	if in.Status != models.ProjectActive && in.Status != models.ProjectDisabled {
		return models.Project{}, invalid("Invalid project status.")
	}
	cur, err := s.repo.Get(in.ID)
	if err != nil {
		return cur, mapNotFound(err)
	}
	if cur.IsSystem && in.Status == models.ProjectDisabled {
		return cur, invalid("The system project cannot be disabled.")
	}
	if err := s.repo.Update(in.ID, name, desc, in.Status); err != nil {
		return cur, mapNotFound(err)
	}
	s.notify("project:updated", in.ID)
	return s.Get(in.ID)
}

// Delete removes a project, its messages, and their files on disk.
func (s *ProjectService) Delete(id string) error {
	p, err := s.repo.Get(id)
	if err != nil {
		return mapNotFound(err)
	}
	if p.IsSystem {
		return invalid("The system project cannot be deleted.")
	}
	ids, err := s.msgs.IDsForProject(id)
	if err != nil {
		return err
	}
	paths, err := s.msgs.FilePaths(ids)
	if err != nil {
		return err
	}
	if err := s.repo.Delete(id); err != nil {
		return mapNotFound(err)
	}
	s.emails.removeFiles(paths)
	s.notify("project:updated", id)
	s.notify("message:deleted", "")
	return nil
}

// Credentials returns the project's current SMTP credentials (decrypting the password).
func (s *ProjectService) Credentials(id string) (models.ProjectCredentials, error) {
	p, err := s.repo.Get(id)
	if err != nil {
		return models.ProjectCredentials{}, mapNotFound(err)
	}
	enc, err := s.repo.GetPasswordEnc(id)
	if err != nil {
		return models.ProjectCredentials{}, mapNotFound(err)
	}
	pass, err := s.box.Decrypt(enc)
	if err != nil {
		return models.ProjectCredentials{}, err
	}
	return models.ProjectCredentials{ProjectID: id, Username: p.SMTPUsername, Password: pass}, nil
}

// Regenerate issues a new username and password; the old ones stop working immediately.
func (s *ProjectService) Regenerate(id string) (models.ProjectCredentials, error) {
	if _, err := s.repo.Get(id); err != nil {
		return models.ProjectCredentials{}, mapNotFound(err)
	}
	user, pass, err := newCredentials()
	if err != nil {
		return models.ProjectCredentials{}, err
	}
	enc, err := s.box.Encrypt(pass)
	if err != nil {
		return models.ProjectCredentials{}, err
	}
	if err := s.repo.UpdateCredentials(id, user, enc); err != nil {
		return models.ProjectCredentials{}, mapNotFound(err)
	}
	s.notify("project:updated", id)
	return models.ProjectCredentials{ProjectID: id, Username: user, Password: pass}, nil
}

// Authenticate verifies SMTP credentials. A uniform error is returned for unknown users and bad
// passwords so usernames cannot be probed.
func (s *ProjectService) Authenticate(username, password string) (models.Project, error) {
	p, enc, err := s.repo.GetByUsername(username)
	if err != nil {
		return models.Project{}, ErrAuthFailed
	}
	plain, err := s.box.Decrypt(enc)
	if err != nil || !ConstantTimeEqual(plain, password) {
		return models.Project{}, ErrAuthFailed
	}
	if p.Status != models.ProjectActive {
		return models.Project{}, ErrProjectOff
	}
	return p, nil
}

// SystemProject returns the catch-all project used when SMTP authentication is turned off,
// creating it on first use.
func (s *ProjectService) SystemProject() (models.Project, error) {
	p, err := s.repo.GetSystem()
	if err == nil {
		return p, nil
	}
	if !errors.Is(err, repositories.ErrNotFound) {
		return p, err
	}
	p, _, err = s.create(models.ProjectInput{Name: "Unassigned", Description: "Messages received without authentication."}, true)
	return p, err
}
