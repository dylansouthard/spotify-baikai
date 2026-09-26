// import './util/errorHandler.js'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { albumRoutes, artistRoutes, authRoutes, playerRoutes, playlistRoutes, trackRoutes, tasteProfileRoutes } from './routes/routes.js'
import errorHandler from './middleware/errorHandler.js'
import tokenOpenAIDiagnostics from './middleware/tokenOpenAIDiagnostics.js'
import { localhostHostValidation, localhostOriginValidation } from '@modelcontextprotocol/express'
import { handleMcpRequest, handleMcpJsonParseError } from './mcpServer/handler.js'
import { runMigrations } from './db/migrate.js'
import { validateTokenCryptoConfig } from './services/tokenCryptoService.js'
import { requireMcpAuth } from './middleware/mcpAuth.js'
import { hostHeaderValidation, originValidation } from '@modelcontextprotocol/express'
import { appendFileSync } from 'fs'
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
// Register before body parsers so malformed token requests are diagnosed too.
app.use('/token-openai', tokenOpenAIDiagnostics)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(handleMcpJsonParseError)

app.use('/mcp', (req, res, next) => {

  const startedAt = Date.now()

  res.on('finish', () => {

    const entry = {
      time: new Date().toISOString(),

      method: req.method,
      originalUrl: req.originalUrl,

      userAgent:
        req.headers['user-agent'],

      contentType:
        req.headers['content-type'],

      accept:
        req.headers.accept,

      protocolVersion:
        req.headers['mcp-protocol-version'],

      mcpMethod:
        req.headers['mcp-method'],

      hasAuthorization:
        Boolean(req.headers.authorization),

      bodyMethod:
        req.body?.method,

      hasMeta:
        Boolean(req.body?.params?._meta),

      status:
        res.statusCode,

      durationMs:
        Date.now() - startedAt,
    }

    appendFileSync(
      new URL('./mcp-debug.log', import.meta.url),
      `${JSON.stringify(entry)}\n`
    )

  })

  next()

})

app.use('/mcp', (req, res, next) => {

  const entry = {
    time: new Date().toISOString(),
    method: req.method,
    originalUrl: req.originalUrl,
    url: req.url,
    host: req.headers.host,
    forwardedProto:
      req.headers['x-forwarded-proto'],
    contentType:
      req.headers['content-type'],
    protocolVersion:
      req.headers['mcp-protocol-version'],
    mcpMethod:
      req.headers['mcp-method'],
    bodyMethod:
      req.body?.method,
    hasMeta:
      Boolean(req.body?.params?._meta),
  }

  appendFileSync(
    new URL('./mcp-debug.log', import.meta.url),
    `${JSON.stringify(entry, null, 2)}\n`
  )

  next()

})
app.all(
  '/mcp',
  hostHeaderValidation([
    'spotify-baikai.dylansouthard.info',
    'localhost',
    '127.0.0.1',
  ]),
  originValidation([
    'spotify-baikai.dylansouthard.info',
    'localhost',
    '127.0.0.1',
  ]),
  requireMcpAuth,
  handleMcpRequest
)

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

app.use('/', authRoutes)
app.use('/artists', artistRoutes)
app.use('/tracks', trackRoutes)
app.use('/player', playerRoutes)
app.use('/playlists', playlistRoutes)
app.use('/albums', albumRoutes)
app.use('/taste-profile', tasteProfileRoutes)
app.use(errorHandler)

validateTokenCryptoConfig()
const migrations = runMigrations()

if (migrations.length) {
  console.log(
    `Applied database migrations: ${migrations.join(', ')}`
  )
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
