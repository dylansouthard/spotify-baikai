import * as z from 'zod/v4'

import { getLikedTracks as getLikedTracksService } from '../../services/spotifyLibraryService.js'
import { getMcpAnnotations, formatMcpJsonResponse, formatMcpReturnError } from '../utilities.js'


const likedTrackSchema = z.object({
    title: z.string(),
    artist: z.string(),
    added_at: z.string(),
})

const likedTracksResultSchema = z.object({
    tracks: z.array(likedTrackSchema)
})

export const registerLibraryTools = (server, {getSpotifyHeaders}) => {
    server.registerTool(
        'get_liked_tracks',
        {
            title: 'Get liked Spotify Tracks',
            description: 'Return tracks saved in the current Spotify user library, including when each track was saved.',
            inputSchema: z.object({
                limit: z.number().int().min(1).max(50).optional(),
                offset: z.number().int().min(0).optional()
            }).strict(),
            outputSchema:likedTracksResultSchema,
            ...getMcpAnnotations()
        },
        async ({limit, offset}) => {
            try {
                const headers = await getSpotifyHeaders()
                const tracks = await getLikedTracksService({limit: limit ?? 50, offset: offset ?? 0, headers})
                const result = {tracks}
                return formatMcpJsonResponse(result)
            } catch (e) {
                return formatMcpReturnError(e, 'Failed to get liked Spotify tracks')
            }
        }
    )
}

