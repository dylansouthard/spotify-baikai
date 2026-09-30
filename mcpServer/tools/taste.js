

import { getTasteProfile } from '../../services/tasteProfileService.js'
import { getMcpAnnotations, formatMcpJsonResponse, formatMcpReturnError, getMcpSecurityMeta } from '../utilities.js'
import { tasteProfileResultSchema } from '../schemas/tasteProfileSchema.js'


export const registerTasteTools = (server, {getSpotifyHeaders}) => {
    server.registerTool(
        'get_taste_profile',
        {
            title: 'Get the User\'s taste profile',
            description: 'Build a compact overview of the user’s musical taste from multiple Spotify signals, ' +
            'including top artists and tracks across recent affinity periods, sampled saved albums ' +
            'and tracks across the user’s library history, and followed artists. Use this when you ' +
            'need a broad understanding of the user’s current and historical music preferences for ' +
            'recommendations, discovery, or taste analysis. Top items reflect Spotify-calculated ' +
            'affinity rather than raw play counts, and saved/followed items should not be interpreted ' +
            'as listening frequency.',
            outputSchema:tasteProfileResultSchema,
            annotations: getMcpAnnotations(),
            _meta: getMcpSecurityMeta(),
        },
        async () => {
            try {
                const headers = await getSpotifyHeaders()
                const result = await getTasteProfile({headers})
                const parsed = tasteProfileResultSchema.parse(result)
                return formatMcpJsonResponse(parsed)
            } catch (e) {
                return formatMcpReturnError(e, 'Failed to get the user\'s taste profile')
            }
        }
    )
}



