import './util/errorHandler.js'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import apiRoutes from './routes/api.js'
import errorHandler from './middleware/errorHandler.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Enable CORS for manifest and OpenAPI
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  next()
})

// Serve ai-plugin.json with correct Content-Type
app.get('/.well-known/ai-plugin.json', (req, res) => {
  res.type('application/json')
  res.sendFile(path.join(__dirname, '.well-known', 'ai-plugin.json'))
})

// Serve OpenAPI YAML with correct Content-Type
app.get('/openapi.yaml', (req, res) => {
  res.type('application/yaml') // note:'text/yaml' if this doesn't work
  res.sendFile(path.join(__dirname, 'openapi.yaml'))
})

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacy.html')) // or 'public/privacy.html'
})

app.use('/', apiRoutes)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
