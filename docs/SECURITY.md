# Mailize security decisions

Mailize is a local development tool. Its core promise: **captured email never leaves the machine.**

## Mail handling

| Rule | How it is enforced |
|---|---|
| Never forwards / relays | The SMTP package has no outbound SMTP code. A test (`TestNeverRelays`) fails if `net/smtp`, `SendMail` or `Dial` appear in the server sources. Messages are only stored. |
| Localhost by default | Default host `127.0.0.1`. Non-loopback hosts are rejected unless the user ticks an explicit warning **and** authentication is on (`Validate`). Hostnames other than `localhost` are refused. |
| Project authorization | A session's project comes only from the credentials used in `AUTH`. There is no way to name a project in the protocol. Verified by `TestProjectIsolation`. |
| Disabled projects / bad logins | Rejected with 535. Unknown user and wrong password return the same error (no username probing). Regenerating credentials invalidates the old ones at once. |
| No anonymous mail by default | `RequireAuth` defaults to on. If switched off, anonymous mail goes to an auto-created “Unassigned” project, never to a real one. |
| Resource limits | Max message size (default 25 MB, max 100), connection cap (excess connections are dropped), 100 recipients/message, 60 s read/write timeouts. Oversized mail is refused with 552 and not stored. |
| Malformed mail | Parser recovers from panics and stores the raw message with envelope data; verified by `TestMalformedMessageIsStoredSafely`. |

## Credentials

SMTP password verification and showing a project's configuration again both need the password back, so a one-way hash is not enough. Passwords are stored **AES-256-GCM encrypted** (random nonce per value) with a random 32-byte key in `secret.key` (mode 0600), separate from the database. Compared in constant time. Passwords are generated with `crypto/rand` (24 chars) and are never logged. Passwords are shown only on explicit request (create/config/regenerate).

Threat model: this protects against casual disclosure of the database file (backups, sharing the DB). It does **not** protect against someone with full access to your user profile — acceptable for local, disposable development credentials. Do not reuse them anywhere else.

## HTML preview (untrusted content)

Email HTML is never inserted into the app DOM. Three layers:
1. DOMPurify removes scripts, event handlers, `javascript:` URLs, iframes, forms, objects, meta, base and link tags.
2. Rendered in `<iframe sandbox="">` — an **empty** sandbox: no scripts, no same-origin, no forms, no popups, no top navigation.
3. A CSP inside the document (`default-src 'none'; img-src data:; …`) blocks every network load, so tracking pixels and remote CSS/fonts never load.

## Files

- Attachment names are sanitised (path components stripped, reserved device names and control characters neutralised, length capped); stored files use random UUID names so the original name never touches the filesystem.
- Duplicate names get a numeric suffix; nothing is overwritten.
- `storage.Resolve` and the attachment lookup verify every path stays inside the storage root.
- Attachments are never executed or opened by the OS; saving uses a native save dialog.
- Data directory is created with mode 0700, files 0600.

## Other

- Single-instance lock prevents two copies fighting over the port and database.
- All SQL uses bound parameters; `LIKE` input is escaped.
- Graceful shutdown stops the SMTP server and closes the database.

## Known limitations

- No TLS/STARTTLS on the SMTP listener (credentials travel in clear over loopback). Intended for local use; keep the default bind address.
- “Open attachment with OS” is intentionally not implemented; save then open yourself.
- The Windows executable is not code-signed, so SmartScreen may warn on first run.
