import express from 'express'

import { searchAlbums } from '../controllers/albumController.js'

const router = express.Router()

router.route('/search').get(searchAlbums)

export default router
