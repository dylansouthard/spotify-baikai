import { searchTracks as searchTracksService, searchAlbums as searchAlbumService} from '../../services/spotifyCatalogService.js'
import { formatMcpJsonResponse, formatMcpReturnError, getMcpAnnotations, getMcpSecurityMeta } from '../utilities.js'
import { searchAlbumsResultSchema, catalogSearchInputSchema, searchTracksResultSchema } from '../schemas/catalogSchemas.js'



const registerCatalogSearchToool = (server, {name, title, description, outputSchema, searchService, failureMessage, getSpotifyHeaders}) => {
    server.registerTool(
        name, 
        {
            title, description, inputSchema: catalogSearchInputSchema, outputSchema,
            annotations: getMcpAnnotations(), ...getMcpSecurityMeta()
        },
        async ({query, limit}) => {
            try {
                const headers = await getSpotifyHeaders()
                const matches = await searchService({query, limit: limit ?? 10, headers})
                const result = {query, matches}
                return formatMcpJsonResponse(result)
            } catch(e) {
                console.error('catalog MCP tool failed:', e)
                return formatMcpReturnError(e, failureMessage)
            }
        } 
    )
}

export const registerCatalogTools = (server, {getSpotifyHeaders}) => {

    registerCatalogSearchToool(
        server,
        {
            name: 'search_tracks',
            title: 'Search Spotify tracks',
            description: 'Search the Spotify catalog for tracks matching a text query and return track metadata and Spotify URIs.',
            outputSchema: searchTracksResultSchema,
            searchService: searchTracksService,
            failureMessage: 'Failed to search Spotify tracks',
            getSpotifyHeaders: getSpotifyHeaders
        }
    )
    registerCatalogSearchToool(
        server,
        {
            name: 'search_albums',
            title: 'Search Spotify albums',
            description: 'Search the Spotify catalog for albums matching a text query and return album metadata and Spotify URIs.',
            outputSchema: searchAlbumsResultSchema,
            searchService: searchAlbumService,
            failureMessage: 'Failed to search Spotify albums',
            getSpotifyHeaders: getSpotifyHeaders
        }
    )
}