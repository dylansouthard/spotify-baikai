import express from 'express'
import { createPlaylist, addTracksToPlaylist, getPlaylists } from '../controllers/playlistController.js'

const router = express.Router()

router.route('/').get(getPlaylists).post(createPlaylist)

router.route('/:id/tracks').post(addTracksToPlaylist)

export default router
