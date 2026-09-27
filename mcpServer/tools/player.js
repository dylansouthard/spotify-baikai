import { playContextSchema, playTracksSchema} from '../schemas/playerSchema.js';
import { statusResultSchema } from '../schemas/shared.js';

import { formatMcpJsonResponse, formatMcpReturnError, getMcpSecurityMeta } from '../utilities.js';

import { startPlayback } from '../../services/spotifyPlayerService.js';

const playbackAnnotations = {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
}

export const registerPlaybacktools = (server, {getSpotifyHeaders}) => {
    server.registerTool(
        'play_context',
        {
            title: 'Play Spotify Context',
            description: 'Start playback of a Spotify album, artist, or playlist.',
            inputSchema: playContextSchema,
            outputSchema: statusResultSchema,
            annotations: playbackAnnotations,
            _meta: getMcpSecurityMeta(),
        },
        async ({context_uri, device_id}) => {
            try {
                const headers = await getSpotifyHeaders()
                const result = await startPlayback({contextUri:context_uri, deviceId:device_id, headers})
                return formatMcpJsonResponse(result)
            } catch(e) {
                return formatMcpReturnError(e, 'Failed to start Spotify playback')
            }
        }
    )
    server.registerTool(
        'play_tracks',
        {
            title: 'Play Spotify Tracks',
            description: 'Start playback of one or more Spotify tracks in the supplied order.',
            inputSchema: playTracksSchema,
            outputSchema: statusResultSchema,
            annotations: playbackAnnotations,
            _meta: getMcpSecurityMeta(),
        },
        async ({uris, device_id}) => {
            try {
                const headers = await getSpotifyHeaders()
                const result = await startPlayback({uris, deviceId:device_id, headers})
                return formatMcpJsonResponse(result)
            } catch(e) {
                return formatMcpReturnError(e, 'Failed to start Spotify playback')
            }
        }
    )
}