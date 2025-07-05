import asyncHandler from 'express-async-handler'
import qs from 'querystring'
import axios from 'axios'
import { throwError } from '../util/conveniences.js'
import { ERROR_TYPE } from '../constants/errorsType.js'
import { API_CONST, getCredentials } from '../constants/apiConstants.js'

const SCOPE =
  'playlist-modify-private playlist-modify-public user-library-read user-top-read user-read-playback-state user-modify-playback-state playlist-read-private'

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
  console.error(`Redirect URI used in login: ${process.env.DOMAIN}/openai-callback`)
  res.redirect(`https://accounts.spotify.com/authorize?${params}`)
}

export const tokenOpenAI = asyncHandler(async (req, res) => {
  console.error('Received /token-openai call')
  console.error('Headers:', JSON.stringify(req.headers, null, 2))
  console.error('Body:', JSON.stringify(req.body, null, 2))
  const { code, redirect_uri } = req.body
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri,
    client_id: process.env.SPOTIFY_ID,
    client_secret: process.env.SPOTIFY_SECRET,
  })

  try {
    const response = await axios.post(`${API_CONST.SF_ACCT_BASE}api/token`, params, API_CONST.URL_ENCODED_HEADERS)
    const { access_token, refresh_token, expires_in } = response.data
    res.json({ access_token, refresh_token, expires_in })
  } catch (e) {
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
  console.log(`refresh token is ${refresh_token}`)
  console.log(`credentials are ${JSON.stringify(getCredentials())}`)
  const params = qs.stringify({
    grant_type: 'refresh_token',
    refresh_token,
    ...getCredentials(),
  })
  try {
    const response = await axios.post(`${API_CONST.SF_ACCT_BASE}api/token`, params, API_CONST.URL_ENCODED_HEADERS)
    res.json({ access_token: response.data.access_token })
  } catch (e) {
    console.log(e)
    throwError(ERROR_TYPE.TOKEN_REFRESH, res, e.response?.data?.error_description)
  }
})
