import express from 'express'

import { searchTracks, getLikedTracks, getTopTracks, getRecentTracks } from '../controllers/trackController.js'
const router = express.Router()

router.route('/search').get(searchTracks)

router.route('/liked').get(getLikedTracks)

router.route('/top').get(getTopTracks)

router.route('/recent').get(getRecentTracks)

export default router
