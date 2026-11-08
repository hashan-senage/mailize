package services

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"

	"mailize/internal/database/repositories"
	"mailize/internal/mailparse"
	"mailize/internal/models"
	"mailize/internal/storage"
)

const (
	defaultPageSize = 50
	maxPageSize     = 200
	maxRawPreview   = 2 << 20 // raw source shown in the UI is capped at 2 MiB
)

type EmailService struct {
	msgs   *repositories.MessageRepo
	store  *storage.Storage
	notify func(event string, data any)
	log    *slog.Logger
}

func NewEmailService(msgs *repositories.MessageRepo, store *storage.Storage, notify func(string, any), log *slog.Logger) *EmailService {
	if notify == nil {
		notify = func(string, any) {}
	}
	if log == nil {
		log = slog.Default()
	}
	return &EmailService{msgs: msgs, store: store, notify: notify, log: log}
}

// Capture parses and persists one received message for projectID. envelopeRcpt holds the SMTP
// RCPT TO addresses; those not present in To/Cc headers are recorded as Bcc.
// Nothing here ever sends the message anywhere.
func (s *EmailService) Capture(projectID, envelopeFrom string, envelopeRcpt []string, raw []byte, maxAttachmentBytes int64) (models.Message, error) {
	parsed, perr := mailparse.Parse(raw)
	if perr != nil {
		s.log.Warn("message could not be fully parsed; storing raw source only", "err", perr)
	}

	id := uuid.NewString()
	from := parsed.From
	if from == "" {
		from = envelopeFrom
	}
	to := parsed.To
	if len(to) == 0 && len(parsed.Cc) == 0 {
		to = envelopeRcpt
	}
	known := map[string]bool{}
	for _, a := range append(append([]string{}, parsed.To...), parsed.Cc...) {
		known[strings.ToLower(a)] = true
	}
	var bcc []string
	for _, r := range envelopeRcpt {
		if !known[strings.ToLower(r)] && !containsFold(to, r) {
			bcc = append(bcc, r)
		}
	}

	rawPath := filepath.Join(s.store.RawDir, id+".eml")
	if err := os.WriteFile(rawPath, raw, 0o600); err != nil {
		return models.Message{}, fmt.Errorf("store raw message: %w", err)
	}

	var atts []models.Attachment
	var written []string
	cleanup := func() {
		os.Remove(rawPath)
		s.removeFiles(written)
	}
	if len(parsed.Attachments) > 0 {
		dir := filepath.Join(s.store.AttachmentsDir, id)
		if err := os.MkdirAll(dir, 0o700); err != nil {
			cleanup()
			return models.Message{}, err
		}
		used := map[string]int{}
		for _, a := range parsed.Attachments {
			if maxAttachmentBytes > 0 && int64(len(a.Data)) > maxAttachmentBytes {
				s.log.Warn("attachment exceeds size limit; skipped", "filename", a.Filename, "size", len(a.Data))
				continue
			}
			name := storage.SanitizeFilename(a.Filename)
			// Duplicate names get a numeric suffix so none overwrite another.
			if n := used[strings.ToLower(name)]; n > 0 {
				ext := filepath.Ext(name)
				name = fmt.Sprintf("%s (%d)%s", strings.TrimSuffix(name, ext), n, ext)
			}
			used[strings.ToLower(storage.SanitizeFilename(a.Filename))]++

			attID := uuid.NewString()
			full, err := storage.Resolve(dir, attID+".bin")
			if err != nil {
				cleanup()
				return models.Message{}, err
			}
			if err := os.WriteFile(full, a.Data, 0o600); err != nil {
				cleanup()
				return models.Message{}, err
			}
			written = append(written, full)
			ct := a.ContentType
			if ct == "" {
				ct = "application/octet-stream"
			}
			atts = append(atts, models.Attachment{ID: attID, Filename: name, ContentType: ct, Size: int64(len(a.Data)), StoragePath: full})
		}
	}

	headers := make([]models.Header, len(parsed.Headers))
	for i, h := range parsed.Headers {
		headers[i] = models.Header{Name: h.Name, Value: h.Value}
	}
	subject := parsed.Subject
	msg := models.Message{
		ID: id, ProjectID: projectID, MessageID: parsed.MessageID, FromAddress: from,
		ToAddresses: to, CcAddresses: parsed.Cc, BccAddresses: bcc, ReplyTo: parsed.ReplyTo,
		Subject: subject, TextBody: parsed.Text, HTMLBody: parsed.HTML, Headers: headers,
		Size: int64(len(raw)), ReceivedAt: time.Now().UTC(),
	}
	if err := s.msgs.Insert(msg, rawPath, atts); err != nil {
		cleanup()
		return models.Message{}, fmt.Errorf("store message: %w", err)
	}
	ev := models.ReceivedEvent{ID: id, ProjectID: projectID, From: from, Subject: subject, Attachments: len(atts)}
	if full, _, gerr := s.msgs.Get(id); gerr == nil {
		ev.ProjectName = full.ProjectName
	}
	s.notify("message:received", ev)
	return msg, nil
}

