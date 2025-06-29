import asyncHandler from 'express-async-handler'
import qs from 'querystring'
import axios from 'axios'
import { throwError } from '../util/conveniences.js'
import { ERROR_TYPE } from '../constants/errorsType.js'
import { API_CONST, getBearerToken } from '../constants/apiConstants.js'

export const searchAlbums = asyncHandler(async (req, res) => {
  const { query = 'Andromeda Weyes Blood', limit = 10 } = req.query

  const headers = getBearerToken(req)
  const params = {
    q: query,
    type: 'album',
    limit,
  }

  try {
    const response = await axios.get(`${API_CONST.SF_API_BASE}search`, { headers, params })
    const matches = response.data.albums.items.map((album) => ({
      name: album.name,
      artist: album.artists.map((a) => a.name).join(', '),
      uri: album.uri,
    }))

    res.json({ query, matches })
  } catch (e) {
    console.log(e)
    throwError(ERROR_TYPE.SEARCH, res, e.response?.data?.error?.message)
  }
})
