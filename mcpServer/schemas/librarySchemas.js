import * as z from 'zod/v4'
import { timeRanges, defaultLimit, defaultOffset} from './conveniences.js'
import { paginatedResultsSchema } from './shared.js'


const trackSchema = z.object({
    title: z.string(),
    artist: z.string()
})

export const topTracksResultSchema = z.object({
    tracks: z.array(trackSchema)
})

export const topArtistsResultsSchema = z.object({
    artists: z.array(z.string())
})

const likedTrackSchema = trackSchema.extend({
    added_at: z.string(),
})

export const likedTracksResultSchema = z.object({
    tracks: z.array(likedTrackSchema)
})

export const topItemsInputSchema = z.object({
    time_range: timeRanges.optional(),
    limit: defaultLimit.optional(),
    offset: defaultOffset.optional()
}).strict()

const savedAlbumSchema = z.object({
    name: z.string(),
    artist: z.string(),
    added_at: z.string()
})

export const savedAlbumsResultsSchema = paginatedResultsSchema.extend({
    albums: z.array(savedAlbumSchema)
})

export const followedArtistInputSchema = z.object({
    limit: defaultLimit,
    after: z.string().optional().describe(
    'Pagination cursor containing a Spotify artist ID. Omit for the first page. For subsequent pages, pass the after value returned by the previous call.'
  )
}).strict()

export const followedArtistsResultSchema = z.object({
    total: z.number().int().min(0),
    after: z.string().describe(
    'Pagination cursor containing a Spotify artist ID used to fetch the next page.'
  ),
    artists: z.array(z.string())
})
