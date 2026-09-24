import asyncHandler from 'express-async-handler'
import { throwError } from '../util/conveniences.js'
import { ERROR_TYPE } from '../constants/errorsType.js'
import { getBearerToken } from '../constants/apiConstants.js'

import { getTopArtists as getTopArtistsService} from '../services/spotifyLibraryService.js'

export const getTopArtists = asyncHandler(async (req, res) => {
  const { time_range:timeRange = 'long_term', limit = 50, offset = 0 } = req.query
  try {
    const artists = await getTopArtistsService({timeRange, limit, headers: getBearerToken(req)})
    res.json({ artists })
  } catch (e) {
    console.log(e)
    throwError(ERROR_TYPE.SEARCH, res, e.response?.data?.error?.message)
  }
})
