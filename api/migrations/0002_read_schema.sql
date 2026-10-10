-- Read-surface schema (events, users public fields, organizers, likes/saves).
-- Adapted from gopur-api SQLite goose migrations for D1: no custom FTS UDFs,
-- no chat/auth/importer tables, no nested BEGIN/COMMIT.

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    username TEXT,
    phone TEXT,
    language TEXT NOT NULL DEFAULT 'zh-Hant',
    avatar_url TEXT,
    bio TEXT,
    birthdate TEXT,
    is_private INTEGER NOT NULL DEFAULT 0 CHECK (is_private IN (0, 1)),
    is_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0, 1)),
    imported INTEGER NOT NULL DEFAULT 0 CHECK (imported IN (0, 1)),
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    credit_score INTEGER NOT NULL DEFAULT 0,
    suspended_until TEXT,
    banned_at TEXT,
    moderation_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_users_username ON users (username) WHERE username IS NOT NULL;

CREATE TABLE events (
    id TEXT PRIMARY KEY,
    title_i18n TEXT NOT NULL,
    description_i18n TEXT NOT NULL DEFAULT '{}',
    location_i18n TEXT NOT NULL DEFAULT '{}',
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('volunteer', 'community', 'class', 'official')),
    price_cents INTEGER,
    price_max_cents INTEGER,
    price_tiers TEXT NOT NULL DEFAULT '[]',
    price_note_i18n TEXT NOT NULL DEFAULT '{}',
    external_url TEXT,
    host_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    source TEXT,
    external_id TEXT,
    content_hash TEXT,
    source_url TEXT,
    source_url_generic INTEGER NOT NULL DEFAULT 0 CHECK (source_url_generic IN (0, 1)),
    source_url_override TEXT,
    hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
    last_seen_at TEXT,
    imported INTEGER NOT NULL DEFAULT 0 CHECK (imported IN (0, 1)),
    attribution TEXT,
    attribution_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'past')),
    latitude REAL,
    longitude REAL,
    district TEXT,
    age_min INTEGER,
    age_max INTEGER,
    age_mode TEXT NOT NULL DEFAULT 'suggested' CHECK (age_mode IN ('strict', 'suggested')),
    capacity INTEGER,
    recurrence TEXT,
    cover_image_url TEXT,
    join_mode TEXT NOT NULL DEFAULT 'approval' CHECK (join_mode IN ('instant', 'approval')),
    cancelled INTEGER NOT NULL DEFAULT 0 CHECK (cancelled IN (0, 1)),
    date_tbc INTEGER NOT NULL DEFAULT 0 CHECK (date_tbc IN (0, 1)),
    organizer_i18n TEXT,
    organizer_key TEXT,
    session_count INTEGER NOT NULL DEFAULT 1,
    next_session_start_at TEXT,
    next_session_end_at TEXT,
    detail_url TEXT,
    detail_url_source_domain TEXT,
    detail_checked_at TEXT,
    like_count INTEGER NOT NULL DEFAULT 0,
    save_count INTEGER NOT NULL DEFAULT 0,
    share_count INTEGER NOT NULL DEFAULT 0,
    removed_at TEXT,
    removed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_events_type ON events (type);
CREATE INDEX idx_events_start_at ON events (start_at);
CREATE INDEX idx_events_host_user_id ON events (host_user_id);
CREATE INDEX idx_events_host_start_id ON events (host_user_id, start_at, id);
CREATE UNIQUE INDEX idx_events_source_external_id
    ON events (source, external_id)
    WHERE source IS NOT NULL AND external_id IS NOT NULL;
CREATE INDEX idx_events_feed_window
    ON events (end_at, start_at)
    WHERE hidden = 0 AND cancelled = 0 AND status = 'active';
CREATE INDEX events_imported_organizer ON events (organizer_key) WHERE imported = 1;

CREATE TABLE event_signups (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'waitlisted', 'declined', 'attended', 'no_show', 'cancelled'
    )),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, event_id)
);

CREATE INDEX idx_event_signups_event_status ON event_signups (event_id, status, created_at);

CREATE TABLE event_saves (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, event_id)
);

CREATE TABLE event_likes (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, event_id)
);

