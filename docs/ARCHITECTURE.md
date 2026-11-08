# Mailize architecture

Mailize is a Wails v2 desktop app: a Go backend and a React + TypeScript frontend in one process.

```
main.go                  Wails bootstrap (window, single-instance lock, shutdown hook)
app.go                   Thin binding layer: wires services, exposes methods, emits events
internal/
  config/                App name, version (set with -ldflags), defaults
  database/              SQLite open + embedded SQL migrations
    repositories/        ALL SQL lives here (projects, messages, settings)
  models/                Types serialised to the frontend
  mailparse/             MIME parsing (headers, bodies, attachments), panic-safe
  services/              Business logic: projects, emails, settings, SMTP config presets, crypto
  smtp/                  SMTP capture server (go-smtp): lifecycle, auth, session handler
  storage/               On-disk layout, filename sanitising, path-traversal guard
  testutil/              Isolated backend (temp dir + real SQLite) for tests
frontend/src/
  services/api.ts        The only module that calls Go (typed wrapper over Wails bindings)
  hooks/useBackend.ts    Load data + re-load on backend events (push, no polling)
  components/ pages/     UI; components never import Wails directly
  lib/emailHtml.ts       Sanitising + CSP for the sandboxed preview
```

## Data flow

1. A developer's app connects to the local SMTP server and authenticates with a project's credentials.
2. `smtp/handler.go` resolves the project **only from those credentials**, reads the message (size-capped) and calls `EmailService.Capture`.
3. `Capture` parses the MIME (`mailparse`), writes the raw `.eml` and attachments to disk, then inserts the message and attachment rows in **one transaction**. If the insert fails, the files are removed.
4. The service emits `message:received`; the React UI, subscribed through `useBackend`, refreshes immediately.

## Storage (per user, `%AppData%\Mailize`)

| Path | Content |
|---|---|
| `mailize.db` | SQLite (WAL, foreign keys on). Tables: `projects`, `messages`, `attachments`, `settings`, `schema_migrations` |
| `raw/<id>.eml` | Original message exactly as received |
| `attachments/<id>/<uuid>.bin` | Attachment bytes (original filename kept only as metadata) |
| `secret.key` | 32-byte AES key (file mode 0600) protecting stored SMTP passwords |
| `logs/mailize.log` | Structured log; never contains passwords |

Override with the `MAILIZE_DATA_DIR` environment variable (portable use, tests).

## Decisions

- **Pure-Go SQLite (`modernc.org/sqlite`)** — no CGO or C toolchain needed to build on Windows.
- **`emersion/go-smtp`** — maintained, enforces size/recipient/timeouts; Mailize adds a connection cap and a LOGIN mechanism.
- **Address lists as JSON + a flattened lowercase column** for filtering — JSON for faithful display, the flat column so recipient/search filters stay simple indexed-style `LIKE` queries; user input is escaped so `%`/`_` are literal.
- **Message list vs. detail** — list queries omit bodies/headers; `GetMessage` loads them and a size-capped (2 MB) raw source.
- **Events over polling** — Wails events: `smtp:started`, `smtp:stopped`, `message:received`, `message:updated`, `message:deleted`, `project:updated`. `message:received` carries `{id, projectId, projectName, from, subject, attachments}`, so `useIncomingMailNotifications` (mounted once in `AppShell`) can raise a toast on **any** page, and the sidebar Inbox badge (`useUnreadCount`) refreshes from the same events.
- **Overview insights** — `EmailService.Insights` aggregates in SQL (7 zero-filled local days, per-project totals/unread/last received, top senders, attachment and size totals); the server card shows live status, uptime, connections and the effective limits, with the Start/Stop button.
- **Start/Stop** — `Stop` closes both the go-smtp server and our own listener, so a Stop racing a just-started server cannot leave the serve loop blocked.

## Tests

- `go test ./...` — services, repositories (via services), MIME parsing/attachments, SMTP auth/capture/isolation/limits/lifecycle (real SMTP client against the real server), storage safety.
- `cd frontend && npm test` — vitest + Testing Library: HTML sanitising, sandboxed preview, inbox list/filters/detail tabs, project creation + error states, theme switching.
