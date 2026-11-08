package services

import (
	"fmt"
	"strconv"
	"strings"

	"mailize/internal/models"
)

// ConfigValue is one copyable setting.
type ConfigValue struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type SMTPConfiguration struct {
	Framework string        `json:"framework"`
	Filename  string        `json:"filename"`
	Language  string        `json:"language"`
	Snippet   string        `json:"snippet"`
	Values    []ConfigValue `json:"values"`
	Notes     []string      `json:"notes"`
}

type ConfigService struct {
	projects *ProjectService
	settings *SettingsService
}

func NewConfigService(p *ProjectService, s *SettingsService) *ConfigService {
	return &ConfigService{projects: p, settings: s}
}

// clientHost is the address an app should connect to; a wildcard bind is reached via loopback.
func clientHost(h string) string {
	switch h {
	case "", "0.0.0.0", "::":
		return "127.0.0.1"
	}
	return h
}

func (c *ConfigService) Generate(projectID, framework string) (SMTPConfiguration, error) {
	cred, err := c.projects.Credentials(projectID)
	if err != nil {
		return SMTPConfiguration{}, err
	}
	st, err := c.settings.Get()
	if err != nil {
		return SMTPConfiguration{}, err
	}
	return BuildConfiguration(framework, clientHost(st.SMTPHost), st.SMTPPort, cred, st.RequireAuth)
}

// BuildConfiguration is pure so it can be unit-tested without a database.
func BuildConfiguration(framework, host string, port int, cred models.ProjectCredentials, auth bool) (SMTPConfiguration, error) {
	p := strconv.Itoa(port)
	cfg := SMTPConfiguration{
		Framework: framework,
		Values: []ConfigValue{
			{"Host", host}, {"Port", p}, {"Username", cred.Username}, {"Password", cred.Password}, {"Encryption", "none"},
		},
		Notes: []string{
			"Mailize captures messages locally; nothing is delivered to real recipients.",
			"Use no encryption/TLS and plain or login authentication.",
		},
	}
	if !auth {
		cfg.Notes = append(cfg.Notes, "Authentication is currently optional; messages without credentials land in the \"Unassigned\" project.")
	}
	switch framework {
	case "laravel":
		cfg.Filename, cfg.Language = ".env", "dotenv"
		cfg.Snippet = fmt.Sprintf(`MAIL_MAILER=smtp
MAIL_HOST=%s
MAIL_PORT=%s
MAIL_USERNAME=%s
MAIL_PASSWORD=%s
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="test@example.local"
MAIL_FROM_NAME="${APP_NAME}"
`, host, p, cred.Username, cred.Password)
		cfg.Notes = append(cfg.Notes, "Run `php artisan config:clear` after editing .env, then send a test with `php artisan tinker`.")
	case "php":
		cfg.Filename, cfg.Language = "mailer.php", "php"
		cfg.Snippet = fmt.Sprintf(`<?php
use PHPMailer\PHPMailer\PHPMailer;

$mail = new PHPMailer(true);
$mail->isSMTP();
$mail->Host       = '%s';
$mail->Port       = %s;
$mail->SMTPAuth   = true;
$mail->Username   = '%s';
$mail->Password   = '%s';
$mail->SMTPSecure = false;
$mail->SMTPAutoTLS = false;
`, host, p, cred.Username, cred.Password)
		cfg.Notes = append(cfg.Notes, "Example uses PHPMailer. Disable SMTPAutoTLS since Mailize does not offer TLS.")
	case "node":
		cfg.Filename, cfg.Language = "mailer.js", "javascript"
		cfg.Snippet = fmt.Sprintf(`import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  host: "%s",
  port: %s,
  secure: false,
  ignoreTLS: true,
  auth: { user: "%s", pass: "%s" },
});
`, host, p, cred.Username, cred.Password)
	case "generic":
		cfg.Filename, cfg.Language = "smtp.txt", "text"
		cfg.Snippet = strings.Join([]string{
			"SMTP host:      " + host,
			"SMTP port:      " + p,
			"Username:       " + cred.Username,
			"Password:       " + cred.Password,
			"Encryption:     none",
			"Authentication: PLAIN or LOGIN",
		}, "\n") + "\n"
	default:
		return SMTPConfiguration{}, invalid("Unknown framework: " + framework)
	}
	return cfg, nil
}