CREATE TABLE event_shares (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE event_views (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_event_saves_event ON event_saves (event_id);
CREATE INDEX idx_event_likes_event ON event_likes (event_id);
CREATE INDEX idx_event_shares_event ON event_shares (event_id);
CREATE INDEX idx_event_views_user ON event_views (user_id, created_at);

CREATE TABLE event_sessions (
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    PRIMARY KEY (event_id, start_at)
);

CREATE INDEX idx_event_sessions_window ON event_sessions (start_at, end_at, event_id);

CREATE TABLE follows (
    follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (follower_id, followee_id)
);

CREATE INDEX idx_follows_followee_status ON follows (followee_id, status);
CREATE INDEX idx_follows_follower_status ON follows (follower_id, status);

CREATE TABLE blocks (
    blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (blocker_id, blocked_id)
);

CREATE INDEX idx_blocks_blocked ON blocks (blocked_id, blocker_id);

CREATE TABLE user_locations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address TEXT,
    district TEXT,
    is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_user_locations_user ON user_locations (user_id, is_active, created_at);

CREATE TABLE import_sources (
    source TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    attribution TEXT NOT NULL,
    dataset_url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE event_search USING fts5(
    event_id UNINDEXED,
    title,
    body,
    tokenize = "unicode61 remove_diacritics 2"
);

CREATE TABLE event_search_ids (
    event_id TEXT PRIMARY KEY,
    fts_rowid INTEGER NOT NULL UNIQUE
);

CREATE TRIGGER event_search_insert AFTER INSERT ON events BEGIN
    INSERT INTO event_search(rowid, event_id, title, body)
    VALUES (
        NEW.rowid + 1000000000,
        NEW.id,
        trim(COALESCE(json_extract(NEW.title_i18n, '$.en'), '') || ' ' || COALESCE(json_extract(NEW.title_i18n, '$."zh-Hant"'), '')),
        trim(
            COALESCE(json_extract(NEW.description_i18n, '$.en'), '') || ' ' ||
            COALESCE(json_extract(NEW.description_i18n, '$."zh-Hant"'), '') || ' ' ||
            COALESCE(json_extract(NEW.location_i18n, '$.en'), '') || ' ' ||
            COALESCE(json_extract(NEW.location_i18n, '$."zh-Hant"'), '') || ' ' ||
            COALESCE(NEW.district, '')
        )
    );
    INSERT INTO event_search_ids(event_id, fts_rowid)
    VALUES (NEW.id, NEW.rowid + 1000000000);
END;

CREATE TRIGGER event_search_update
AFTER UPDATE OF title_i18n, description_i18n, location_i18n, district ON events
WHEN OLD.title_i18n IS NOT NEW.title_i18n
  OR OLD.description_i18n IS NOT NEW.description_i18n
  OR OLD.location_i18n IS NOT NEW.location_i18n
  OR OLD.district IS NOT NEW.district
BEGIN
    DELETE FROM event_search WHERE rowid = (
        SELECT fts_rowid FROM event_search_ids WHERE event_id = OLD.id
    );
    INSERT INTO event_search(rowid, event_id, title, body)
    VALUES (
        NEW.rowid + 1000000000,
        NEW.id,
        trim(COALESCE(json_extract(NEW.title_i18n, '$.en'), '') || ' ' || COALESCE(json_extract(NEW.title_i18n, '$."zh-Hant"'), '')),
        trim(
            COALESCE(json_extract(NEW.description_i18n, '$.en'), '') || ' ' ||
            COALESCE(json_extract(NEW.description_i18n, '$."zh-Hant"'), '') || ' ' ||
            COALESCE(json_extract(NEW.location_i18n, '$.en'), '') || ' ' ||
            COALESCE(json_extract(NEW.location_i18n, '$."zh-Hant"'), '') || ' ' ||
            COALESCE(NEW.district, '')
        )
    );
    INSERT INTO event_search_ids(event_id, fts_rowid)
    VALUES (NEW.id, NEW.rowid + 1000000000)
    ON CONFLICT(event_id) DO UPDATE SET fts_rowid = excluded.fts_rowid;
END;

CREATE TRIGGER event_search_delete AFTER DELETE ON events BEGIN
    DELETE FROM event_search WHERE rowid = (
        SELECT fts_rowid FROM event_search_ids WHERE event_id = OLD.id
    );
    DELETE FROM event_search_ids WHERE event_id = OLD.id;
END;

CREATE TRIGGER event_likes_count_ai AFTER INSERT ON event_likes BEGIN
    UPDATE events SET like_count = like_count + 1 WHERE id = NEW.event_id;
END;
CREATE TRIGGER event_likes_count_ad AFTER DELETE ON event_likes BEGIN
    UPDATE events SET like_count = MAX(like_count - 1, 0) WHERE id = OLD.event_id;
END;
CREATE TRIGGER event_saves_count_ai AFTER INSERT ON event_saves BEGIN
    UPDATE events SET save_count = save_count + 1 WHERE id = NEW.event_id;
END;
CREATE TRIGGER event_saves_count_ad AFTER DELETE ON event_saves BEGIN
    UPDATE events SET save_count = MAX(save_count - 1, 0) WHERE id = OLD.event_id;
END;
CREATE TRIGGER event_shares_count_ai AFTER INSERT ON event_shares BEGIN
    UPDATE events SET share_count = share_count + 1 WHERE id = NEW.event_id;
END;
CREATE TRIGGER event_shares_count_ad AFTER DELETE ON event_shares BEGIN
    UPDATE events SET share_count = MAX(share_count - 1, 0) WHERE id = OLD.event_id;
END;
