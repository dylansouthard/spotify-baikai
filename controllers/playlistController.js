import asyncHandler from 'express-async-handler'
import axios from 'axios'
import { throwError } from '../util/conveniences.js'
import { ERROR_TYPE } from '../constants/errorsType.js'
import { API_CONST, getBearerToken } from '../constants/apiConstants.js'

export const createPlaylist = asyncHandler(async (req, res) => {
  try {
    const { name, description } = req.body

    const user = await axios.get(`${API_CONST.SF_API_BASE}me`, { headers: getBearerToken(req) })

    const userID = user.data.id

    const playlist = await axios.post(
      `${API_CONST.SF_API_BASE}users/${userID}/playlists`,
      { name, description, public: false },
      { headers: getBearerToken(req) }
    )
    res.json({ playlistId: playlist.data.id, url: playlist.data.external_urls.spotify })
  } catch (e) {
    throwError(ERROR_TYPE.CREATE_PLAYLIST, res, e.response?.data?.error?.message)
  }
})

export const addTracksToPlaylist = asyncHandler(async (req, res) => {
  try {
    const { id: playlistId } = req.params
    const { uris } = req.body
    await axios.post(
      `${API_CONST.SF_API_BASE}playlists/${playlistId}/tracks`,
      { uris },
      { headers: getBearerToken(req) }
    )
    res.send('Tracks added')
  } catch (e) {
    throwError(ERROR_TYPE.ADD_TRACKS, res, e.response?.data?.error?.message)
  }
})
