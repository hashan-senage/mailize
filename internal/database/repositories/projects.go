// Package repositories contains all SQL. Services never build queries themselves.
package repositories

import (
	"database/sql"
	"errors"
	"time"

	"mailize/internal/models"
)

var ErrNotFound = errors.New("not found")

const timeFmt = time.RFC3339Nano

func now() string { return time.Now().UTC().Format(timeFmt) }

func parseTime(s string) time.Time {
	t, _ := time.Parse(timeFmt, s)
	return t
}

type ProjectRepo struct{ db *sql.DB }

func NewProjectRepo(db *sql.DB) *ProjectRepo { return &ProjectRepo{db: db} }

const projectCols = `p.id, p.name, p.description, p.smtp_username, p.status, p.is_system, p.created_at, p.updated_at,
	(SELECT COUNT(1) FROM messages m WHERE m.project_id = p.id)`

type scanner interface{ Scan(...any) error }

func scanProject(s scanner) (models.Project, error) {
	var p models.Project
	var status, created, updated string
	var sys int
	err := s.Scan(&p.ID, &p.Name, &p.Description, &p.SMTPUsername, &status, &sys, &created, &updated, &p.MessageCount)
	p.Status = models.ProjectStatus(status)
	p.IsSystem = sys == 1
	p.CreatedAt, p.UpdatedAt = parseTime(created), parseTime(updated)
	return p, err
}

func (r *ProjectRepo) Insert(p models.Project, passwordEnc string) error {
	t := now()
	sys := 0
	if p.IsSystem {
		sys = 1
	}
	_, err := r.db.Exec(`INSERT INTO projects(id,name,description,smtp_username,password_enc,status,is_system,created_at,updated_at)
		VALUES (?,?,?,?,?,?,?,?,?)`, p.ID, p.Name, p.Description, p.SMTPUsername, passwordEnc, string(p.Status), sys, t, t)
	return err
}

func (r *ProjectRepo) List() ([]models.Project, error) {
	rows, err := r.db.Query(`SELECT ` + projectCols + ` FROM projects p ORDER BY p.is_system, p.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.Project{}
	for rows.Next() {
		p, err := scanProject(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *ProjectRepo) Get(id string) (models.Project, error) {
	p, err := scanProject(r.db.QueryRow(`SELECT `+projectCols+` FROM projects p WHERE p.id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}

// GetByUsername returns the project and its encrypted password, for SMTP authentication.
func (r *ProjectRepo) GetByUsername(username string) (models.Project, string, error) {
	var enc string
	row := r.db.QueryRow(`SELECT `+projectCols+`, p.password_enc FROM projects p WHERE p.smtp_username = ?`, username)
	var p models.Project
	var status, created, updated string
	var sys int
	err := row.Scan(&p.ID, &p.Name, &p.Description, &p.SMTPUsername, &status, &sys, &created, &updated, &p.MessageCount, &enc)
	if errors.Is(err, sql.ErrNoRows) {
		return p, "", ErrNotFound
	}
	p.Status = models.ProjectStatus(status)
	p.IsSystem = sys == 1
	return p, enc, err
}

func (r *ProjectRepo) GetPasswordEnc(id string) (string, error) {
	var enc string
	err := r.db.QueryRow(`SELECT password_enc FROM projects WHERE id = ?`, id).Scan(&enc)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	return enc, err
}

func (r *ProjectRepo) GetSystem() (models.Project, error) {
	p, err := scanProject(r.db.QueryRow(`SELECT ` + projectCols + ` FROM projects p WHERE p.is_system = 1 LIMIT 1`))
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}

func (r *ProjectRepo) Update(id, name, description string, status models.ProjectStatus) error {
	res, err := r.db.Exec(`UPDATE projects SET name=?, description=?, status=?, updated_at=? WHERE id=?`,
		name, description, string(status), now(), id)
	return affected(res, err)
}

func (r *ProjectRepo) UpdateCredentials(id, username, passwordEnc string) error {
	res, err := r.db.Exec(`UPDATE projects SET smtp_username=?, password_enc=?, updated_at=? WHERE id=?`,
		username, passwordEnc, now(), id)
	return affected(res, err)
}

// Delete removes the project; messages and attachments rows cascade.
func (r *ProjectRepo) Delete(id string) error {
	res, err := r.db.Exec(`DELETE FROM projects WHERE id = ?`, id)
	return affected(res, err)
}

func (r *ProjectRepo) Count() (n int, err error) {
	err = r.db.QueryRow(`SELECT COUNT(1) FROM projects WHERE is_system = 0`).Scan(&n)
	return
}

func affected(res sql.Result, err error) error {
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}
