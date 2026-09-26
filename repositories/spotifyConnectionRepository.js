const mapConnection = (row) => {
  if (!row) return null

  return {
    userId: row.user_id,
    spotifyUserId: row.spotify_user_id,

    refreshTokenEnc: row.refresh_token_enc,
    accessTokenEnc: row.access_token_enc,
    accessTokenExpiresAt: row.access_token_expires_at,

    scopes: JSON.parse(row.scopes_json),
    encryptionKeyId: row.encryption_key_id,
    tokenVersion: row.token_version,

    reauthRequiredAt: row.reauth_required_at,
    disconnectedAt: row.disconnected_at,

    createdAt: row.created_at,
    updatedAt: row.updated_at,

    refreshLeaseId: row.refresh_lease_id,
    refreshLeaseUntil: row.refresh_lease_until,
  }
}

export const createSpotifyConnectionRepository = (database) => {
  const insertConnection = database.prepare(`
    INSERT INTO spotify_connections (
      user_id,
      spotify_user_id,
      refresh_token_enc,
      access_token_enc,
      access_token_expires_at,
      scopes_json,
      encryption_key_id,
      token_version,
      reauth_required_at,
      disconnected_at,
      created_at,
      updated_at
    )
    VALUES (
      @userId,
      @spotifyUserId,
      @refreshTokenEnc,
      @accessTokenEnc,
      @accessTokenExpiresAt,
      @scopesJson,
      @encryptionKeyId,
      @tokenVersion,
      @reauthRequiredAt,
      @disconnectedAt,
      @createdAt,
      @updatedAt
    )
  `)
  const updateTokens = database.prepare(`
  UPDATE spotify_connections
  SET
    refresh_token_enc = @refreshTokenEnc,
    access_token_enc = @accessTokenEnc,
    access_token_expires_at = @accessTokenExpiresAt,
    scopes_json = @scopesJson,
    encryption_key_id = @encryptionKeyId,
    token_version = token_version + 1,
    reauth_required_at = NULL,
    updated_at = @updatedAt
  WHERE user_id = @userId
    AND token_version = @expectedTokenVersion
`)

const saveLinkedConnectionStatement = database.prepare(`
  INSERT INTO spotify_connections (
    user_id,
    spotify_user_id,
    refresh_token_enc,
    access_token_enc,
    access_token_expires_at,
    scopes_json,
    encryption_key_id,
    token_version,
    reauth_required_at,
    disconnected_at,
    refresh_lease_id,
    refresh_lease_until,
    created_at,
    updated_at
  )
  VALUES (
    @userId,
    @spotifyUserId,
    @refreshTokenEnc,
    @accessTokenEnc,
    @accessTokenExpiresAt,
    @scopesJson,
    @encryptionKeyId,
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    @createdAt,
    @updatedAt
  )

  ON CONFLICT(user_id) DO UPDATE SET
    spotify_user_id = excluded.spotify_user_id,
    refresh_token_enc = excluded.refresh_token_enc,
    access_token_enc = excluded.access_token_enc,
    access_token_expires_at = excluded.access_token_expires_at,
    scopes_json = excluded.scopes_json,
    encryption_key_id = excluded.encryption_key_id,
    token_version = spotify_connections.token_version + 1,
    reauth_required_at = NULL,
    disconnected_at = NULL,
    refresh_lease_id = NULL,
    refresh_lease_until = NULL,
    updated_at = excluded.updated_at
`)

  const findByUserId = database.prepare(`
    SELECT *
    FROM spotify_connections
    WHERE user_id = ?
  `)

  const findBySpotifyUserId = database.prepare(`
    SELECT *
    FROM spotify_connections
    WHERE spotify_user_id = ?
  `)

  const markReauthRequired = database.prepare(`
  UPDATE spotify_connections
  SET
    reauth_required_at = @reauthRequiredAt,
    updated_at = @updatedAt
  WHERE user_id = @userId
`)

  const acquireRefreshLease = database.prepare(`
  UPDATE spotify_connections
  SET
    refresh_lease_id = @leaseId,
    refresh_lease_until = @leaseUntil,
    updated_at = @updatedAt
  WHERE user_id = @userId
    AND (
      refresh_lease_until IS NULL
      OR refresh_lease_until <= @now
    )
`)

const releaseRefreshLease = database.prepare(`
  UPDATE spotify_connections
  SET
    refresh_lease_id = NULL,
    refresh_lease_until = NULL,
    updated_at = @updatedAt
  WHERE user_id = @userId
    AND refresh_lease_id = @leaseId
`)

  return {
    create({
      userId,
      spotifyUserId,
      refreshTokenEnc,
      accessTokenEnc = null,
      accessTokenExpiresAt = null,
      scopes = [],
      encryptionKeyId,
    }) {
      const now = Date.now()

      const connection = {
        userId,
        spotifyUserId,
        refreshTokenEnc,
        accessTokenEnc,
        accessTokenExpiresAt,
        scopesJson: JSON.stringify(scopes),
        encryptionKeyId,
        tokenVersion: 0,
        reauthRequiredAt: null,
        disconnectedAt: null,
        createdAt: now,
        updatedAt: now,
      }

      insertConnection.run(connection)

      return mapConnection(findByUserId.get(userId))
    },

    findByUserId(userId) {
      return mapConnection(findByUserId.get(userId))
    },

    findBySpotifyUserId(spotifyUserId) {
      return mapConnection(findBySpotifyUserId.get(spotifyUserId))
    },

    updateTokens({
      userId,
      refreshTokenEnc,
      accessTokenEnc,
      accessTokenExpiresAt,
      scopes,
      encryptionKeyId,
      expectedTokenVersion,
    }) {
      const result = updateTokens.run({
        userId,
        refreshTokenEnc,
        accessTokenEnc,
        accessTokenExpiresAt,
        scopesJson: JSON.stringify(scopes),
        encryptionKeyId,
        expectedTokenVersion,
        updatedAt: Date.now(),
      })

      return result.changes === 1
    },

    markReauthRequired(userId) {
      const now = Date.now()
      const result = markReauthRequired.run({ userId, reauthRequiredAt: now, updatedAt: now })
      if (result.changes !== 1) throw new Error(`Spotify connection not found for ${userId}`)
      return mapConnection(findByUserId.get(userId))
    },
    tryAcquireRefreshLease({ userId, leaseId, now, leaseUntil }) {
      const result = acquireRefreshLease.run({
        userId,
        leaseId,
        now,
        leaseUntil,
        updatedAt: now,
      })

      return result.changes === 1
    },
    releaseRefreshLease({ userId, leaseId }) {
      const result = releaseRefreshLease.run({
        userId,
        leaseId,
        updatedAt: Date.now(),
      })

      return result.changes === 1
    },
    saveLinkedConnection({
  userId,
  spotifyUserId,
  refreshTokenEnc,
  accessTokenEnc,
  accessTokenExpiresAt,
  scopes,
  encryptionKeyId,
}) {
  const now = Date.now()

  saveLinkedConnectionStatement.run({
    userId,
    spotifyUserId,
    refreshTokenEnc,
    accessTokenEnc,
    accessTokenExpiresAt,
    scopesJson: JSON.stringify(scopes),
    encryptionKeyId,
    createdAt: now,
    updatedAt: now,
  })

  return mapConnection(
    findByUserId.get(userId)
  )
},
  }
}
