import asyncHandler from 'express-async-handler'
import qs from 'querystring'
import axios from 'axios'
import { throwError } from '../util/conveniences.js'
import { ERROR_TYPE } from '../constants/errorsType.js'
import { API_CONST, getBearerToken } from '../constants/apiConstants.js'

export const playTracks = asyncHandler(async (req, res) => {
  const { uris } = req.body
  try {
    await axios.put(`${API_CONST.SF_API_BASE}me/player/play`, { uris }, { headers: getBearerToken(req) })
    res.status(204).send()
  } catch (e) {
    console.error(e)
    throwError(ERROR_TYPE.PLAY, res, e.response?.data?.error?.message)
  }
})

export const playAlbum = asyncHandler(async (req, res) => {
  const { context_uri } = req.body
  try {
    await axios.put(`${API_CONST.SF_API_BASE}me/player/play`, { context_uri }, { headers: getBearerToken(req) })
    res.status(204).send()
  } catch (e) {
    console.error(e)
    throwError(ERROR_TYPE.PLAY, res, e.response?.data?.error?.message)
  }
})
