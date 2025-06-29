import express from 'express'

import dotenv from 'dotenv'
import {
  login,
  loginOpenAI,
  tokenOpenAI,
  callback,
  refreshToken,
  searchTracks,
  createPlaylist,
  addTracks,
} from '../controllers/apiController.js'

dotenv.config()

const router = express.Router()

router.get('/login', login)

router.get('/callback', callback)

router.post('/refresh-token', refreshToken)

router.post('/search-tracks', searchTracks)

router.post('/create-playlist', createPlaylist)

router.post('/add-tracks', addTracks)

router.post('/token-openai', tokenOpenAI)

router.post('/login-openai', loginOpenAI)

export default router
