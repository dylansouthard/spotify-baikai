import express from 'express'

import { playTracks, playAlbum, getDevices } from '../controllers/playerController.js'

const router = express.Router()

router.route('/play-tracks').put(playTracks)
router.route('/play-album').put(playAlbum)
router.route('/devices').get(getDevices)

export default router
