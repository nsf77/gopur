-- Importer run ledger, lease, and external-id map.
-- Event columns and import_sources already exist in 0002_read_schema.

CREATE TABLE import_runs (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL CHECK (status IN ('running', 'ok', 'error')),
    fetched INTEGER NOT NULL DEFAULT 0,
    created_count INTEGER NOT NULL DEFAULT 0,
    updated_count INTEGER NOT NULL DEFAULT 0,
    unchanged_count INTEGER NOT NULL DEFAULT 0,
    hidden_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    error_detail TEXT,
    duration_ms INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_import_runs_source_finished
    ON import_runs (source, status, finished_at);

CREATE TABLE external_events (
    source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    event_id TEXT NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    content_hash TEXT NOT NULL,
    source_url TEXT,
    hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
    last_seen_at TEXT,
    PRIMARY KEY (source, external_id)
);

CREATE TABLE import_lease (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    holder TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_import_visible
    ON events (source, end_at)
    WHERE imported = 1 AND hidden = 0 AND source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_lcsd_dedupe
    ON events (start_at)
    WHERE source = 'lcsd_cultural' AND imported = 1 AND hidden = 0 AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_events_source_seen
    ON events (source, last_seen_at);
