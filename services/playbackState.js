import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const playbackError = (message, reason, status = 502) => Object.assign(new Error(message), { reason, status })

// An account-wide filesystem lock also covers separate workers on one host.
// Never expire a live lock: stealing it could race an outstanding Spotify write.
export async function withPlaybackSession(userId, run) {
  const directory = process.env.SPOTIFY_PLAYBACK_STATE_DIR || fileURLToPath(new URL('../.spotify-playback/', import.meta.url))
  const key = createHash('sha256').update(userId).digest('hex')
  const lock = path.join(directory, `${key}.lock`)
  const state = path.join(directory, `${key}.json`)
  await mkdir(directory, { recursive: true, mode: 0o700 })
  try {
    await mkdir(lock, { mode: 0o700 })
  } catch (error) {
    if (error.code === 'EEXIST') throw playbackError('Another playback request is in progress for this account.', 'PLAYBACK_BUSY', 409)
    throw error
  }
  try {
    await writeFile(path.join(lock, 'owner.json'), JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }), { mode: 0o600 })
    return await run({
      async load() {
        let value
        try { value = JSON.parse(await readFile(state, 'utf8')) } catch (error) {
          if (error.code === 'ENOENT') return null
          throw playbackError('Cannot read playback buffer metadata.', 'BUFFER_STATE_ERROR')
        }
        if (!/^[A-Za-z0-9]{22}$/.test(value?.playlist_id)) throw playbackError('Invalid playback buffer metadata.', 'BUFFER_STATE_ERROR')
        return value.playlist_id
      },
      async save(playlistId) {
        const temporary = `${state}.${randomUUID()}.tmp`
        try {
          await writeFile(temporary, JSON.stringify({ playlist_id: playlistId }), { mode: 0o600 })
          await rename(temporary, state)
        } finally {
          await rm(temporary, { force: true })
        }
      },
    })
  } finally {
    await rm(lock, { recursive: true, force: true })
  }
}
