-- Auth identities. OTP codes live in KV (GOPUR_AUTH).

CREATE TABLE identities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('email', 'apple', 'google')),
    provider_subject TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (provider, provider_subject)
);

CREATE INDEX idx_identities_user_id ON identities (user_id);
