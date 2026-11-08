// Package storage manages the on-disk layout for raw messages and attachments and guards
// against path traversal.
package storage

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"unicode"
)

type Storage struct {
	DataDir        string
	DatabasePath   string
	AttachmentsDir string
	RawDir         string
	KeyPath        string
}

// New ensures the directory layout exists under dataDir.
func New(dataDir string) (*Storage, error) {
	abs, err := filepath.Abs(dataDir)
	if err != nil {
		return nil, err
	}
	s := &Storage{
		DataDir:        abs,
		DatabasePath:   filepath.Join(abs, "mailize.db"),
		AttachmentsDir: filepath.Join(abs, "attachments"),
		RawDir:         filepath.Join(abs, "raw"),
		KeyPath:        filepath.Join(abs, "secret.key"),
	}
	for _, d := range []string{s.DataDir, s.AttachmentsDir, s.RawDir} {
		if err := os.MkdirAll(d, 0o700); err != nil {
			return nil, fmt.Errorf("create %s: %w", d, err)
		}
	}
	return s, nil
}

// DefaultDataDir returns the per-user application data directory.
func DefaultDataDir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "Mailize"), nil
}

// ErrOutsideRoot is returned when a path resolves outside its permitted root.
var ErrOutsideRoot = errors.New("path is outside the storage root")

// Resolve joins rel to root and guarantees the result stays inside root.
func Resolve(root, rel string) (string, error) {
	full := filepath.Join(root, rel)
	r, err := filepath.Rel(root, full)
	if err != nil || r == ".." || strings.HasPrefix(r, ".."+string(filepath.Separator)) || filepath.IsAbs(r) {
		return "", ErrOutsideRoot
	}
	return full, nil
}

// SanitizeFilename reduces an untrusted attachment name to a safe base name.
func SanitizeFilename(name string) string {
	name = strings.ReplaceAll(name, "\\", "/")
	if i := strings.LastIndex(name, "/"); i >= 0 {
		name = name[i+1:]
	}
	var b strings.Builder
	for _, r := range name {
		switch {
		case r < 0x20 || r == 0x7f, strings.ContainsRune(`<>:"|?*`, r):
			b.WriteRune('_')
		case unicode.IsControl(r):
			b.WriteRune('_')
		default:
			b.WriteRune(r)
		}
	}
	out := strings.Trim(b.String(), " .")
	if out == "" {
		out = "attachment"
	}
	if len(out) > 150 {
		ext := filepath.Ext(out)
		if len(ext) > 20 {
			ext = ""
		}
		out = out[:150-len(ext)] + ext
	}
	switch strings.ToUpper(strings.TrimSuffix(out, filepath.Ext(out))) {
	case "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "LPT1", "LPT2", "LPT3":
		out = "_" + out
	}
	return out
}
