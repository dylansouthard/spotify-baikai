import asyncHandler from 'express-async-handler'
import { db } from '../db/database.js'
import axios from 'axios'
import { throwError } from '../util/conveniences.js'
import { ERROR_TYPE } from '../constants/errorsType.js'
import { API_CONST, getCredentials } from '../constants/apiConstants.js'
import { createOAuthLogger, redirectForLog, tokenFields } from '../middleware/tokenOpenAIDiagnostics.js'
import { buildSpotifyAuthorizationUrl, exchangeSpotifyAuthorizationCode, refreshSpotifyAccessToken } from '../services/spotifyOAuthService.js'
import { createSpotifyConnectionRepository } from '../repositories/spotifyConnectionRepository.js'
import { createSpotifyOAuthStateRepository } from '../repositories/spotifyOAuthStateRepository.js'
import { createSpotifyOAuthStateService } from '../services/spotifyOAuthStateService.js'
import { createSpotifyLinkService } from '../services/spotifyLinkService.js'

const SCOPE =
  'playlist-modify-private playlist-modify-public user-library-read user-top-read user-read-playback-state user-modify-playback-state playlist-read-private user-read-recently-played user-read-currently-playing user-follow-read user-read-currently-playing'

export const login = (req, res) => {
  const url = buildSpotifyAuthorizationUrl({
    redirectUri: process.env.REDIRECT_URI,
  })
  res.redirect(url)
}

let spotifyLinks

const getSpotifyLinks = () => {
  if (spotifyLinks) return spotifyLinks
  const connections = createSpotifyConnectionRepository(db)
  const stateRepository = createSpotifyOAuthStateRepository(db)
  const states = createSpotifyOAuthStateService({states: stateRepository})
  spotifyLinks = createSpotifyLinkService({states, connections, redirectUri: process.env.SPOTIFY_LINK_REDIRECT_URI})
  return spotifyLinks
}

export const spotifyLinkCallback = asyncHandler(async (req, res) => {
  const {code, state, error} = req.query
  console.log(`error is ${error}`);
  if (error) throwError(ERROR_TYPE.AUTH_FAILED, res, error)
  if (!code || !state) throwError(ERROR_TYPE.MISSING_PARAMS, res, 'Spotify callback missing code or state')
  
  try {
    const links = getSpotifyLinks()
    console.log(`got links ${links}`);
    await links.completeAuthorization({code, state})
    res.status(200).send(`
             <html>
          <body>
            <h1>Spotify connected</h1>
            <p>You can return to your AI assistant.</p>
          </body>
        </html>
      `)
  } catch (e) {
    console.log(`throwing error ${e}`);
    throwError(ERROR_TYPE.AUTH_FAILED, res, e.response?.data?.error?.message ?? e)
  }
})

export const loginOpenAI = (req, res) => {
  const { state } = req.query
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_ID,
    scope: SCOPE,
    redirect_uri: process.env.OPENAI_CALLBACK,
    // redirect_uri: `${process.env.DOMAIN}/openai-callback`,
    state,
  })
  createOAuthLogger(req, 'login-openai').log('redirecting to Spotify authorization endpoint', {
    suppliedRedirectUri: redirectForLog(req.query.redirect_uri),
    spotifyRedirectUri: redirectForLog(params.get('redirect_uri')),
    hasState: Boolean(state),
  })
  res.redirect(`https://accounts.spotify.com/authorize?${params}`)
}

export const tokenOpenAI = asyncHandler(async (req, res) => {
  const diagnostic = res.locals.tokenOpenAI
  try {
    diagnostic?.setStage('build_spotify_request')
    const { code, redirect_uri, refresh_token, grant_type } = req.body
    // Preserve the original code-exchange default, but honor refresh requests.
    const grantType = grant_type ?? 'authorization_code'
    diagnostic?.log('request parsed', {
      effectiveGrantType: grantType,
      redirectUri: redirectForLog(redirect_uri),
      configuredLoginRedirectUri: redirectForLog(process.env.OPENAI_CALLBACK),
      redirectMatchesLogin: grantType === 'authorization_code' ? redirect_uri === process.env.OPENAI_CALLBACK : null,
      hasClientId: Boolean(req.body.client_id),
      hasClientSecret: Boolean(req.body.client_secret),
      hasCode: Boolean(code),
      hasRefreshToken: Boolean(refresh_token),
      hasSpotifyClientId: Boolean(process.env.SPOTIFY_ID),
      hasSpotifyClientSecret: Boolean(process.env.SPOTIFY_SECRET),
    })
    const params = new URLSearchParams({
      grant_type: grantType,
      ...(grantType === 'refresh_token' ? { refresh_token } : { code, redirect_uri }),
      client_id: process.env.SPOTIFY_ID,
      client_secret: process.env.SPOTIFY_SECRET,
    })
    diagnostic?.setStage('spotify_token_request')
    diagnostic?.log('calling Spotify token endpoint', {
      effectiveGrantType: grantType,
      spotifyRedirectUri: redirectForLog(params.get('redirect_uri')),
      method: 'POST',
      endpoint: `${API_CONST.SF_ACCT_BASE}api/token`,
    })
    const response = await axios.post(`${API_CONST.SF_ACCT_BASE}api/token`, params, API_CONST.URL_ENCODED_HEADERS)
    diagnostic?.setSpotifyStatus(response.status)
    diagnostic?.setStage('process_spotify_response')
    diagnostic?.remember(response.data)
    diagnostic?.log('Spotify token response', {
      status: response.status,
      contentType: response.headers?.['content-type'],
      ...tokenFields(response.data),
      tokenType: response.data?.token_type,
      expiresIn: response.data?.expires_in,
      scope: response.data?.scope,
    })
    const { access_token, refresh_token: newRefreshToken, expires_in, token_type, scope } = response.data
    diagnostic?.setStage('send_response')
    res.json({ access_token, refresh_token: newRefreshToken, expires_in, token_type, scope })
  } catch (e) {
    if (e.response) diagnostic?.setSpotifyStatus(e.response.status)
    diagnostic?.fail(e)
    throwError(ERROR_TYPE.TOKEN_REFRESH, res, e.response?.data)
  }
})

export const callback = asyncHandler(async (req, res) => {
  const code = req.query.code

  try {
    const {tokens} = await exchangeSpotifyAuthorizationCode({code, redirectUri: process.env.REDIRECT_URI})

    const { access_token, refresh_token } = tokens
    res.json({ access_token, refresh_token })
  } catch (e) {
    throwError(ERROR_TYPE.AUTH_TOKEN, res, e.response?.data?.error?.message)
  }
})

export const refreshToken = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body
  try {
    const {tokens} = await refreshSpotifyAccessToken({refreshToken: refresh_token})
    res.json({ access_token: tokens.access_token })
  } catch (e) {
    createOAuthLogger(req, 'refresh-token').error(e, { stage: 'spotify_token_request' })
    throwError(ERROR_TYPE.TOKEN_REFRESH, res, e.response?.data?.error_description)
  }
})
