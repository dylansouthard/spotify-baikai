import * as z from 'zod/v4'


const playInputSchema = z.object({
    device_id: z.string().optional()
})

export const playContextSchema = playInputSchema.extend({
    context_uri: z.string().describe('Spotify URI of the context to play. Valid contexts are albums, artists & playlists.')
}).strict()

export const playTracksSchema = playInputSchema.extend({
    uris: z.array(z.string()).describe('An array of the Spotify track URIs to play.')
}).strict()