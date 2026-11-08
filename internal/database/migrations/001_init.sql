CREATE TABLE projects (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    smtp_username TEXT NOT NULL UNIQUE,
    password_enc  TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
    is_system     INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE messages (
    id             TEXT PRIMARY KEY,
    project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    message_id     TEXT NOT NULL DEFAULT '',
    from_address   TEXT NOT NULL DEFAULT '',
    to_addresses   TEXT NOT NULL DEFAULT '[]',  -- JSON array, for display
    cc_addresses   TEXT NOT NULL DEFAULT '[]',
    bcc_addresses  TEXT NOT NULL DEFAULT '[]',
    recipients_flat TEXT NOT NULL DEFAULT '',   -- lowercase, space-separated; used for filtering
    reply_to       TEXT NOT NULL DEFAULT '',
    subject        TEXT NOT NULL DEFAULT '',
    text_body      TEXT NOT NULL DEFAULT '',
    html_body      TEXT NOT NULL DEFAULT '',
    headers        TEXT NOT NULL DEFAULT '[]',  -- JSON array of {name,value}
    raw_source_path TEXT NOT NULL DEFAULT '',
    size           INTEGER NOT NULL DEFAULT 0,
    is_read        INTEGER NOT NULL DEFAULT 0,
    received_at    TEXT NOT NULL,
    created_at     TEXT NOT NULL
);

CREATE INDEX idx_messages_project  ON messages(project_id, received_at DESC);
CREATE INDEX idx_messages_received ON messages(received_at DESC);
CREATE INDEX idx_messages_from     ON messages(from_address);
CREATE INDEX idx_messages_subject  ON messages(subject);
CREATE INDEX idx_messages_msgid    ON messages(message_id);

CREATE TABLE attachments (
    id           TEXT PRIMARY KEY,
    message_id   TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    filename     TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size         INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    created_at   TEXT NOT NULL
);

CREATE INDEX idx_attachments_message ON attachments(message_id);

CREATE TABLE settings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    key        TEXT NOT NULL UNIQUE,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
