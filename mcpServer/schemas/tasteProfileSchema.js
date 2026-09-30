import * as z from 'zod/v4'
import {
    yearSchema,
    workflowErrorSchema,
    savedItemSchema
} from './shared.js'

import { timeRanges } from './conveniences.js'


const tpSavedItemsSchema = z.record(
    yearSchema,
    z.record(
        z.string(),
        z.array(z.string())
    )
).describe(
    'Saved library items grouped by year saved, then primary artist. ' +
    'Year keys represent when the item was saved to Spotify, not its release year.'
)


const tpTracksByArtistSchema = z.record(
    z.string(),
    z.array(z.string())
).describe(
    'Tracks grouped by primary artist. Arrays contain track titles.'
)


const tpTopTracksSchema = z.record(
    timeRanges,
    tpTracksByArtistSchema
).describe(
    'Spotify top tracks based on calculated affinity, not raw play counts. ' +
    'Tracks are grouped by primary artist, so Spotify\'s original global item order is not preserved.'
)


const tpTopArtistsSchema = z.record(
    timeRanges,
    z.array(z.string())
).describe(
    'Spotify top artists based on calculated affinity, not raw play counts. ' +
    'Array position reflects Spotify API order; Spotify does not expose an affinity score or documented rank.'
)


const tpSavedItemsResultsSchema = z.object({

    total: z.number()
        .int()
        .describe(
            'Total number of items reported by Spotify before taste-profile sampling or filtering.'
        ),

    most_recent: z.array(savedItemSchema)
        .describe(
            'Most recently saved library items, including their save timestamps. ' +
            'Save time is not release time or last-played time.'
        ),

    sampled_items_phase_order: z.literal('recent_to_oldest')
        .default('recent_to_oldest')
        .describe(
            'Sampling phases progress from more recently saved items toward older saved items.'
        ),

    sampled_items: z.record(
        z.string(),
        z.object({

            offset: z.number()
                .int()
                .describe(
                    'Raw Spotify library offset used to fetch this sample. ' +
                    'It represents position in Spotify\'s saved-item list, not a date.'
                ),

            items: tpSavedItemsSchema
        })
    ).describe(
        'Samples drawn from configurable regions of the user\'s saved-item history. ' +
        'phase_N labels are ordinal sampling regions, not fixed calendar periods.'
    )

})


const tpFollowedArtistSchema = z.object({

    sample_size: z.number()
        .int()
        .describe(
            'Number of followed artists included in this taste-profile sample.'
        ),

    total: z.number()
        .int()
        .describe(
            'Total number of artists followed by the user on Spotify.'
        ),

    artists: z.array(z.string())
        .describe(
            'Sample of artists the user follows on Spotify. Following an artist does not imply current listening frequency.'
        ),

})


export const tasteProfileResultSchema = z.object({

    top_artists: tpTopArtistsSchema,

    top_tracks: tpTopTracksSchema,

    saved_albums: tpSavedItemsResultsSchema
        .describe(
            'Saved-album history. Useful as explicit album-level library preference, including historical taste.'
        ),

    saved_tracks: tpSavedItemsResultsSchema
        .describe(
            'Saved-track history. Samples suppress likely bulk-save clusters where multiple tracks share the same save timestamp; ' +
            'historical phases may therefore contain few or no tracks.'
        ),

    followed_artists: tpFollowedArtistSchema,

    errors: z.array(workflowErrorSchema)
        .describe(
            'Errors from individual taste-profile data sources. Other profile sections may still contain valid data if a partial request failed.'
        )

}).describe(
    'Compact musical taste profile combining Spotify-calculated top artists and tracks, ' +
    'saved-library history, and followed artists. These sections represent different taste signals ' +
    'and should not all be interpreted as listening frequency.'
)