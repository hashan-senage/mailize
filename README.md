# Mailize

### Local Email Testing & Debugging Desktop Application

**Build. Send. Capture. Debug.**

Mailize is a developer-focused desktop application that makes testing emails during local development simple and safe.

It provides a local SMTP server that captures outgoing emails from your applications, allowing you to preview HTML emails, inspect headers, view attachments, and debug email functionality without delivering messages to real recipients.

## ✨ Features

- **Local SMTP Server** – Capture outgoing emails from locally running applications.
- **Project Management** – Organize email testing environments by project.
- **SMTP Configuration Generator** – Generate ready-to-use SMTP credentials and configurations.
- **Email Inbox** – View all captured emails in one place.
- **HTML Email Preview** – Preview rendered HTML emails.
- **Email Inspector** – Inspect headers, recipients, sender information, and raw email content.
- **Attachment Viewer** – Inspect and download email attachments.
- **Search & Filtering** – Quickly find captured messages.
- **Local-First** – Keep your development email data on your own machine.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Go | Backend and SMTP server |
| Wails | Desktop application framework |
| React | Frontend UI |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| SQLite | Local database |

## 🚀 How It Works

1. Create a project in Mailize.
2. Generate project-specific SMTP credentials.
3. Copy the generated configuration into your application's `.env` file.
4. Trigger an email from your application.
5. Open Mailize to view and inspect the captured email.

### Example Laravel Configuration

```env
MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
MAIL_USERNAME=your_project_username
MAIL_PASSWORD=your_project_password
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="test@example.local"
MAIL_FROM_NAME="${APP_NAME}"
```

Your application can send emails normally, while Mailize captures them locally instead of delivering them to actual recipients.

## 🏗️ Planned Development

- [ ] Desktop application foundation
- [ ] Local SMTP server
- [ ] Project-based SMTP credentials
- [ ] Email inbox and management
- [ ] HTML and plain-text email preview
- [ ] Email header and source inspector
- [ ] Attachment management
- [ ] Laravel and PHP configuration presets
- [ ] Node.js configuration presets
- [ ] Search and filtering
- [ ] Windows installer
- [ ] macOS and Linux support

## 🔒 Security & Privacy

Mailize is designed for local development and testing.

- SMTP server binds to localhost by default.
- Captured emails are not forwarded to external recipients.
- Email content is treated as untrusted input.
- HTML previews should disable scripts and remote resources by default.
- Development credentials should never be reused in production.

## 🎯 Project Goal

Our goal is to provide developers with a simple, modern, and reliable desktop environment for testing and debugging email functionality across different programming languages and frameworks.

## 📌 Project Status

🚧 Currently in planning and development.

## 📄 License

License to be announced.

---

**Mailize — Build. Send. Capture. Debug.**
