import { randomUUID } from 'node:crypto'

const secretFields = ['client_secret', 'code', 'refresh_token', 'access_token']

// TEMPORARY OAuth diagnostics. Set SPOTIFY_OAUTH_DEBUG=0 to silence these logs.
// Never pass request/response bodies, headers, or Axios error objects to console.
export function createOAuthLogger(req, label = 'token-openai') {
  const requestId = randomUUID()
  const secrets = new Set()
  const remember = data => {
    for (const field of secretFields) {
      const values = Array.isArray(data?.[field]) ? data[field] : [data?.[field]]
      for (const value of values) {
        if (typeof value !== 'string' || !value) continue
        secrets.add(value)
        // Invalid Unicode in a request must not make diagnostic logging throw.
        try {
          secrets.add(encodeURIComponent(value))
          secrets.add(encodeURIComponent(value).replace(/%20/g, '+'))
        } catch { /* The literal and JSON-escaped forms are still redacted. */ }
        secrets.add(JSON.stringify(value).slice(1, -1))
      }
    }
  }
  const safe = value => {
    if (value == null || typeof value === 'boolean' || typeof value === 'number') return value ?? null
    if (typeof value !== 'string') return '[non-scalar omitted]'
    let text = value
    for (const secret of [...secrets].sort((a, b) => b.length - a.length)) {
      text = text.split(secret).join('[REDACTED]')
    }
    return text
      .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9+/_=.-]+/gi, '[REDACTED authorization]')
      .replace(/(["']?(?:client_secret|code|refresh_token|access_token|authorization)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s&,;}\]]+)/gi, '$1[REDACTED]')
      .slice(0, 6000)
  }
  const write = (level, event, metadata) => {
    if (process.env.SPOTIFY_OAUTH_DEBUG === '0') return
    remember(req.body)
    remember(req.query)
    remember({ client_secret: process.env.SPOTIFY_SECRET })
    const authorization = req.headers?.authorization
    if (typeof authorization === 'string') {
      secrets.add(authorization)
      const credential = authorization.split(/\s+/).slice(1).join(' ')
      if (credential) secrets.add(credential)
    }
    const fields = { requestId, grantType: req.body?.grant_type, ...metadata }
    console[level](`[${label}] ${event}`, Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, safe(value)])
    ))
  }
  return {
    remember,
    log: (event, metadata = {}) => write('log', event, metadata),
    error: (error, metadata = {}) => {
      remember(error?.response?.data)
      write('error', 'token exchange failed', {
        ...metadata,
        spotifyStatus: error?.response?.status ?? metadata.spotifyStatus,
        spotifyStatusText: error?.response?.statusText,
        spotifyError: error?.response?.data?.error,
        spotifyErrorDescription: error?.response?.data?.error_description,
        // JSON parser messages can quote unparsed credentials we cannot collect.
        message: metadata.stage === 'parse_request' ? 'Request body parsing failed' : error?.message,
        errorType: error?.name ?? typeof error,
        errorCode: error?.code,
        isAxiosError: error?.isAxiosError === true,
        stack: error?.isAxiosError ? undefined : error?.stack?.split('\n').filter(line => /^\s+at /.test(line)).join('\n'),
      })
    },
  }
}

export function redirectForLog(value) {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    // Callback query strings/fragments may themselves contain credentials.
    return `${url.origin}${url.pathname}${url.search ? '?[REDACTED]' : ''}${url.hash ? '#[REDACTED]' : ''}`
  } catch {
    return '[invalid redirect URI]'
  }
}

export const tokenFields = data => ({
  hasAccessToken: Boolean(data?.access_token),
  hasRefreshToken: Boolean(data?.refresh_token),
  hasTokenType: Boolean(data?.token_type),
  hasExpiresIn: data?.expires_in != null,
})

export default function tokenOpenAIDiagnostics(req, res, next) {
  const logger = createOAuthLogger(req)
  const started = Date.now()
  let stage = 'parse_request'
  let spotifyStatus = null
  let responseFields = tokenFields(null)
  let errorLogged = false
  const metadata = () => ({ stage, spotifyStatus, durationMs: Date.now() - started })
  res.locals.tokenOpenAI = {
    setStage: value => { stage = value },
    setSpotifyStatus: value => { spotifyStatus = value },
    remember: logger.remember,
    log: (event, fields) => logger.log(event, { ...metadata(), ...fields }),
    fail: error => {
      if (errorLogged) return
      errorLogged = true
      logger.error(error, metadata())
    },
  }
  logger.log('request received', { ...metadata(), method: req.method, contentType: req.get('Content-Type') })

  // Observe JSON from both the controller and the existing error middleware.
  const json = res.json
  res.json = function (body) {
    logger.remember(body)
    responseFields = tokenFields(body)
    return json.call(this, body)
  }
  const outgoing = () => ({
    ...metadata(), status: res.statusCode,
    contentType: res.getHeader('Content-Type') ?? null,
    ...responseFields,
  })
  const writeHead = res.writeHead
  res.writeHead = function (...args) {
    const result = writeHead.apply(this, args)
    logger.log('returning response', outgoing())
    return result
  }
  res.once('finish', () => logger.log('response finished', outgoing()))
  res.once('close', () => {
    if (!res.writableFinished) logger.log('connection closed before response finished', {
      ...outgoing(), headersSent: res.headersSent,
    })
  })
  next()
}
