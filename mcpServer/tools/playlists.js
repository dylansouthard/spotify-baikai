import {
    listPlaylistResultSchema,
    listPlaylistsInputSchema,
    createPlaylistInputSchema,
    createPlaylistResultSchema,
    addTracksToPlaylistInputSchema,
    addTracksToPlaylistResultSchema,
    getPlaylistInputSchema,
    playlistResultSchema
} from "../schemas/playlistSchemas.js";
import { formatMcpJsonResponse, formatMcpReturnError, getMcpAnnotations, getMcpSecurityMeta } from "../utilities.js";
import { 
    getPlaylists as getPlaylistsService,
    createPlaylist as createPlaylistService,
    addTracksToPlaylist as addTracksToPlaylistService,
    getPlaylist
} from "../../services/spotifyPlaylistService.js";


export const registerPlaylistTools = (server, {getSpotifyHeaders}) => {
    server.registerTool(
        'list_playlists',
        {
            title: 'List Spotify playlists',
            description: 'Return playlists owned or followed by the current Spotify user, with pagination information.',
            inputSchema: listPlaylistsInputSchema,
            outputSchema: listPlaylistResultSchema,
            annotations: getMcpAnnotations(),
            _meta: getMcpSecurityMeta(),
        },
        async ({limit, offset}) => {
            try {
                const headers = await getSpotifyHeaders()
                const result = await getPlaylistsService({limit: limit ?? 50, offset: offset ?? 0, headers})
                return formatMcpJsonResponse(result)
            } catch(e) {
                return formatMcpReturnError(e, 'Failed to get Spotify playlists')
            }
        }
    )

    server.registerTool(
        'get_playlist',
        {
            title: "Get a Spotify Playlist",
            description: 'Fetches a playlist from the current Spotify user.',
            inputSchema:getPlaylistInputSchema,
            outputSchema:playlistResultSchema,
            _meta: getMcpSecurityMeta(),
            annotations: getMcpAnnotations(),
        },
        async ({playlist_id}) => {
            try {
                const headers = await getSpotifyHeaders()
                const result = await getPlaylist({playlistId:playlist_id, headers})
                return formatMcpJsonResponse(result)
            } catch (e) {
                return formatMcpReturnError(e, `Failed to get playlist with id ${playlist_id}`)
            }
        }
    )

    server.registerTool(
        'create_playlist',
        {
            title: 'Create Spotify playlist',
            description: 'Create a new private playlist for the current Spotify user.',
            inputSchema: createPlaylistInputSchema,
            outputSchema: createPlaylistResultSchema,
            _meta: getMcpSecurityMeta(),
            annotations: getMcpAnnotations({
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            
            }),
        },
        async ({ name, description }) => {
            try {
            const headers = await getSpotifyHeaders()

            const result = await createPlaylistService({name, description, headers})

            return formatMcpJsonResponse(result)
            } catch (e) {
            return formatMcpReturnError(e, 'Failed to create Spotify playlist')
            }
        }
    )

    server.registerTool(
        'add_tracks_to_playlist',
        {
            title: 'Add tracks to Spotify playlist',
            description:
            'Append one or more Spotify track URIs to an existing playlist. Tracks are added in the same order as the supplied URI array.',
            inputSchema: addTracksToPlaylistInputSchema,
            outputSchema: addTracksToPlaylistResultSchema,
            _meta: getMcpSecurityMeta(),
            annotations: getMcpAnnotations({
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            }),
        },
        async ({ playlist_id, uris }) => {
            try {
            const headers = await getSpotifyHeaders()

            const result = await addTracksToPlaylistService({playlistId: playlist_id, uris, headers})

            return formatMcpJsonResponse(result)
            } catch (e) {
            return formatMcpReturnError(e, 'Failed to add tracks to Spotify playlist')
            }
        }
    )
}