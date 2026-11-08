package repositories

import (
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"mailize/internal/models"
)

type MessageRepo struct{ db *sql.DB }

func NewMessageRepo(db *sql.DB) *MessageRepo { return &MessageRepo{db: db} }

// Insert stores a message and its attachments in one transaction.
func (r *MessageRepo) Insert(m models.Message, rawPath string, atts []models.Attachment) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	to, _ := json.Marshal(nz(m.ToAddresses))
	cc, _ := json.Marshal(nz(m.CcAddresses))
	bcc, _ := json.Marshal(nz(m.BccAddresses))
	hdr, _ := json.Marshal(m.Headers)
	flat := strings.ToLower(strings.Join(append(append(append([]string{}, m.ToAddresses...), m.CcAddresses...), m.BccAddresses...), " "))

	if _, err := tx.Exec(`INSERT INTO messages(id,project_id,message_id,from_address,to_addresses,cc_addresses,bcc_addresses,
		recipients_flat,reply_to,subject,text_body,html_body,headers,raw_source_path,size,is_read,received_at,created_at)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`,
		m.ID, m.ProjectID, m.MessageID, m.FromAddress, string(to), string(cc), string(bcc), flat, m.ReplyTo, m.Subject,
		m.TextBody, m.HTMLBody, string(hdr), rawPath, m.Size, m.ReceivedAt.UTC().Format(timeFmt), now()); err != nil {
		return err
	}
	for _, a := range atts {
		if _, err := tx.Exec(`INSERT INTO attachments(id,message_id,filename,content_type,size,storage_path,created_at)
			VALUES (?,?,?,?,?,?,?)`, a.ID, m.ID, a.Filename, a.ContentType, a.Size, a.StoragePath, now()); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func nz(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

const listCols = `m.id, m.project_id, p.name, m.message_id, m.from_address, m.to_addresses, m.cc_addresses, m.bcc_addresses,
	m.reply_to, m.subject, m.text_body <> '', m.html_body <> '', m.size, m.is_read, m.received_at,
	(SELECT COUNT(1) FROM attachments a WHERE a.message_id = m.id)`

func scanListRow(s scanner) (models.Message, error) {
	var m models.Message
	var to, cc, bcc, recv string
	var read int
	err := s.Scan(&m.ID, &m.ProjectID, &m.ProjectName, &m.MessageID, &m.FromAddress, &to, &cc, &bcc,
		&m.ReplyTo, &m.Subject, &m.HasText, &m.HasHTML, &m.Size, &read, &recv, &m.AttachmentCnt)
	_ = json.Unmarshal([]byte(to), &m.ToAddresses)
	_ = json.Unmarshal([]byte(cc), &m.CcAddresses)
	_ = json.Unmarshal([]byte(bcc), &m.BccAddresses)
	m.IsRead = read == 1
	m.ReceivedAt = parseTime(recv)
	return m, err
}

func likeEscape(s string) string {
	r := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return "%" + r.Replace(strings.ToLower(s)) + "%"
}

func (r *MessageRepo) List(f models.MessageFilter) (models.MessagePage, error) {
	where := []string{"1=1"}
	args := []any{}
	if f.ProjectID != "" {
		where = append(where, "m.project_id = ?")
		args = append(args, f.ProjectID)
	}
	if f.Search != "" {
		where = append(where, `(LOWER(m.subject) LIKE ? ESCAPE '\' OR LOWER(m.from_address) LIKE ? ESCAPE '\' OR m.recipients_flat LIKE ? ESCAPE '\' OR LOWER(m.text_body) LIKE ? ESCAPE '\')`)
		l := likeEscape(f.Search)
		args = append(args, l, l, l, l)
	}
	if f.Sender != "" {
		where = append(where, `LOWER(m.from_address) LIKE ? ESCAPE '\'`)
		args = append(args, likeEscape(f.Sender))
	}
	if f.Recipient != "" {
		where = append(where, `m.recipients_flat LIKE ? ESCAPE '\'`)
		args = append(args, likeEscape(f.Recipient))
	}
	if f.DateFrom != "" {
		where = append(where, "m.received_at >= ?")
		args = append(args, normTime(f.DateFrom))
	}
	if f.DateTo != "" {
		where = append(where, "m.received_at < ?")
		args = append(args, normTime(f.DateTo))
	}
	if f.UnreadOnly {
		where = append(where, "m.is_read = 0")
	}
	cond := strings.Join(where, " AND ")

	page := models.MessagePage{Items: []models.Message{}, Limit: f.Limit, Offset: f.Offset}
	if err := r.db.QueryRow(`SELECT COUNT(1) FROM messages m WHERE `+cond, args...).Scan(&page.Total); err != nil {
		return page, err
	}
	order := "DESC"
	if f.Oldest {
		order = "ASC"
	}
	q := `SELECT ` + listCols + ` FROM messages m JOIN projects p ON p.id = m.project_id WHERE ` + cond +
		` ORDER BY m.received_at ` + order + ` LIMIT ? OFFSET ?`
	rows, err := r.db.Query(q, append(args, f.Limit, f.Offset)...)
	if err != nil {
		return page, err
	}
	defer rows.Close()
	for rows.Next() {
		m, err := scanListRow(rows)
		if err != nil {
			return page, err
		}
		page.Items = append(page.Items, m)
	}
	return page, rows.Err()
}

// normTime canonicalises an RFC3339 timestamp to UTC so lexical comparison matches storage format.
func normTime(s string) string {
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t.UTC().Format(timeFmt)
	}
	return s
}

// Get returns the full message (bodies, headers) and its raw source path.
func (r *MessageRepo) Get(id string) (models.Message, string, error) {
	row := r.db.QueryRow(`SELECT `+listCols+`, m.text_body, m.html_body, m.headers, m.raw_source_path
		FROM messages m JOIN projects p ON p.id = m.project_id WHERE m.id = ?`, id)
	var m models.Message
	var to, cc, bcc, recv, hdr, raw string
	var read int
	err := row.Scan(&m.ID, &m.ProjectID, &m.ProjectName, &m.MessageID, &m.FromAddress, &to, &cc, &bcc,
		&m.ReplyTo, &m.Subject, &m.HasText, &m.HasHTML, &m.Size, &read, &recv, &m.AttachmentCnt,
		&m.TextBody, &m.HTMLBody, &hdr, &raw)
	if errors.Is(err, sql.ErrNoRows) {
		return m, "", ErrNotFound
	}
	if err != nil {
		return m, "", err
	}
	_ = json.Unmarshal([]byte(to), &m.ToAddresses)
	_ = json.Unmarshal([]byte(cc), &m.CcAddresses)
	_ = json.Unmarshal([]byte(bcc), &m.BccAddresses)
	_ = json.Unmarshal([]byte(hdr), &m.Headers)
	m.IsRead = read == 1
	m.ReceivedAt = parseTime(recv)
	return m, raw, nil
}

func (r *MessageRepo) Attachments(messageID string) ([]models.Attachment, error) {
	rows, err := r.db.Query(`SELECT id,message_id,filename,content_type,size,storage_path,created_at FROM attachments
		WHERE message_id = ? ORDER BY created_at, filename`, messageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.Attachment{}
	for rows.Next() {
		var a models.Attachment
		var created string
		if err := rows.Scan(&a.ID, &a.MessageID, &a.Filename, &a.ContentType, &a.Size, &a.StoragePath, &created); err != nil {
			return nil, err
		}
		a.CreatedAt = parseTime(created)
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *MessageRepo) Attachment(id string) (models.Attachment, error) {
	var a models.Attachment
	var created string
	err := r.db.QueryRow(`SELECT id,message_id,filename,content_type,size,storage_path,created_at FROM attachments WHERE id = ?`, id).
		Scan(&a.ID, &a.MessageID, &a.Filename, &a.ContentType, &a.Size, &a.StoragePath, &created)
	if errors.Is(err, sql.ErrNoRows) {
		return a, ErrNotFound
	}
	a.CreatedAt = parseTime(created)
	return a, err
}

func (r *MessageRepo) SetRead(ids []string, read bool) error {
	v := 0
	if read {
		v = 1
	}
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, id := range ids {
		if _, err := tx.Exec(`UPDATE messages SET is_read = ? WHERE id = ?`, v, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// FilePaths returns raw + attachment file paths for the given message IDs, so callers can
// remove files after the rows are deleted.
func (r *MessageRepo) FilePaths(ids []string) (paths []string, err error) {
	for _, id := range ids {
		var raw string
		if err = r.db.QueryRow(`SELECT raw_source_path FROM messages WHERE id = ?`, id).Scan(&raw); err == nil && raw != "" {
			paths = append(paths, raw)
		}
		atts, aerr := r.Attachments(id)
		if aerr != nil {
			return paths, aerr
		}
		for _, a := range atts {
			paths = append(paths, a.StoragePath)
		}
	}
	return paths, nil
}

func (r *MessageRepo) IDsForProject(projectID string) ([]string, error) {
	q := `SELECT id FROM messages`
	args := []any{}
	if projectID != "" {
		q += ` WHERE project_id = ?`
		args = append(args, projectID)
	}
	rows, err := r.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *MessageRepo) Delete(ids []string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, id := range ids {
		if _, err := tx.Exec(`DELETE FROM messages WHERE id = ?`, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// UnreadCount returns the number of unread messages (cheap; used for the sidebar badge).
func (r *MessageRepo) UnreadCount() (n int, err error) {
	err = r.db.QueryRow(`SELECT COUNT(1) FROM messages WHERE is_read = 0`).Scan(&n)
	return
}

// Insights computes the aggregate figures for the overview. sinceUTC is the start of the first
// of the 7 days (RFC3339, UTC); days are bucketed in local time.
func (r *MessageRepo) Insights(sinceUTC string) (models.Insights, error) {
	var in models.Insights
	var last sql.NullString
	var avg float64 // AVG() is a float in SQLite (e.g. 394.5), so it cannot scan straight into int64
	if err := r.db.QueryRow(`SELECT COALESCE(SUM(size),0), COALESCE(AVG(size),0), MAX(received_at),
		COALESCE(SUM(html_body <> ''),0) FROM messages`).Scan(&in.MessageBytes, &avg, &last, &in.WithHTML); err != nil {
		return in, err
	}
	in.AvgMessageBytes = int64(avg + 0.5)
	if last.Valid {
		in.LastReceivedAt = last.String
	}
	if err := r.db.QueryRow(`SELECT COUNT(1), COALESCE(SUM(size),0) FROM attachments`).Scan(&in.AttachmentCount, &in.AttachmentBytes); err != nil {
		return in, err
	}

	rows, err := r.db.Query(`SELECT strftime('%Y-%m-%d', received_at, 'localtime') d, COUNT(1) FROM messages
		WHERE received_at >= ? GROUP BY d`, sinceUTC)
	if err != nil {
		return in, err
	}
	counts := map[string]int{}
	for rows.Next() {
		var d string
		var c int
		if err := rows.Scan(&d, &c); err != nil {
			rows.Close()
			return in, err
		}
		counts[d] = c
	}
	rows.Close()
	// always return exactly 7 consecutive local days, oldest first, zero-filled
	start, _ := time.Parse(timeFmt, sinceUTC)
	day := time.Date(start.Local().Year(), start.Local().Month(), start.Local().Day(), 0, 0, 0, 0, time.Local)
	for i := 0; i < 7; i++ {
		k := day.AddDate(0, 0, i).Format("2006-01-02")
		in.Last7Days = append(in.Last7Days, models.DayCount{Date: k, Count: counts[k]})
	}

	prow, err := r.db.Query(`SELECT p.id, p.name, p.status, COUNT(m.id), COALESCE(SUM(m.is_read = 0),0), MAX(m.received_at)
		FROM projects p LEFT JOIN messages m ON m.project_id = p.id
		WHERE p.is_system = 0 OR m.id IS NOT NULL
		GROUP BY p.id ORDER BY COUNT(m.id) DESC, p.name LIMIT 10`)
	if err != nil {
		return in, err
	}
	for prow.Next() {
		var ps models.ProjectStat
		var lr sql.NullString
		if err := prow.Scan(&ps.ProjectID, &ps.Name, &ps.Status, &ps.Total, &ps.Unread, &lr); err != nil {
			prow.Close()
			return in, err
		}
		ps.LastReceivedAt = lr.String
		in.Projects = append(in.Projects, ps)
	}
	prow.Close()

	srow, err := r.db.Query(`SELECT from_address, COUNT(1) c FROM messages WHERE from_address <> ''
		GROUP BY LOWER(from_address) ORDER BY c DESC, from_address LIMIT 5`)
	if err != nil {
		return in, err
	}
	defer srow.Close()
	for srow.Next() {
		var s models.SenderStat
		if err := srow.Scan(&s.Address, &s.Count); err != nil {
			return in, err
		}
		in.TopSenders = append(in.TopSenders, s)
	}
	return in, srow.Err()
}

func (r *MessageRepo) Counts(todayStartUTC string) (total, today, unread int, err error) {
	err = r.db.QueryRow(`SELECT COUNT(1), COALESCE(SUM(received_at >= ?),0), COALESCE(SUM(is_read = 0),0) FROM messages`,
		todayStartUTC).Scan(&total, &today, &unread)
	return
}
