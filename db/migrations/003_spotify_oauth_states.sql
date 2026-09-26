CREATE TABLE spotify_oauth_states (
  state_hash TEXT PRIMARY KEY,

  user_id TEXT NOT NULL
    REFERENCES app_users(id)
    ON DELETE CASCADE,

  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL
);