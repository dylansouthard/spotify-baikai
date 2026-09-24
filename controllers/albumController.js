import asyncHandler from 'express-async-handler'
import { throwError } from '../util/conveniences.js'
import { ERROR_TYPE } from '../constants/errorsType.js'
import { getBearerToken } from '../constants/apiConstants.js'
import { searchAlbums as searchAlbumsService } from '../services/spotifyCatalogService.js'

export const searchAlbums = asyncHandler(async (req, res) => {
  const { query = 'Andromeda Weyes Blood', limit = 10 } = req.query

  const headers = getBearerToken(req)


  try {
    const matches = await searchAlbumsService({query, limit, headers})

    res.json({ query, matches })
  } catch (e) {
    console.log(e)
    throwError(ERROR_TYPE.SEARCH, res, e.response?.data?.error?.message)
  }
})
