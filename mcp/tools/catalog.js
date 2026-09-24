import * as z from 'zod/v4'

import { searchTracks as searchTracksService, searchAlbums as searchAlbumService} from '../../services/spotifyCatalogService.js'
import { formatMcpJsonResponse, formatMcpReturnError, getMcpAnnotations } from '../utilities.js'

const trackMatchSchema = z.object({
  title: z.string(),
  artist: z.string(),
  album: z.string(),
  uri: z.string(),
  popularity: z.number(),
  duration_ms: z.number(),
})

const searchTracksResultSchema = z.object({
    query: z.string(),
    matches: z.array(trackMatchSchema)
})

const albumMatchSchema = z.object({
    name: z.string(),
    artist: z.string(),
    uri: z.string()
})

const searchAlbumsResultSchema = z.object({
    query: z.string(),
    matches: z.array(albumMatchSchema)
})

const catalogSearchInputSchema = z.object({
    query: z.string().min(1),
    limit: z.number().int().min(1).max(10).optional()
}).strict()


const registerCatalogSearchToool = (server, {name, title, description, outputSchema, searchService, failureMessage, getSpotifyHeaders}) => {
    server.registerTool(
        name, 
        {
            title, description, inputSchema: catalogSearchInputSchema, outputSchema,
            ...getMcpAnnotations()
        },
        async ({query, limit}) => {
            try {
                const headers = await getSpotifyHeaders()
                const matches = await searchService({query, limit: limit ?? 10, headers})
                const result = {query, matches}
                return formatMcpJsonResponse(result)
            } catch(e) {
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
    // server.registerTool(
    //     'search_tracks',
    //     {
    //         title: 'SearchSpotify tracks',
    //         description: 'Search the Spotify catalog for tracks matching a text query and return track metadata and Spotify URIs.',
    //         inputSchema: z.object({
    //             query: z.string().min(1),
    //             limit: z.number().int().min(1).max(10).optional()
    //         }).strict(),
    //         outputSchema: searchTracksResultSchema,
    //         annotations: {
    //             readOnlyHint: true,
    //             openWorldHint: true,
    //         }
    //     },
    //     async({ query, limit }) => {
    //         try {
    //             const headers = await getSpotifyHeaders()
    //             const matches = await searchTracksService({query, limit, headers})
    //             const result = {query, matches}
    //             return {
    //                 content: [
    //                     {type: 'text', text: JSON.stringify(result)}
    //                 ], 
    //                 structuredContent: result,
    //             }
    //         } catch (e) {
    //             const message = e.response?.data?.error?.message || 'Failed to search Spotify tracks'
    //             return {
    //                 content: [
    //                     {
    //                         type: 'text',
    //                         text: message
    //                     }
    //                 ],
    //                 isError: true,
    //             }
    //         }
    //     }
    // )
}