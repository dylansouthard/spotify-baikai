import asyncHandler from 'express-async-handler'
import axios from 'axios'
import { randomUUID } from 'node:crypto'
import { API_CONST, getBearerToken } from '../constants/apiConstants.js'
import { runPlayback, summarizeDevice } from '../services/spotifyPlayback.js'

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
  if (req.query.details !== undefined && !['true', 'false'].includes(req.query.details)) {
    return res.status(400).json({ error: true, type: 'PLAY', message: 'details must be true or false.' })
  }
  const debug = process.env.NODE_ENV === 'development' || ['1', 'true'].includes(process.env.SPOTIFY_PLAYBACK_DEBUG)
  const details = { request_id: randomUUID(), playback_mode: mode, device_id: deviceId ?? null, uri_count: mode === 'uris' ? value.length : 0 }
  const log = (event, fields = {}) => {
    if (debug) console.info('[spotify-playback]', JSON.stringify(redact({
      ...details, event, ...fields,
    }, req.headers.authorization)))
  }

  log('request', { spotify_status: null })
  const result = await runPlayback({ mode, value, deviceId, headers: getBearerToken(req), log })
  const { http_status, retry_after, ...outcome } = result
  log('outcome', { ...outcome, fallback_triggered: outcome.fallback_used, fallback_mode: outcome.fallback_used ? 'playlist_context' : null })
  if (retry_after) res.set('Retry-After', retry_after)
  if (!result.ok) return res.status(http_status).json(redact(outcome, req.headers.authorization))
  if (req.query.details === 'true') return res.status(200).json(redact(outcome, req.headers.authorization))
  return res.status(204).send()
})

export const getDevices = asyncHandler(async (req, res) => {
  try {
    const response = await axios.get(`${API_CONST.SF_API_BASE}me/player/devices`, {
      headers: getBearerToken(req), timeout: 2500, signal: AbortSignal.timeout(3000),
    })
    if (response.status !== 200 || !Array.isArray(response.data?.devices)) {
      return res.status(502).json({ ok: false, error: true, type: 'PLAY', message: 'Unexpected Spotify device response.', spotify_status: response.status })
    }
    return res.json(redact({ devices: response.data.devices.map(summarizeDevice) }, req.headers.authorization))
  } catch (e) {
    const status = e.response?.status ?? null
    const response = redact(e.response?.data, req.headers.authorization)
    const retryAfter = e.response?.headers?.['retry-after']
    if (retryAfter) res.set('Retry-After', retryAfter)
    return res.status(status >= 400 && status <= 599 ? status : 502).json({
      ok: false, error: true, type: 'PLAY', message: response?.error?.message || 'Spotify device lookup failed',
      reason: response?.error?.reason ?? null, spotify_status: status, spotify_response: response,
    })
  }
})

export const playTracks = playback('uris')
// Keep the existing action name for callers; Spotify also accepts playlists and artists.
export const playAlbum = playback('context_uri')