func containsFold(list []string, v string) bool {
	for _, s := range list {
		if strings.EqualFold(s, v) {
			return true
		}
	}
	return false
}

func (s *EmailService) List(f models.MessageFilter) (models.MessagePage, error) {
	if f.Limit <= 0 {
		f.Limit = defaultPageSize
	}
	if f.Limit > maxPageSize {
		f.Limit = maxPageSize
	}
	if f.Offset < 0 {
		f.Offset = 0
	}
	return s.msgs.List(f)
}

func (s *EmailService) Get(id string) (models.Message, error) {
	m, raw, err := s.msgs.Get(id)
	if err != nil {
		return m, mapNotFound(err)
	}
	if m.Attachments, err = s.msgs.Attachments(id); err != nil {
		return m, err
	}
	if raw != "" {
		if full, rerr := storage.Resolve(s.store.RawDir, filepath.Base(raw)); rerr == nil {
			if f, ferr := os.Open(full); ferr == nil {
				defer f.Close()
				buf := make([]byte, maxRawPreview+1)
				n, _ := f.Read(buf)
				if n > maxRawPreview {
					n, m.RawTruncated = maxRawPreview, true
				}
				m.RawSource = string(buf[:n])
			}
		}
	}
	return m, nil
}

func (s *EmailService) SetRead(ids []string, read bool) error {
	if err := s.msgs.SetRead(ids, read); err != nil {
		return err
	}
	s.notify("message:updated", "")
	return nil
}

func (s *EmailService) Delete(ids []string) error {
	paths, err := s.msgs.FilePaths(ids)
	if err != nil {
		return err
	}
	if err := s.msgs.Delete(ids); err != nil {
		return err
	}
	s.removeFiles(paths)
	s.notify("message:deleted", "")
	return nil
}

// Clear deletes every message, or only those of one project when projectID is set.
func (s *EmailService) Clear(projectID string) error {
	ids, err := s.msgs.IDsForProject(projectID)
	if err != nil {
		return err
	}
	return s.Delete(ids)
}

// removeFiles deletes stored files, ignoring anything outside the data directory.
func (s *EmailService) removeFiles(paths []string) {
	root := s.store.DataDir
	for _, p := range paths {
		rel, err := filepath.Rel(root, p)
		if err != nil || strings.HasPrefix(rel, "..") {
			continue
		}
		if err := os.Remove(p); err != nil && !os.IsNotExist(err) {
			s.log.Warn("could not remove file", "err", err)
		}
		// drop now-empty per-message attachment directory
		_ = os.Remove(filepath.Dir(p))
	}
}

func (s *EmailService) Attachments(messageID string) ([]models.Attachment, error) {
	return s.msgs.Attachments(messageID)
}

// AttachmentFile returns the attachment metadata and verified on-disk path.
func (s *EmailService) AttachmentFile(id string) (models.Attachment, string, error) {
	a, err := s.msgs.Attachment(id)
	if err != nil {
		return a, "", mapNotFound(err)
	}
	rel, err := filepath.Rel(s.store.AttachmentsDir, a.StoragePath)
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) || filepath.IsAbs(rel) {
		return a, "", storage.ErrOutsideRoot
	}
	return a, a.StoragePath, nil
}

func (s *EmailService) UnreadCount() (int, error) { return s.msgs.UnreadCount() }

// Insights returns aggregate figures; the 7-day window is the last 7 local calendar days.
func (s *EmailService) Insights() (models.Insights, error) {
	n := time.Now()
	start := time.Date(n.Year(), n.Month(), n.Day(), 0, 0, 0, 0, n.Location()).AddDate(0, 0, -6)
	return s.msgs.Insights(start.UTC().Format(time.RFC3339Nano))
}

func (s *EmailService) Stats() (total, today, unread int, err error) {
	n := time.Now()
	midnight := time.Date(n.Year(), n.Month(), n.Day(), 0, 0, 0, 0, n.Location()).UTC().Format(time.RFC3339Nano)
	return s.msgs.Counts(midnight)
}
