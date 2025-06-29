import asyncHandler from 'express-async-handler'
import qs from 'querystring'
import axios from 'axios'
import { throwError } from '../util/conveniences.js'
import { ERROR_TYPE } from '../constants/errorsType.js'
import { API_CONST, getBearerToken } from '../constants/apiConstants.js'

export const getTopArtists = asyncHandler(async (req, res) => {
  const { time_range = 'long_term', limit = 50, offset = 0 } = req.query
  try {
    const response = await axios.get(`${API_CONST.SF_API_BASE}me/top/artists`, {
      headers: getBearerToken(req),
      params: { time_range, limit, offset },
    })
    const artists = response.data.items.map((a) => a.name)
    res.json({ artists })
  } catch (e) {
    console.log(e)
    throwError(ERROR_TYPE.SEARCH, res, e.response?.data?.error?.message)
  }
})
