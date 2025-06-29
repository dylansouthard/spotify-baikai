import express from 'express'

import { searchTracks, getLikedTracks, getTopTracks } from '../controllers/trackController.js'
const router = express.Router()

router.route('/search').get(searchTracks)

router.route('/liked').get(getLikedTracks)

router.route('/top').get(getTopTracks)

export default router
