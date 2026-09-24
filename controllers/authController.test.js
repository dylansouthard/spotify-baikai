import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { createServer } from 'node:http'
import { once } from 'node:events'
import express from 'express'
import axios from 'axios'
import authRoutes from '../routes/authRoutes.js'
import errorHandler from '../middleware/errorHandler.js'
import tokenOpenAIDiagnostics from '../middleware/tokenOpenAIDiagnostics.js'

// Only synthetic credentials are used; Axios never connects to Spotify.
const code = 'test-auth-code-do-not-log/+=&'
const refresh = 'test-refresh-token-do-not-log/+=&'
const access = 'test-access-token-do-not-log/+=&'
const secret = 'test-server-secret-do-not-log/+=&'
const clientSecret = 'test-incoming-secret-do-not-log/+=&'
const authorization = 'Basic test-authorization-do-not-log'
const callback = 'https://chat.openai.com/aip/test/oauth/callback'
const logs = [], calls = []
const original = { adapter: axios.defaults.adapter, log: console.log, error: console.error }
const env = Object.fromEntries(['SPOTIFY_ID', 'SPOTIFY_SECRET', 'OPENAI_CALLBACK', 'SPOTIFY_OAUTH_DEBUG'].map(key => [key, process.env[key]]))
let server, base, respond

before(async () => {
  const app = express()
  app.use('/token-openai', tokenOpenAIDiagnostics)
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use('/', authRoutes)
  app.use(errorHandler)
  server = createServer(app)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  base = `http://127.0.0.1:${server.address().port}`
  axios.defaults.adapter = async config => {
    calls.push(config)
    return respond(config)
  }
  console.log = (event, fields) => logs.push({ event, fields })
  console.error = (event, fields) => logs.push({ event, fields })
})

beforeEach(() => {
  logs.length = calls.length = 0
  process.env.SPOTIFY_ID = 'test-server-client'
  process.env.SPOTIFY_SECRET = secret
  process.env.OPENAI_CALLBACK = callback
  process.env.SPOTIFY_OAUTH_DEBUG = '1'
  respond = config => ({
    status: 200, statusText: 'OK', headers: { 'content-type': 'application/json' }, config,
    data: { access_token: access, refresh_token: refresh, token_type: 'Bearer', expires_in: 3600, scope: 'user-top-read' },
  })
})

after(async () => {
  axios.defaults.adapter = original.adapter
  console.log = original.log
  console.error = original.error
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  if (server) await new Promise(resolve => server.close(resolve))
})

const request = (body, path = '/token-openai') => fetch(`${base}${path}`, {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: authorization },
  body: new URLSearchParams({ client_id: 'incoming-client', client_secret: clientSecret, ...body }),
})
const fields = event => logs.find(log => log.event === `[token-openai] ${event}`)?.fields
const noSecrets = () => {
  const output = JSON.stringify(logs)
  for (const value of [code, refresh, access, secret, clientSecret, authorization, authorization.split(' ')[1]]) {
    for (const representation of [value, encodeURIComponent(value)]) {
      assert.equal(output.includes(representation), false, 'A credential appeared in diagnostic logs')
    }
  }
}

test('code exchange preserves the supplied redirect and logs stages without credentials', async () => {
  const response = await request({ grant_type: 'authorization_code', code, redirect_uri: callback })
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /application\/json/)
  assert.deepEqual(await response.json(), {
    access_token: access, refresh_token: refresh, expires_in: 3600, token_type: 'Bearer', scope: 'user-top-read',
  })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].method, 'post')
  assert.equal(calls[0].url, 'https://accounts.spotify.com/api/token')
  assert.match(calls[0].headers.get('Content-Type'), /application\/x-www-form-urlencoded/)
  assert.deepEqual(Object.fromEntries(new URLSearchParams(calls[0].data)), {
    grant_type: 'authorization_code', code, redirect_uri: callback,
    client_id: 'test-server-client', client_secret: secret,
  })
  assert.ok(fields('request received'))
  assert.equal(fields('request parsed').redirectUri, callback)
  assert.equal(fields('request parsed').redirectMatchesLogin, true)
  assert.equal(fields('calling Spotify token endpoint').spotifyRedirectUri, callback)
  assert.equal(fields('Spotify token response').status, 200)
  assert.equal(fields('Spotify token response').hasAccessToken, true)
  assert.equal(fields('returning response').status, 200)
  assert.equal(fields('returning response').hasTokenType, true)
  assert.match(fields('returning response').contentType, /application\/json/)
  assert.equal(fields('response finished').status, 200)
  assert.equal(new Set(logs.map(log => log.fields.requestId)).size, 1)
  noSecrets()
})

test('refresh uses the refresh grant without a code or redirect; token rotation is optional', async () => {
  respond = config => ({ status: 200, headers: {}, config, data: { access_token: access, token_type: 'Bearer', expires_in: 3600 } })
  const response = await request({ grant_type: 'refresh_token', refresh_token: refresh })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { access_token: access, token_type: 'Bearer', expires_in: 3600 })
  assert.deepEqual(Object.fromEntries(new URLSearchParams(calls[0].data)), {
    grant_type: 'refresh_token', refresh_token: refresh, client_id: 'test-server-client', client_secret: secret,
  })
  assert.equal(fields('request parsed').grantType, 'refresh_token')
  assert.equal(fields('calling Spotify token endpoint').spotifyRedirectUri, null)
  assert.equal(fields('returning response').hasRefreshToken, false)
  noSecrets()
})

