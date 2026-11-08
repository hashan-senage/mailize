package services

import (
	"net"
	"strconv"

	"mailize/internal/config"
	"mailize/internal/database/repositories"
	"mailize/internal/models"
)

type SettingsService struct{ repo *repositories.SettingsRepo }

func NewSettingsService(repo *repositories.SettingsRepo) *SettingsService {
	return &SettingsService{repo: repo}
}

func Defaults() models.Settings {
	return models.Settings{
		SMTPHost:       config.DefaultSMTPHost,
		SMTPPort:       config.DefaultSMTPPort,
		RequireAuth:    true,
		MaxMessageMB:   25,
		MaxConnections: 50,
	}
}

func (s *SettingsService) Get() (models.Settings, error) {
	kv, err := s.repo.All()
	if err != nil {
		return models.Settings{}, err
	}
	out := Defaults()
	if v, ok := kv["smtp.host"]; ok {
		out.SMTPHost = v
	}
	if v, ok := kv["smtp.port"]; ok {
		if n, err := strconv.Atoi(v); err == nil {
			out.SMTPPort = n
		}
	}
	if v, ok := kv["smtp.require_auth"]; ok {
		out.RequireAuth = v == "true"
	}
	if v, ok := kv["smtp.allow_public_bind"]; ok {
		out.AllowPublicBind = v == "true"
	}
	if v, ok := kv["smtp.max_message_mb"]; ok {
		if n, err := strconv.Atoi(v); err == nil {
			out.MaxMessageMB = n
		}
	}
	if v, ok := kv["smtp.max_connections"]; ok {
		if n, err := strconv.Atoi(v); err == nil {
			out.MaxConnections = n
		}
	}
	if v, ok := kv["app.autostart_smtp"]; ok {
		out.AutoStartSMTP = v == "true"
	}
	return out, nil
}

// IsLoopback reports whether host is a loopback name/address.
func IsLoopback(host string) bool {
	if host == "localhost" {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

// Validate checks every field. Binding to a non-loopback address additionally requires the
// explicit AllowPublicBind acknowledgement and mandatory authentication.
func Validate(in models.Settings) error {
	if in.SMTPHost == "" {
		return invalid("SMTP host is required.")
	}
	if !IsLoopback(in.SMTPHost) {
		if net.ParseIP(in.SMTPHost) == nil {
			return invalid("SMTP host must be an IP address or localhost.")
		}
		if !in.AllowPublicBind {
			return invalid("Binding to a non-loopback address exposes the SMTP server to your network. Confirm the warning to allow it.")
		}
		if !in.RequireAuth {
			return invalid("Authentication is mandatory when the SMTP server is not bound to localhost.")
		}
	}
	if in.SMTPPort < 1 || in.SMTPPort > 65535 {
		return invalid("SMTP port must be between 1 and 65535.")
	}
	if in.MaxMessageMB < 1 || in.MaxMessageMB > 100 {
		return invalid("Maximum message size must be between 1 and 100 MB.")
	}
	if in.MaxConnections < 1 || in.MaxConnections > 1000 {
		return invalid("Maximum connections must be between 1 and 1000.")
	}
	return nil
}

func (s *SettingsService) Update(in models.Settings) (models.Settings, error) {
	if err := Validate(in); err != nil {
		return models.Settings{}, err
	}
	b := strconv.FormatBool
	err := s.repo.SetMany(map[string]string{
		"smtp.host":              in.SMTPHost,
		"smtp.port":              strconv.Itoa(in.SMTPPort),
		"smtp.require_auth":      b(in.RequireAuth),
		"smtp.allow_public_bind": b(in.AllowPublicBind),
		"smtp.max_message_mb":    strconv.Itoa(in.MaxMessageMB),
		"smtp.max_connections":   strconv.Itoa(in.MaxConnections),
		"app.autostart_smtp":     b(in.AutoStartSMTP),
	})
	if err != nil {
		return models.Settings{}, err
	}
	return in, nil
}
