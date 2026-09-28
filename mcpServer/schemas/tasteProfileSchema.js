import * as z from 'zod/v4'
import {yearSchema, workflowErrorSchema, savedAlbumSchema} from './shared.js'
import { timeRanges } from './conveniences.js'


const tpSavedAlbumsSchema = z.record(
    yearSchema,
    z.record(
        z.string(),
        z.array(z.string())
    )
)

const tpTracksByArtistSchema = z.record(
    z.string(),
    z.array(z.string())
)

const tpTopTracksSchema = z.record(
    timeRanges,
    tpTracksByArtistSchema
)

const tpTopArtistsSchema = z.record(
    timeRanges,
    z.array(z.string())
)

const tpSavedAlbumsResultsSchema = z.object({
    total: z.number().int(),
    most_recent: z.array(savedAlbumSchema),
    sampled_albums: z.record(
        z.string(),
        z.object({
            offset: z.number().int(),
            albums:tpSavedAlbumsSchema
        })
    )
})

const tpFollowedArtistSchema = z.object ({
    sample_size:z.number().int(),
    total:z.number().int(),
    artists: z.array(z.string()),
})

export const tasteProfileResultSchema = z.object({
    top_artists: tpTopArtistsSchema,
    top_tracks: tpTopTracksSchema,
    saved_albums:tpSavedAlbumsResultsSchema,
    followed_artists: tpFollowedArtistSchema,
    errors: z.array(workflowErrorSchema)
})



