import asyncHandler from 'express-async-handler'
import qs from 'querystring'
import axios from 'axios'
import { throwError } from '../util/conveniences.js'
import { ERROR_TYPE } from '../constants/errorsType.js'
import { API_CONST, getCredentials } from '../constants/apiConstants.js'
import { createOAuthLogger, redirectForLog, tokenFields } from '../middleware/tokenOpenAIDiagnostics.js'

const SCOPE =
  'playlist-modify-private playlist-modify-public user-library-read user-top-read user-read-playback-state user-modify-playback-state playlist-read-private user-read-recently-played user-read-currently-playing user-follow-read user-read-currently-playing'

export const login = (req, res) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_ID,
    scope: SCOPE,
    redirect_uri: process.env.REDIRECT_URI,
  })
  res.redirect(`${API_CONST.SF_ACCT_BASE}authorize?${params}`)
}

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
  const params = qs.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.REDIRECT_URI,
    ...getCredentials(),
  })

  try {
    const response = await axios.post(`${API_CONST.SF_ACCT_BASE}api/token`, params, API_CONST.URL_ENCODED_HEADERS)

    const { access_token, refresh_token } = response.data
    res.json({ access_token, refresh_token })
  } catch (e) {
    throwError(ERROR_TYPE.AUTH_TOKEN, res, e.response?.data?.error?.message)
  }
})

export const refreshToken = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body
  const params = qs.stringify({
    grant_type: 'refresh_token',
    refresh_token,
    ...getCredentials(),
  })
  try {
    const response = await axios.post(`${API_CONST.SF_ACCT_BASE}api/token`, params, API_CONST.URL_ENCODED_HEADERS)
    res.json({ access_token: response.data.access_token })
  } catch (e) {
    createOAuthLogger(req, 'refresh-token').error(e, { stage: 'spotify_token_request' })
    throwError(ERROR_TYPE.TOKEN_REFRESH, res, e.response?.data?.error_description)
  }
})
