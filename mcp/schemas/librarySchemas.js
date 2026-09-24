import * as z from 'zod/v4'
import { timeRanges, defaultLimit, defaultOffset} from './conveniences.js'

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

