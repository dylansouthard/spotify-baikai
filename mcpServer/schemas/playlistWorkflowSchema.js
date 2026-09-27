import * as z from 'zod/v4'
import { trackSchema } from './shared.js'

export const createAndPlayPlaylistInputSchema = z.object({

    name: z
        .string()
        .trim()
        .min(1)
        .describe('Name of the playlist to create.'),

    description: z
        .string()
        .optional()
        .default('')
        .describe('Optional description for the playlist.'),

    uris: z
        .array(
            z.string()
                .trim()
                .min(1)
        )
        .min(1)
        .describe(
            'Spotify track URIs to add to the playlist, in playback order.'
        ),

    device_id: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
            'Optional Spotify device ID on which to start playback.'
        ),

}).strict()

export const createAndPlayPlaylistResultSchema = z.object({

    outcome: z.enum([
        'completed',
        'partial',
        'failed',
    ]),

    failed_stage: z.union([
        z.enum([
            'create_playlist',
            'add_tracks_to_playlist',
            'play_context',
        ]),
        z.null(),
    ]),

    verification_status: z.enum([
        'not_attempted',
        'verified',
        'warning',
        'unknown',
    ]),

    playlist_id: z.union([
        z.string(),
        z.null(),
    ]),

    playlist_url: z.union([
        z.string(),
        z.null(),
    ]),

    playlist_uri: z.union([
        z.string(),
        z.null(),
    ]),

    num_tracks_added: z
        .number()
        .int()
        .min(0),

    added_tracks: z.array(trackSchema),

    playback_started: z.boolean(),

    message: z.string(),

}).strict()
