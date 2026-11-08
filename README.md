# Mailize

### Local Email Testing & Debugging Desktop Application

**Build. Send. Capture. Debug.**

Mailize is a local-first desktop app for developers. It runs a local SMTP server that captures the emails your application sends, so you can preview HTML, inspect headers and raw source, and download attachments — without ever delivering anything to real recipients.

## Features

- **Local SMTP capture server** — start/stop from the UI, default `127.0.0.1:1025`, PLAIN and LOGIN auth, size and connection limits.
- **Projects** — each with its own generated SMTP credentials and its own inbox; enable/disable, edit, delete, regenerate credentials.
- **SMTP configuration generator** — Laravel, PHP (PHPMailer), Node.js (Nodemailer) and generic presets with copy buttons.
- **Inbox** — search; filter by project, sender, recipient, date, unread; sort; pagination; bulk delete; mark read/unread; live updates when mail arrives.
- **Inspector** — sandboxed HTML preview (scripts and remote content blocked), plain text, headers, raw source, attachments (native “save as” dialog).
- **Overview** — Start/Stop button, live server details (address, uptime, connections, limits, exposure), totals, unread, attachments, 7-day activity chart, per-project figures, top senders, recent emails.
- **Live notifications** — a toast on any page when mail arrives, plus an unread badge on the Inbox in the sidebar.
- **Dark / light / system themes**, keyboard-friendly, desktop-first Windows UI.

## Quick start

1. Download `Mailize.exe` (or the zip) from the Releases page and run it.
2. **Projects → Create project**. Mailize shows the SMTP configuration for that project.
3. **SMTP Server → Start server** (or enable “Start SMTP server when Mailize launches” in Settings).
4. Paste the configuration into your app, e.g. Laravel `.env`:

```env
MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
MAIL_USERNAME=<project username>
MAIL_PASSWORD=<project password>
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="test@example.local"
MAIL_FROM_NAME="${APP_NAME}"
```

5. Send an email from your app and open the **Inbox**.

Your data lives in `%AppData%\Mailize` (database, raw messages, attachments, logs).

## Security

Captured mail is never forwarded; the SMTP server binds to localhost by default; passwords are encrypted at rest; HTML previews are sandboxed with a CSP that blocks all network access. Details and limitations: [docs/SECURITY.md](docs/SECURITY.md). Design overview: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Development

Requirements: Go 1.26+, Node 20+, the [Wails v2 CLI](https://wails.io/docs/gettingstarted/installation) and WebView2 (preinstalled on Windows 11). No C compiler is needed.

```powershell
wails dev                      # live-reload development
go test ./...                  # backend tests
cd frontend; npm test          # frontend tests
wails build -ldflags "-X mailize/internal/config.Version=1.0.0"   # -> build/bin/mailize.exe
```

Set `MAILIZE_DATA_DIR` to use a throwaway data folder.

### Windows installer (optional)

`wails build -nsis` creates an installer when [NSIS](https://nsis.sourceforge.io/) is installed (the project already contains `build/windows/installer/project.nsi`). macOS/Linux: `wails build` on the target OS — the code has no Windows-only dependencies, but only Windows has been built and tested.

## Tech stack

Go · Wails v2 · React 19 · TypeScript · Vite · Tailwind CSS 4 · Radix UI · Lucide · SQLite (`modernc.org/sqlite`) · `emersion/go-smtp` + `go-message`.

## License

License to be announced.

---

**Mailize — Build. Send. Capture. Debug.**
