import asyncHandler from 'express-async-handler'
import qs from 'querystring'
import axios from 'axios'
import { throwError } from '../util/conveniences.js'
import { ERROR_TYPE } from '../constants/errorsType.js'
import { API_CONST, getBearerToken } from '../constants/apiConstants.js'
import { joinArtists, getFirstArtist } from '../util/conveniences.js'

export const searchTracks = asyncHandler(async (req, res) => {
  const { query = 'Andromeda Weyes Blood', limit = 10 } = req.query

  const headers = getBearerToken(req)
  const params = {
    q: query,
    type: 'track',
    limit,
  }

  try {
    const response = await axios.get(`${API_CONST.SF_API_BASE}search`, { headers, params })
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

export const getLikedTracks = asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query
  try {
    const response = await axios.get(`${API_CONST.SF_API_BASE}me/tracks`, {
      headers: getBearerToken(req),
      params: { limit, offset },
    })
    const tracks = response.data.items.map(({ track }) => breakDownTrack(track))
    res.json({ tracks })
  } catch (e) {
    console.log(e)
    throwError(ERROR_TYPE.SEARCH, res, e.response?.data?.error?.message)
  }
})

export const getTopTracks = asyncHandler(async (req, res) => {
  const { time_range = 'long_term', limit = 50, offset = 0 } = req.query
  try {
    const response = await axios.get(`${API_CONST.SF_API_BASE}me/top/tracks`, {
      headers: getBearerToken(req),
      params: { time_range, limit, offset },
    })
    const tracks = response.data.items.map((track) => breakDownTrack(track))
    res.json({ tracks })
  } catch (e) {
    console.log(e)
    throwError(ERROR_TYPE.SEARCH, res, e.response?.data?.error?.message)
  }
})

export const getRecentTracks = asyncHandler(async (req, res) => {
  const {limit = 50, after, before} = req.query
  try {
    const response = await axios.get(`${API_CONST.SF_API_BASE}me/player/recently-played`, {
      headers: getBearerToken(req),
      params: {limit, after, before}
    })
    const tracks = response.data.items.filter(item => item.track).map(item => breakDownTrack(item.track))
    res.json({tracks})
  } catch (e) {
    // Axios errors contain the bearer token in config/request; never dump them.
    const status = e.response?.status
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    const clean = (value) => {
      if (typeof value !== 'string') return null
      const redacted = token ? value.split(token).join('[REDACTED]') : value
      return redacted.replace(/Bearer\s+[^\s"<>]+/gi, 'Bearer [REDACTED]')
    }
    const message = clean(e.response?.data?.error?.message) || 'Failed to get recently played tracks'
    const retryAfter = e.response?.headers?.['retry-after']
    if (retryAfter) res.set('Retry-After', retryAfter)
    res.status(status >= 400 && status <= 599 ? status : 502).json({
      error: true, type: 'RECENT_TRACKS', message,
      spotify_status: status ?? null,
      reason: clean(e.response?.data?.error?.reason),
    })
  }
})

export const breakDownTrack = (track, allArtists = true) => ({ title: track.name, artist: allArtists ? joinArtists(track.artists) : getFirstArtist(track.artists)})
