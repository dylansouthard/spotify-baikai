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
  openaiCallback,
} from '../controllers/apiController.js'

dotenv.config()

const router = express.Router()

router.get('/login', login)

router.get('/callback', callback)

router.get('/openai-callback', openaiCallback)

router.post('/refresh-token', refreshToken)

router.post('/search-tracks', searchTracks)

router.post('/create-playlist', createPlaylist)

router.post('/add-tracks', addTracks)

router.post('/token-openai', tokenOpenAI)

router.get('/login-openai', loginOpenAI)

export default router
