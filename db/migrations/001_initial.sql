CREATE TABLE app_users (
  id TEXT PRIMARY KEY,

  auth_issuer TEXT NOT NULL,
  auth_subject TEXT NOT NULL,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  UNIQUE (auth_issuer, auth_subject)
);

CREATE TABLE spotify_connections (
  user_id TEXT PRIMARY KEY
    REFERENCES app_users(id) ON DELETE CASCADE,

  spotify_user_id TEXT NOT NULL UNIQUE,

  refresh_token_enc TEXT NOT NULL,
  access_token_enc TEXT,
  access_token_expires_at INTEGER,

  scopes_json TEXT NOT NULL,
  encryption_key_id TEXT NOT NULL,

  token_version INTEGER NOT NULL DEFAULT 0,

  reauth_required_at INTEGER,
  disconnected_at INTEGER,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);