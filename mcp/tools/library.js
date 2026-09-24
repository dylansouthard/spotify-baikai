import * as z from 'zod/v4'

import { 
    getLikedTracks as getLikedTracksService,
    getTopTracks as getTopTracksService,
    getTopArtists as getTopArtistsService
} from '../../services/spotifyLibraryService.js'
import { getMcpAnnotations, formatMcpJsonResponse, formatMcpReturnError } from '../utilities.js'
import { defaultLimit, defaultOffset } from '../schemas/conveniences.js'
import { topTracksResultSchema, likedTracksResultSchema, topItemsInputSchema, topArtistsResultsSchema } from '../schemas/librarySchemas.js'


export const registerLibraryTools = (server, {getSpotifyHeaders}) => {
    server.registerTool(
        'get_liked_tracks',
        {
            title: 'Get liked Spotify Tracks',
            description: 'Return tracks saved in the current Spotify user library, including when each track was saved.',
            inputSchema: z.object({
                limit: defaultLimit,
                offset: defaultOffset
            }
            ).strict(),
            outputSchema:likedTracksResultSchema,
            annotations: getMcpAnnotations()
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

    server.registerTool(
        'get_top_tracks',
        {
            title: 'Get top Spotify tracks',
            description:
            'Return the current Spotify user’s top tracks for a selected time range.',
            inputSchema: topItemsInputSchema,
            outputSchema: topTracksResultSchema,
            annotations: getMcpAnnotations(),
        },
        async ({ time_range, limit, offset }) => {
            try {
            const headers = await getSpotifyHeaders()

            const tracks = await getTopTracksService({ timeRange: time_range ?? 'long_term', limit: limit ?? 50, offset: offset ?? 0, headers})

            return formatMcpJsonResponse({ tracks })
            } catch (e) {
            return formatMcpReturnError(e, 'Failed to get top Spotify tracks')
            }
        }
    )

        server.registerTool(
        'get_top_artists',
        {
            title: 'Get top Spotify artists',
            description:
            'Return the current Spotify user’s top artists for a selected time range.',
            inputSchema: topItemsInputSchema,
            outputSchema: topArtistsResultsSchema,
            annotations: getMcpAnnotations(),
        },
        async ({ time_range, limit, offset }) => {
            try {
            const headers = await getSpotifyHeaders()

            const artists = await getTopArtistsService({ timeRange: time_range ?? 'long_term', limit: limit ?? 50, offset: offset ?? 0, headers})

            return formatMcpJsonResponse({ artists })
            } catch (e) {
            return formatMcpReturnError(e, 'Failed to get top Spotify artists')
            }
        }
    )
}

