
import { buildSpotifyAuthorizationUrl, exchangeSpotifyAuthorizationCode, fetchSpotifyUser } from './spotifyOAuthService.js'
import { encryptToken } from './tokenCryptoService.js'

export const createSpotifyLinkService = ({
    states,
    connections,
    redirectUri,
    encryptionKeyId = process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY_ID,
    exchangeAuthorizationCode = exchangeSpotifyAuthorizationCode,
    fetchUser = fetchSpotifyUser
}) => {
    if (!redirectUri) throw new Error('Spotify redirect URI is required')
    if (!encryptionKeyId) throw new Error('SPOTIFY_TOKEN_ENCRYPTION_KEY_ID is required')
    
    const createAuthorizationUrl = (userId) => {
        const state = states.create(userId)
        return buildSpotifyAuthorizationUrl({redirectUri, state})
    }

    const completeAuthorization = async ({code, state}) => {
        const oauthState = states.consume(state)
        if (!oauthState) throw new Error('Invalid or expired Spotify authorization state')

        const {tokens} = await exchangeAuthorizationCode({code, redirectUri})

        const accessToken = tokens.access_token
        const refreshToken = tokens.refresh_token
        const expiresIn = Number(tokens.expires_in)

        if (!accessToken || !refreshToken || expiresIn <= 0) {
            throw new Error('Spotify returned an invalid authorization response')
        }
        const spotifyUser = await fetchUser({accessToken})
        if (!spotifyUser?.id) throw new Error('Spotify user identity is missing')
        const userId = oauthState.userId
        const spotifyUserId = spotifyUser.id
        const refreshContext = {userId, spotifyUserId, tokenType:'refresh'}
        const accessContext = {userId, spotifyUserId, tokenType:'access'}
        const scopes = tokens.scope ? tokens.scope.split(/\s+/).filter(Boolean) : []
        const connection = connections.saveLinkedConnection({
            userId,
            spotifyUserId,
            refreshTokenEnc: encryptToken(refreshToken, refreshContext),
            accessTokenEnc: encryptToken(accessToken, accessContext),
            accessTokenExpiresAt: Date.now() + expiresIn * 1000,
            scopes,
            encryptionKeyId
        })

        return {
            userId: connection.userId,
            spotifyUserId: connection.spotifyUserId,
            scopes: connection.scopes
        }
    }

    return {createAuthorizationUrl, completeAuthorization}
}

