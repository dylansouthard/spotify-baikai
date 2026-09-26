export const createSpotifyOAuthStateRepository = (
  database
) => {
  const insertStateStatement =
    database.prepare(`
      INSERT INTO spotify_oauth_states (
        state_hash,
        user_id,
        expires_at,
        consumed_at,
        created_at
      )
      VALUES (
        @stateHash,
        @userId,
        @expiresAt,
        NULL,
        @createdAt
      )
    `)

  const findStateStatement =
    database.prepare(`
      SELECT *
      FROM spotify_oauth_states
      WHERE state_hash = ?
    `)

  const consumeStateStatement =
    database.prepare(`
      UPDATE spotify_oauth_states
      SET consumed_at = @consumedAt
      WHERE state_hash = @stateHash
        AND consumed_at IS NULL
        AND expires_at > @now
    `)
    const findByHash = (stateHash) => {
  const row =
    findStateStatement.get(stateHash)

  if (!row) return null

  return {
    stateHash: row.state_hash,
    userId: row.user_id,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
    createdAt: row.created_at,
  }
}

  return {
    create({
      stateHash,
      userId,
      expiresAt,
    }) {
      const createdAt = Date.now()

      insertStateStatement.run({
        stateHash,
        userId,
        expiresAt,
        createdAt,
      })

      return {
        stateHash,
        userId,
        expiresAt,
        consumedAt: null,
        createdAt,
      }
    },

    findByHash(stateHash) {
      return findByHash(stateHash)
    },

    consume({
  stateHash,
  now,
}) {
  const result =
    consumeStateStatement.run({
      stateHash,
      consumedAt: now,
      now,
    })

  if (result.changes !== 1) {
    return null
  }

  return findByHash(stateHash)
},
  }
}