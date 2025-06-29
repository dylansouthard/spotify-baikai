import express from 'express'
import { getTopArtists } from '../controllers/artistController.js'
const router = express.Router()

router.route('/top').get(getTopArtists)

export default router
