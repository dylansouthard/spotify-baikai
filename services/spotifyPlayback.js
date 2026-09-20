import axios from 'axios'
import { setTimeout as sleep } from 'node:timers/promises'
import { API_CONST } from '../constants/apiConstants.js'
import { playbackError, withPlaybackSession } from './playbackState.js'

export const BUFFER_NAME = 'spotify-baikai playback buffer'
export const BUFFER_DESCRIPTION = 'Managed by spotify-baikai (playback-buffer:v1). Contents are replaced for playback; do not edit.'
const POLL_DELAYS = [0, 300, 600]

export const summarizeDevice = (device) => device ? ({
  id: device.id ?? null, name: device.name, type: device.type,
  is_active: device.is_active, is_restricted: device.is_restricted,
}) : null

export function playbackSnapshot(state, uris, deviceId, contextUri) {
  const requested = new Set(uris)
  const item = state?.item
  const identities = [item?.uri, item?.id && `spotify:track:${item.id}`, item?.linked_from?.uri,
    item?.linked_from?.id && `spotify:track:${item.linked_from.id}`]
  const trackMatches = identities.some(uri => requested.has(uri))
  const deviceMatches = deviceId === undefined || state?.device?.id === deviceId
  const contextMatches = contextUri === undefined || state?.context?.uri === contextUri
  return {
    verified: Boolean(state?.device && state?.is_playing === true && trackMatches && deviceMatches && contextMatches),
    player_exists: Boolean(state?.device), is_playing: state?.is_playing === true,
    current_uri: item?.uri ?? null, current_id: item?.id ?? null,
    device_id: state?.device?.id ?? null, device_matches: deviceMatches, track_matches: trackMatches,
    context_uri: state?.context?.uri ?? null, context_matches: contextMatches,
  }
}

