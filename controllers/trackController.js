import asyncHandler from 'express-async-handler'
import qs from 'querystring'
import axios from 'axios'
import { throwError } from '../util/conveniences.js'
import { ERROR_TYPE } from '../constants/errorsType.js'
import { API_CONST, getBearerToken } from '../constants/apiConstants.js'

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

export const breakDownTrack = (track) => ({ title: track.name, artist: track.artists.map((a) => a.name).join(', ') })
