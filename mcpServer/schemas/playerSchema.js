import * as z from 'zod/v4'
import { deviceIdSchema, spotifyTrackUriSchema} from './shared.js'


const playInputSchema = z.object({
    device_id: deviceIdSchema
})

export const playContextSchema = playInputSchema.extend({
    context_uri: z.string().describe('Spotify URI of the context to play. Valid contexts are albums, artists & playlists.')
}).strict()

export const playTracksSchema = playInputSchema.extend({
    uris: z.array(spotifyTrackUriSchema).min(1)
}).strict()