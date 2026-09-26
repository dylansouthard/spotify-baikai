import { randomUUID } from 'node:crypto'

import { encryptToken, decryptToken } from './tokenCryptoService.js'

import { refreshSpotifyAccessToken } from './spotifyOAuthService.js'

const EXPIRY_SKEW_MS = 60 * 1000

const REFRESH_LEASE_MS = 30 * 1000
const REFRESH_POLL_MS = 100

export const SPOTIFY_CONNECTION_ERROR = 'Spotify account must be connected'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const getTokenContext = (connection, tokenType) => ({
  userId: connection.userId,
  spotifyUserId: connection.spotifyUserId,
  tokenType,
})

const getAuthorizationHeaders = (accessToken) => ({
  Authorization: `Bearer ${accessToken}`,
})

const isInvalidGrant = (error) => error.response?.data?.error === 'invalid_grant'

const isAccessTokenUsable = (connection, now) =>
  Boolean(
    connection.accessTokenEnc &&
    connection.accessTokenExpiresAt &&
    connection.accessTokenExpiresAt > now() + EXPIRY_SKEW_MS,
  )

export const createSpotifyCredentialService = ({
  connections,
  refreshAccessToken = refreshSpotifyAccessToken,
  encryptionKeyId = process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY_ID,
  now = Date.now,
}) => {
  if (!encryptionKeyId) {
    throw new Error('SPOTIFY_TOKEN_ENCRYPTION_KEY_ID is required')
  }

  const useCachedAccessToken = (connection) => {
    const accessToken = decryptToken(connection.accessTokenEnc, getTokenContext(connection, 'access'))

    return getAuthorizationHeaders(accessToken)
  }

  const getHeaders = async (userId) => {
    let connection = connections.findByUserId(userId)

    if (!connection || connection.disconnectedAt || connection.reauthRequiredAt) {
      throw new Error(SPOTIFY_CONNECTION_ERROR)
    }

    if (isAccessTokenUsable(connection, now)) {
      return useCachedAccessToken(connection)
    }

    const leaseId = randomUUID()

    while (true) {
      const currentTime = now()

      const acquired = connections.tryAcquireRefreshLease({
        userId,
        leaseId,
        now: currentTime,
        leaseUntil: currentTime + REFRESH_LEASE_MS,
      })

      if (acquired) {
        break
      }

      await sleep(REFRESH_POLL_MS)

      connection = connections.findByUserId(userId)

      if (!connection || connection.disconnectedAt || connection.reauthRequiredAt) {
        throw new Error(SPOTIFY_CONNECTION_ERROR)
      }

      if (isAccessTokenUsable(connection, now)) {
        return useCachedAccessToken(connection)
      }
    }

    try {
      // Reload after obtaining the lease.
      //
      // Another process may have refreshed
      // immediately before we acquired it.

      connection = connections.findByUserId(userId)

      if (isAccessTokenUsable(connection, now)) {
        return useCachedAccessToken(connection)
      }

      const startingTokenVersion = connection.tokenVersion

      const refreshContext = getTokenContext(connection, 'refresh')

      const accessContext = getTokenContext(connection, 'access')

      const refreshToken = decryptToken(connection.refreshTokenEnc, refreshContext)

      let result

      try {
        result = await refreshAccessToken({
          refreshToken,
        })
      } catch (error) {
        if (isInvalidGrant(error)) {
          connections.markReauthRequired(userId)
        }

        throw error
      }

      const { tokens } = result

      const accessToken = tokens.access_token

      const expiresIn = Number(tokens.expires_in)

      if (!accessToken || !Number.isFinite(expiresIn) || expiresIn <= 0) {
        throw new Error('Spotify returned an invalid token refresh response')
      }

      const nextRefreshToken = tokens.refresh_token ?? refreshToken

      const scopes = tokens.scope ? tokens.scope.split(/\s+/).filter(Boolean) : connection.scopes

      const updated = connections.updateTokens({
        userId,

        refreshTokenEnc: encryptToken(nextRefreshToken, refreshContext),

        accessTokenEnc: encryptToken(accessToken, accessContext),

        accessTokenExpiresAt: now() + expiresIn * 1000,

        scopes,
        encryptionKeyId,

        expectedTokenVersion: startingTokenVersion,
      })

      if (!updated) {
        // Someone else won the race.
        // Use whatever is now in storage.

        const latest = connections.findByUserId(userId)

        if (latest && isAccessTokenUsable(latest, now)) {
          return useCachedAccessToken(latest)
        }

        throw new Error('Spotify credentials changed during refresh')
      }

      return getAuthorizationHeaders(accessToken)
    } finally {
      connections.releaseRefreshLease({
        userId,
        leaseId,
      })
    }
  }

  return {
    getHeaders,
  }
}
