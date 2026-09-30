import { formatMcpJsonResponse, formatMcpReturnError, getMcpAnnotations, getMcpSecurityMeta } from "../utilities.js";
import { createAndPlayPlaylistInputSchema, createAndPlayPlaylistResultSchema } from "../schemas/playlistWorkflowSchema.js";
import { createAndPlayPlaylist } from "../../services/spotifyPlaylistWorkflowService.js";


export const registerWorkflowTools = (server, {getSpotifyHeaders}) => {
    server.registerTool(
        'create_and_play_playlist',
        {
            title: 'Create and play a Spotify playlist',
            description: 'Create a new private playlist, add the supplied tracks in order, and start playback. Prefer this convenience tool when the user wants the complete create-and-play workflow rather than calling the individual playlist tools separately.',
            inputSchema: createAndPlayPlaylistInputSchema,
            outputSchema: createAndPlayPlaylistResultSchema,
            _meta: getMcpSecurityMeta(),
            annotations: getMcpAnnotations({
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            }),
        },
        async ({ name, description, device_id, uris }) => {
            try {
            const headers = await getSpotifyHeaders()

            const result = await createAndPlayPlaylist({name, description, uris, deviceId:device_id, headers})

            return formatMcpJsonResponse(result)
            } catch (e) {
            return formatMcpReturnError(e, 'Failed to create and play playlist')
            }
        }
    )
}