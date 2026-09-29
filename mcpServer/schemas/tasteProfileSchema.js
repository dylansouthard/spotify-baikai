import * as z from 'zod/v4'
import {yearSchema, workflowErrorSchema, savedItemSchema} from './shared.js'
import { timeRanges } from './conveniences.js'


const tpSavedItemsSchema = z.record(
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

const tpSavedItemsResultsSchema = z.object({
    total: z.number().int(),
    most_recent: z.array(savedItemSchema),
    sampled_items_phase_order: z.literal('recent_to_oldest')
    .default('recent_to_oldest'),
    sampled_items: z.record(
        z.string(),
        z.object({
            offset: z.number().int(),
            items:tpSavedItemsSchema
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
    saved_albums: tpSavedItemsResultsSchema,
    saved_tracks: tpSavedItemsResultsSchema,
    followed_artists: tpFollowedArtistSchema,
    errors: z.array(workflowErrorSchema)
})



