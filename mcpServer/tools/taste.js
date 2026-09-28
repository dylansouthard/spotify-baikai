

import { getTasteProfile } from '../../services/tasteProfileService.js'
import { getMcpAnnotations, formatMcpJsonResponse, formatMcpReturnError, getMcpSecurityMeta } from '../utilities.js'
import { tasteProfileResultSchema } from '../schemas/tasteProfileSchema.js'


export const registerTasteTools = (server, {getSpotifyHeaders}) => {
    server.registerTool(
        'get_taste_profile',
        {
            title: 'Get the User\'s taste profile',
            description: 'Return samples of tracks, albums, and artists the frequently listened to by the user over various time periods.',
            outputSchema:tasteProfileResultSchema,
            annotations: getMcpAnnotations(),
            _meta: getMcpSecurityMeta(),
        },
        async () => {
            try {
                const headers = await getSpotifyHeaders()
                const result = await getTasteProfile({headers})
                return formatMcpJsonResponse(result)
            } catch (e) {
                return formatMcpReturnError(e, 'Failed to get the user\'s taste profile')
            }
        }
    )
}



