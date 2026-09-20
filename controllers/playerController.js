import asyncHandler from 'express-async-handler'
import axios from 'axios'
import { randomUUID } from 'node:crypto'
import { API_CONST, getBearerToken } from '../constants/apiConstants.js'

// Never log Axios errors/config objects: they contain the Authorization header.
const redact = (data, authorization = '') => {
  const token = authorization.replace(/^Bearer\s+/i, '')
  return JSON.parse(JSON.stringify(data ?? null, (key, value) => {
    if (/authorization|token|secret/i.test(key)) return '[REDACTED]'
    if (typeof value !== 'string') return value
    const clean = token ? value.split(token).join('[REDACTED]') : value
    return clean.replace(/Bearer\s+[^\s"<>]+/gi, 'Bearer [REDACTED]')
  }))
}

const playback = (mode) => asyncHandler(async (req, res) => {
  const value = req.body?.[mode]
  const valid = mode === 'uris'
    ? Array.isArray(value) && value.length > 0 && value.every(uri => typeof uri === 'string' && /^spotify:track:[A-Za-z0-9]{22}$/.test(uri))
    : typeof value === 'string' && /^spotify:(album|artist|playlist):[A-Za-z0-9]{22}$/.test(value)
  if (!valid || req.body?.[mode === 'uris' ? 'context_uri' : 'uris'] !== undefined) {
    return res.status(400).json({
      error: true,
      type: 'PLAY',
      message: mode === 'uris'
        ? 'Provide uris as a non-empty JSON array of Spotify track URIs, without context_uri.'
        : 'Provide context_uri as a Spotify album, artist, or playlist URI, without uris.',
    })
  }

  const deviceId = req.query.device_id
  if (deviceId !== undefined && (typeof deviceId !== 'string' || !deviceId.trim())) {
    return res.status(400).json({ error: true, type: 'PLAY', message: 'device_id must be a non-empty query string.' })
  }
  const debug = process.env.NODE_ENV === 'development' || ['1', 'true'].includes(process.env.SPOTIFY_PLAYBACK_DEBUG)
  const details = { request_id: randomUUID(), mode, device_id: deviceId ?? null, uri_count: mode === 'uris' ? value.length : 0 }
  const log = (event, status, response) => {
    if (debug) console.info('[spotify-playback]', JSON.stringify(redact({
      ...details, event, spotify_status: status, ...(response === undefined ? {} : { spotify_response: response }),
    }, req.headers.authorization)))
  }

  log('request', null)
  try {
    const response = await axios.put(`${API_CONST.SF_API_BASE}me/player/play`, { [mode]: value }, {
      headers: { ...getBearerToken(req), 'Content-Type': 'application/json' },
      ...(deviceId === undefined ? {} : { params: { device_id: deviceId } }),
    })
    log('response', response.status, response.status === 204 ? undefined : response.data)
    if (response.status !== 204) {
      return res.status(502).json({
        error: true, type: 'PLAY', message: `Unexpected Spotify playback status: ${response.status}`,
        spotify_status: response.status, spotify_response: redact(response.data, req.headers.authorization),
      })
    }
    return res.status(204).send()
  } catch (e) {
    const status = e.response?.status ?? null
    const response = redact(e.response?.data, req.headers.authorization)
    log('error', status, response)
    const retryAfter = e.response?.headers?.['retry-after']
    if (retryAfter) res.set('Retry-After', retryAfter)
    return res.status(status >= 400 && status <= 599 ? status : 502).json({
      error: true, type: 'PLAY',
      message: typeof response?.error?.message === 'string' ? response.error.message : 'Spotify playback request failed',
      spotify_status: status, spotify_response: response,
    })
  }
})

export const playTracks = playback('uris')
// Keep the existing action name for callers; Spotify also accepts playlists and artists.
export const playAlbum = playback('context_uri')
