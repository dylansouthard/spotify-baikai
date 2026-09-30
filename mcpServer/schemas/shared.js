import * as z from 'zod/v4'
import { defaultLimit, defaultOffset} from './conveniences.js'

export const paginatedResultsSchema = z.object({
    total: z.number().int().min(0),
    nextOffset: z.number().int().min(0).nullable().describe('The offset to be passed into subsequent queries to get the next page'),
})

export const defaultLimitOffsetSchema = z.object({
    limit:defaultLimit,
    offset:defaultOffset
})

export const statusResultSchema = z.object({
    status:z.number().int(),
    message:z.string()
})


export const trackSchema = z.object({
    title:z.string(),
    artist:z.string()
})

export const workflowErrorSchema = z.object({
    field: z.string(),
    message: z.string()
})

export const yearSchema = z.string().regex(/^\d{4}$/)

export const savedAlbumSchema = z.object({
    name: z.string(),
    artist: z.string(),
    added_at: z.string()
})

export const savedItemSchema = z.object({
    name: z.string(),
    artist: z.string(),
    added_at: z.string()
})

export const deviceIdSchema = z.string().describe(
    'Optional Spotify device ID. If omitted, Spotify targets the user’s currently active device.'
)

export const spotifyTrackUriSchema = z.string().regex(
      /^spotify:track:[A-Za-z0-9]{22}$/,
      'Must be a Spotify track URI'
    )

export const addedAtSchema = z.string().describe(
    'UTC timestamp when the item was saved to the user’s Spotify library; not its release date or last-played time.'
)