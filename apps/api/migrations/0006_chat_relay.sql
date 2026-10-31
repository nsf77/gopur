-- WhatsApp-style store-and-forward chat. History lives on devices.
-- Bodies are deleted after every recipient device from send time has acked,
-- or after 30 days.

CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('dm', 'group')),
    title TEXT,
    photo_url TEXT,
    created_by TEXT NOT NULL REFERENCES users(id),
    dm_key TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_conversations_dm_key ON conversations (dm_key) WHERE dm_key IS NOT NULL;
CREATE INDEX idx_conversations_updated ON conversations (updated_at, id);

CREATE TABLE conversation_members (
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    folder TEXT NOT NULL CHECK (folder IN ('inbox', 'requests')),
    request_state TEXT NOT NULL CHECK (request_state IN ('pending', 'accepted', 'declined')),
    muted INTEGER NOT NULL DEFAULT 0 CHECK (muted IN (0, 1)),
    last_read_at TEXT,
    last_read_message_id TEXT,
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    left_at TEXT,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_conversation_members_user_folder
    ON conversation_members (user_id, folder, left_at);

CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES users(id),
    kind TEXT NOT NULL CHECK (kind IN ('text', 'emoji', 'photo', 'event')),
    body TEXT,
    image_url TEXT,
    event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
    reply_to_id TEXT,
    created_at TEXT NOT NULL,
    unsent_at TEXT,
    removed_at TEXT,
    body_deleted_at TEXT
);

CREATE INDEX idx_messages_conversation_created ON messages (conversation_id, created_at, id);

CREATE TABLE message_receipts (
    message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delivered_at TEXT,
    read_at TEXT,
    PRIMARY KEY (message_id, user_id)
);

CREATE TABLE chat_devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_seen_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_chat_devices_user_seen ON chat_devices (user_id, last_seen_at);

CREATE TABLE chat_envelopes (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES chat_devices(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('chat_message', 'chat_receipt')),
    conversation_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_chat_envelopes_device ON chat_envelopes (device_id, user_id, created_at, id);
CREATE INDEX idx_chat_envelopes_message_kind ON chat_envelopes (message_id, kind);
