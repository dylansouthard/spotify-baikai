import express from 'express'
import { getUserTasteProfile } from '../controllers/profileController.js'

const router = express.Router()

router.route('/').get(getUserTasteProfile)

export default router
