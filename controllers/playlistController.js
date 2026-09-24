import asyncHandler from 'express-async-handler'
import axios from 'axios'
import { throwError } from '../util/conveniences.js'
import { ERROR_TYPE } from '../constants/errorsType.js'
import { API_CONST, getBearerToken } from '../constants/apiConstants.js'
import { 
  getPlaylists as getPlaylistsService,
  createPlaylist as createPlaylistService,
  addTracksToPlaylist as addTracksToPlaylistService
} from '../services/spotifyPlaylistService.js'

export const createPlaylist = asyncHandler(async (req, res) => {
  try {
    const { name, description } = req.body

    const playlistData = await createPlaylistService({name, description, headers: getBearerToken(req)})
    res.json(playlistData)
  } catch (e) {
    console.log(e)
    throwError(ERROR_TYPE.CREATE_PLAYLIST, res, e.response?.data?.error?.message)
  }
})

export const addTracksToPlaylist = asyncHandler(async (req, res) => {
  try {
    const { id: playlistId } = req.params;
    const { uris } = req.body;
    const result = await addTracksToPlaylistService({playlistId, uris, headers:getBearerToken(req)})
    return res.status(201).json(result)
  } catch (e) {
    throwError(ERROR_TYPE.ADD_TRACKS, res, e.response?.data?.error?.message || e.message);
  }
});

export const getPlaylists = asyncHandler(async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query
    const playlistData = await getPlaylistsService({limit, offset, headers:getBearerToken(req)})
    res.json(playlistData)
  } catch (e) {
    console.error(e)
    throwError(ERROR_TYPE.GET_PLAYLISTS, res, e.response?.data?.error?.message)
  }
})

const breakDownPlaylist = (playlist) => ({ id: playlist.id, name: playlist.name })
