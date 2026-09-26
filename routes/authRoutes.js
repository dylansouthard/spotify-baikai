import express from 'express'

import { login, loginOpenAI, tokenOpenAI, callback, refreshToken, spotifyLinkCallback } from '../controllers/authController.js'

const router = express.Router()

router.get('/login', login)

router.get('/callback', callback)

router.post('/refresh-token', refreshToken)

router.post('/token-openai', tokenOpenAI)

router.get('/login-openai', loginOpenAI)

router.get('/spotify/callback', spotifyLinkCallback)

export default router
