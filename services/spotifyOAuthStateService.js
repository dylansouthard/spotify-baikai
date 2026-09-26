import {
  createHash,
  randomBytes,
} from 'node:crypto'

const DEFAULT_TTL_MS =
  10 * 60 * 1000

const hashState = (state) =>
  createHash('sha256')
    .update(state, 'utf8')
    .digest('hex')

export const createSpotifyOAuthStateService = ({
  states,
  now = Date.now,
  ttlMs = DEFAULT_TTL_MS,
}) => {
  const create = (userId) => {
    if (!userId) {
      throw new Error(
        'userId is required to create Spotify OAuth state'
      )
    }

    const state =
      randomBytes(32).toString('base64url')

    const createdAt = now()

    states.create({
      stateHash: hashState(state),
      userId,
      expiresAt:
        createdAt + ttlMs,
    })

    return state
  }

  const consume = (state) => {
    if (!state) return null

    return states.consume({
      stateHash: hashState(state),
      now: now(),
    })
  }

  return {
    create,
    consume,
  }
}