export async function runPlayback({ mode, value, deviceId, headers, log }) {
  const signal = AbortSignal.timeout(20_000)
  const result = {
    ok: false, requested_mode: mode, effective_mode: null, spotify_status: null,
    raw_spotify_status: null, fallback_used: false, fallback_reason: null, verification: null,
  }
  let stage = 'identify_user'
  const request = async (method, endpoint, data, params, statuses = [200]) => {
    const response = await axios.request({
      method, url: `${API_CONST.SF_API_BASE}${endpoint}`, data, params,
      headers: { ...headers, 'Content-Type': 'application/json' }, timeout: 2500, signal,
    })
    if (!statuses.includes(response.status)) {
      throw Object.assign(playbackError(`Unexpected Spotify status: ${response.status}`, 'UNEXPECTED_SPOTIFY_STATUS'), { response })
    }
    return response
  }
  const verify = async (contextUri) => {
    let snapshot
    for (let attempt = 0; attempt < POLL_DELAYS.length; attempt++) {
      if (POLL_DELAYS[attempt]) await sleep(POLL_DELAYS[attempt], undefined, { signal })
      // GET /me/player has no device_id parameter. Compare the returned device.
      const response = await request('get', 'me/player', undefined, undefined, [200, 204])
      snapshot = { ...playbackSnapshot(response.status === 200 ? response.data : null, value, deviceId, contextUri), attempts: attempt + 1 }
      log('verification', { stage, spotify_status: response.status, verification: snapshot })
      if (snapshot.verified) return snapshot
    }
    return snapshot
  }
  const findBuffer = async (userId, store) => {
    let id = await store.load()
    if (id) {
      let playlist
      try { playlist = (await request('get', `playlists/${id}`)).data } catch (error) {
        if (error.response?.status !== 404) throw error
      }
      if (playlist) {
        if (playlist.owner?.id !== userId || playlist.public !== false || playlist.name !== BUFFER_NAME) {
          throw playbackError('The saved playback buffer is no longer an owned private buffer playlist.', 'BUFFER_CHANGED')
        }
        return id
      }
      id = null
    }
    // Rediscover our marked playlist after a restart/lost metadata, rather than
    // making a new playlist on each fallback. Do not touch lookalike playlists.
    for (let page = 0; page < 20; page++) {
      const { data } = await request('get', 'me/playlists', undefined, { limit: 50, offset: page * 50 })
      if (!Array.isArray(data?.items)) throw playbackError('Invalid Spotify playlist listing.', 'INVALID_SPOTIFY_RESPONSE')
      const match = data.items.find(p => p?.owner?.id === userId && p.public === false && p.name === BUFFER_NAME && p.description === BUFFER_DESCRIPTION)
      if (match) { id = match.id; break }
      if (!data.next) {
        const created = await request('post', 'me/playlists', { name: BUFFER_NAME, public: false, description: BUFFER_DESCRIPTION }, undefined, [201])
        id = created.data?.id
        break
      }
    }
    if (!id || !/^[A-Za-z0-9]{22}$/.test(id)) throw playbackError('Could not safely find or create a playback buffer within the search limit.', 'BUFFER_UNAVAILABLE')
    await store.save(id)
    return id
  }

  try {
    const user = (await request('get', 'me')).data
    if (typeof user?.id !== 'string' || !user.id) throw playbackError('Spotify did not return a user ID.', 'INVALID_SPOTIFY_RESPONSE')
    stage = 'lock_account'
    return await withPlaybackSession(user.id, async store => {
      stage = 'play'
      const params = deviceId === undefined ? undefined : { device_id: deviceId }
      const response = await request('put', 'me/player/play', { [mode]: value }, params, [204])
      result.spotify_status = response.status
      log('response', { stage, spotify_status: response.status })
      if (mode === 'context_uri') return { ...result, ok: true, outcome: 'accepted', effective_mode: mode }
      result.raw_spotify_status = response.status
      stage = 'verify_raw'
      result.verification = await verify()
      if (result.verification.verified) return { ...result, ok: true, outcome: 'raw_verified', effective_mode: 'uris' }

      result.raw_verification = result.verification
      result.fallback_used = true
      result.fallback_reason = 'RAW_PLAYBACK_NOT_VERIFIED'
      log('fallback', { spotify_status: 204, verification: result.verification, fallback_triggered: true, fallback_mode: 'playlist_context' })
      stage = 'prepare_fallback'
      const playlistId = await findBuffer(user.id, store)
      result.playlist_id = playlistId
      // Replace first, then append chunks, awaiting each write to preserve order.
      for (let offset = 0; offset < value.length; offset += 100) {
        await request(offset === 0 ? 'put' : 'post', `playlists/${playlistId}/items`, { uris: value.slice(offset, offset + 100) }, undefined, offset === 0 ? [200] : [201])
      }
      const contextUri = `spotify:playlist:${playlistId}`
      stage = 'play_fallback'
      await request('put', 'me/player/play', { context_uri: contextUri }, params, [204])
      stage = 'verify_fallback'
      result.verification = await verify(contextUri)
      if (!result.verification.verified) throw playbackError('Spotify accepted fallback playback, but the requested track was not observed playing.', 'PLAYBACK_NOT_VERIFIED')
      return { ...result, ok: true, outcome: 'fallback_verified', effective_mode: 'playlist_context_fallback' }
    })
  } catch (error) {
    const upstream = error.response?.data
    const status = error.response?.status
    const failure = {
      ...result, error: true, type: 'PLAY', outcome: result.fallback_used ? 'fallback_failed' : 'api_error', stage,
      message: upstream?.error?.message || (error.reason ? error.message : 'Spotify playback request failed'),
      reason: upstream?.error?.reason || error.reason || error.code || 'PLAYBACK_ERROR',
      spotify_status: status ?? result.spotify_status, spotify_response: upstream ?? null,
    }
    // Do not mask the original error if device discovery also fails.
    if (failure.reason === 'NO_ACTIVE_DEVICE' || status === 404 || failure.reason === 'PLAYBACK_NOT_VERIFIED') {
      try {
        const devices = await request('get', 'me/player/devices')
        if (!Array.isArray(devices.data?.devices)) throw playbackError('Invalid Spotify device response.', 'INVALID_SPOTIFY_RESPONSE')
        failure.devices = devices.data.devices.map(summarizeDevice)
      } catch (deviceError) {
        failure.device_diagnostics = { spotify_status: deviceError.response?.status ?? null, reason: deviceError.response?.data?.error?.reason || deviceError.code || 'DEVICE_LOOKUP_FAILED' }
      }
    }
    return {
      ...failure, http_status: error.status || (status >= 400 && status <= 599 ? status : 502),
      retry_after: error.response?.headers?.['retry-after'],
    }
  }
}
