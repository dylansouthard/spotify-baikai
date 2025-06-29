import express from 'express'
import { createPlaylist, addTracksToPlaylist } from '../controllers/playlistController.js'

const router = express.Router()

router.route('/').post(createPlaylist)

router.route('/:id/tracks').post(addTracksToPlaylist)

export default router
