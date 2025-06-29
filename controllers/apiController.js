import asyncHandler from 'express-async-handler'
import qs from 'querystring'
import axios from 'axios'
import { throwError } from '../util/conveniences.js'
import { ERROR_TYPE } from '../constants/errorsType.js'

const SF_ACCT_BASE = 'https://accounts.spotify.com/'
const SF_API_BASE = 'https://api.spotify.com/v1/'
const URL_ENCODED_HEADERS = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
const OPEN_AI_CALLBACK = 'https://chat.openai.com/aip/g-83a8fa8db29d1a28bd4fed25e76afd0a8bf3fbdd/oauth/callback'

const getCredentials = () => ({
  client_id: process.env.SPOTIFY_ID,
  client_secret: process.env.SPOTIFY_SECRET,
})

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '')
  return { Authorization: `Bearer ${token}` }
}

export const login = (req, res) => {
  const scope = 'playlist-modify-private playlist-modify-public'
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_ID,
    scope,
    redirect_uri: process.env.REDIRECT_URI,
  })
  res.redirect(`${SF_ACCT_BASE}authorize?${params}`)
}

export const loginOpenAI = (req, res) => {
  const scope = 'playlist-modify-private playlist-modify-public'
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_ID,
    scope,
    redirect_uri: `${process.env.DOMAIN}/openai-callback`,
  })
  res.redirect(`https://accounts.spotify.com/authorize?${params}`)
}

export const tokenOpenAI = asyncHandler(async (req, res) => {
  const { code, redirect_uri } = req.body
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri,
    client_id: process.env.SPOTIFY_ID,
    client_secret: process.env.SPOTIFY_SECRET,
  })

  try {
    const response = await axios.post(`${SF_ACCT_BASE}api/token`, params, URL_ENCODED_HEADERS)
    const { access_token, refresh_token, expires_in } = response.data
    res.json({ access_token, refresh_token, expires_in })
  } catch (e) {
    throwError(ERROR_TYPE.TOKEN_REFRESH, res, err.response?.data)
  }
})

export const openaiCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query

  if (!code || !state) {
    return res.status(400).send('Missing code or state')
  }

  const params = qs.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${process.env.DOMAIN}/openai-callback`, // This must match the one used earlier
    client_id: process.env.SPOTIFY_ID,
    client_secret: process.env.SPOTIFY_SECRET,
  })

  try {
    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    const { access_token, refresh_token, expires_in, token_type } = tokenRes.data

    // ✅ Simulate token callback to OpenAI
    const redirectToOpenAI =
      OPEN_AI_CALLBACK +
      `?access_token=${encodeURIComponent(access_token)}` +
      `&refresh_token=${encodeURIComponent(refresh_token)}` +
      `&token_type=${encodeURIComponent(token_type)}` +
      `&expires_in=${expires_in}` +
      `&state=${encodeURIComponent(state)}`

    res.redirect(redirectToOpenAI)
  } catch (e) {
    console.error('Token exchange failed:', e.response?.data || e)
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
    const response = await axios.post(`${SF_ACCT_BASE}api/token`, params, URL_ENCODED_HEADERS)

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
    const response = await axios.post(`${SF_ACCT_BASE}api/token`, params, URL_ENCODED_HEADERS)
    res.json({ access_token: response.data.access_token })
  } catch (e) {
    console.log(e)
    throwError(ERROR_TYPE.TOKEN_REFRESH, res, e.response?.data?.error_description)
  }
})

export const searchTracks = asyncHandler(async (req, res) => {
  const { query = 'Andromeda Weyes Blood', limit = 10 } = req.body

  const headers = getBearerToken(req)
  const params = {
    q: query,
    type: 'track',
    limit,
  }

  try {
    const response = await axios.get(`${SF_API_BASE}search`, { headers, params })
    const matches = response.data.tracks.items.map((track) => ({
      title: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      album: track.album.name,
      uri: track.uri,
      popularity: track.popularity,
      duration_ms: track.duration_ms,
    }))

    res.json({ query, matches })
  } catch (e) {
    console.log(e)
    throwError(ERROR_TYPE.SEARCH, res, e.response?.data?.error?.message)
  }
})

export const createPlaylist = asyncHandler(async (req, res) => {
  try {
    const { name, description } = req.body

    const user = await axios.get(`${SF_API_BASE}me`, { headers: getBearerToken(req) })

    const userID = user.data.id

    const playlist = await axios.post(
      `${SF_API_BASE}users/${userID}/playlists`,
      { name, description, public: false },
      { headers: getBearerToken(req) }
    )
    res.json({ playlistId: playlist.data.id, url: playlist.data.external_urls.spotify })
  } catch (e) {
    throwError(ERROR_TYPE.CREATE_PLAYLIST, res, e.response?.data?.error?.message)
  }
})

export const addTracks = asyncHandler(async (req, res) => {
  try {
    const { playlistId, uris } = req.body
    await axios.post(`${SF_API_BASE}playlists/${playlistId}/tracks`, { uris }, { headers: getBearerToken(req) })
    res.send('Tracks added')
  } catch (e) {
    throwError(ERROR_TYPE.ADD_TRACKS, res, e.response?.data?.error?.message)
  }
})
