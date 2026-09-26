ALTER TABLE spotify_connections
ADD COLUMN refresh_lease_id TEXT;

ALTER TABLE spotify_connections
ADD COLUMN refresh_lease_until INTEGER;