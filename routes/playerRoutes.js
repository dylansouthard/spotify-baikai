import express from 'express'

import { playTracks, playAlbum } from '../controllers/playerController.js'

const router = express.Router()

router.route('/play-tracks').put(playTracks)
router.route('/play-album').put(playAlbum)

export default router