for (const [grantType, status, errorName] of [['authorization_code', 400, 'invalid_grant'], ['refresh_token', 401, 'invalid_client']]) {
  test(`${grantType}: Spotify ${status} is logged separately from existing outgoing 400 JSON`, async () => {
    respond = config => {
      throw new axios.AxiosError('Request failed with status code ' + status, 'ERR_BAD_REQUEST', config, {}, {
        status, statusText: status === 400 ? 'Bad Request' : 'Unauthorized',
        data: { error: errorName, error_description: `Rejected ${code} ${refresh} ${secret} ${clientSecret} ${encodeURIComponent(code)}` },
      })
    }
    const response = await request({ grant_type: grantType, code, refresh_token: refresh, redirect_uri: callback })
    assert.equal(response.status, 400)
    assert.match(response.headers.get('content-type'), /application\/json/)
    const body = await response.json()
    assert.equal(body.error, true)
    assert.equal(body.message.error, errorName)
    assert.equal(body.type, 'TOKEN_REFRESH')
    assert.equal(fields('token exchange failed').spotifyStatus, status)
    assert.equal(fields('token exchange failed').spotifyError, errorName)
    assert.equal(fields('token exchange failed').stage, 'spotify_token_request')
    assert.equal(fields('returning response').status, 400)
    assert.equal(fields('returning response').spotifyStatus, status)
    assert.equal(fields('returning response').hasAccessToken, false)
    assert.equal(logs.filter(log => log.event.endsWith('token exchange failed')).length, 1)
    noSecrets()
  })
}

test('network failure has no Spotify HTTP status and still reports the actual JSON response', async () => {
  respond = config => { throw new axios.AxiosError('socket hang up', 'ECONNRESET', config) }
  const response = await request({ grant_type: 'refresh_token', refresh_token: refresh })
  assert.equal(response.status, 400)
  await response.json()
  assert.equal(fields('token exchange failed').spotifyStatus, null)
  assert.equal(fields('token exchange failed').errorCode, 'ECONNRESET')
  assert.equal(fields('response finished').status, 400)
  noSecrets()
})

test('non-Axios exception logs its type and sanitized stack frames', async () => {
  respond = () => {
    const error = new TypeError(`Local failure: ${code} ${clientSecret}`)
    error.stack = `${error.name}: ${error.message}\n    at fakeAdapter (${secret}:1:2)`
    throw error
  }
  const response = await request({ grant_type: 'authorization_code', code, redirect_uri: callback })
  assert.equal(response.status, 400)
  await response.json()
  assert.equal(fields('token exchange failed').errorType, 'TypeError')
  assert.match(fields('token exchange failed').stack, /at fakeAdapter/)
  noSecrets()
})

test('malformed JSON is logged before the controller without echoing the parser secret', async () => {
  const parserSecret = 'unparsed-secret-never-log'
  const response = await fetch(`${base}/token-openai`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: `{"code":"${parserSecret}",}`,
  })
  assert.equal(response.status, 500) // Preserve the existing error middleware's status behavior.
  await response.json()
  assert.equal(calls.length, 0)
  assert.equal(fields('token exchange failed').stage, 'parse_request')
  assert.equal(fields('returning response').status, 500)
  assert.match(fields('returning response').contentType, /application\/json/)
  assert.equal(JSON.stringify(logs).includes(parserSecret), false)
  noSecrets()
})

test('redirect mismatch is observable without rewriting the supplied URI', async () => {
  const supplied = 'https://chat.openai.com/aip/different/oauth/callback'
  const response = await request({ grant_type: 'authorization_code', code, redirect_uri: supplied })
  await response.json()
  assert.equal(new URLSearchParams(calls[0].data).get('redirect_uri'), supplied)
  assert.equal(fields('request parsed').redirectMatchesLogin, false)
  assert.equal(fields('request parsed').configuredLoginRedirectUri, callback)
  noSecrets()
})

test('login logs the actual configured redirect and preserves its state/redirect behavior', async () => {
  const response = await fetch(`${base}/login-openai?state=test-state&redirect_uri=${encodeURIComponent(callback)}`, { redirect: 'manual' })
  assert.equal(response.status, 302)
  const location = new URL(response.headers.get('location'))
  assert.equal(location.searchParams.get('redirect_uri'), callback)
  assert.equal(location.searchParams.get('state'), 'test-state')
  assert.equal(logs[0].fields.spotifyRedirectUri, callback)
  assert.equal(logs[0].fields.suppliedRedirectUri, callback)
  assert.equal(calls.length, 0)
  noSecrets()
})

test('secret fields and query/fragment credentials in diagnostics are redacted', async () => {
  respond = () => {
    throw Object.assign(new Error('access_token=unlisted-token refresh_token="unlisted refresh" Authorization: Bearer unlisted-bearer'), {
      response: { status: 400, data: { error: 'invalid_grant', error_description: `Rejected ${authorization}` } },
    })
  }
  const response = await request({ grant_type: 'authorization_code', code, redirect_uri: `${callback}?code=unlisted-query#unlisted-fragment` })
  await response.json()
  for (const value of ['unlisted-token', 'unlisted refresh', 'unlisted-bearer', 'unlisted-query', 'unlisted-fragment']) {
    assert.equal(JSON.stringify(logs).includes(value), false)
  }
  noSecrets()
})

test('diagnostics can be disabled without changing the exchange', async () => {
  process.env.SPOTIFY_OAUTH_DEBUG = '0'
  const response = await request({ grant_type: 'refresh_token', refresh_token: refresh })
  assert.equal(response.status, 200)
  await response.json()
  assert.equal(calls.length, 1)
  assert.equal(logs.length, 0)
})
