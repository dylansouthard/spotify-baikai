import * as z from 'zod/v4'

import { 
    getLikedTracks as getLikedTracksService,
    getTopTracks as getTopTracksService,
    getTopArtists as getTopArtistsService,
    fetchSavedAlbums as getSavedAlbumsService,
    getFollowedArtists as getFollowedArtistsService
} from '../../services/spotifyLibraryService.js'
import { getMcpAnnotations, formatMcpJsonResponse, formatMcpReturnError, getMcpSecurityMeta } from '../utilities.js'
import { topTracksResultSchema, likedTracksResultSchema, topItemsInputSchema, topArtistsResultsSchema, savedAlbumsResultsSchema, followedArtistsResultSchema,followedArtistInputSchema } from '../schemas/librarySchemas.js'
import { defaultLimitOffsetSchema } from '../schemas/shared.js'


export const registerLibraryTools = (server, {getSpotifyHeaders}) => {
    server.registerTool(
        'get_liked_tracks',
        {
            title: 'Get liked Spotify Tracks',
            description: 'Return tracks saved in the current Spotify user library, including when each track was saved.',
            inputSchema: defaultLimitOffsetSchema.strict(),
            outputSchema:likedTracksResultSchema,
            annotations: getMcpAnnotations(),
            _meta: getMcpSecurityMeta(),
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
            _meta: getMcpSecurityMeta(),
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
            _meta: getMcpSecurityMeta(),
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

    server.registerTool(
        'get_saved_albums',
        {
            title: 'Get saved Spotify albums',
            description: 'Return albums saved in the current Spotify user library, including when each album was saved.',
            inputSchema: defaultLimitOffsetSchema.strict(),
            outputSchema:followedArtistsResultSchema,
            annotations: getMcpAnnotations(),
            _meta: getMcpSecurityMeta(),
        },
        async ({limit, offset}) => {
            try {
                const headers = await getSpotifyHeaders()
                const result = await getSavedAlbumsService({limit: limit ? limit : 50, offset: offset ? offset : 0, headers})
                return formatMcpJsonResponse(result)
            } catch (e) {
                return formatMcpReturnError(e, 'Failed to get saved Spotify albums')
            }
        }
    )
    server.registerTool(
        'get_followed_artists',
        {
            title: 'Get followed Spotify artists',
            description: 'Return the names of artists followed in the current Spotify user library.',
            inputSchema: followedArtistInputSchema,
            outputSchema: followedArtistsResultSchema,
            annotations: getMcpAnnotations(),
            _meta: getMcpSecurityMeta(),
        },
        async ({limit, after}) => {
            try {
                const headers = await getSpotifyHeaders()
                const result = await getFollowedArtistsService({limit: limit ? limit : 50, after: after ? after : '', headers})
                return formatMcpJsonResponse(result)
            } catch (e) {
                return formatMcpReturnError(e, 'Failed to get saved Spotify artists')
            }
        }
    )
}

