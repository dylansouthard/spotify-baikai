import { McpServer } from "@modelcontextprotocol/server";
import { registerServerInfoTool } from "./tools/serverInfo.js";
import { getDevSpotifyHeaders } from './devSpotifyCredentials.js'
import { registerCatalogTools } from './tools/catalog.js'
import { registerLibraryTools } from "./tools/library.js";
import { registerPlaylistTools } from "./tools/playlists.js";
import { db } from "../db/database.js";
import { createSpotifyConnectionRepository } from "../repositories/spotifyConnectionRepository.js";
import { createSpotifyCredentialService, SPOTIFY_CONNECTION_ERROR } from "../services/spotifyCredentialService.js";
import { createSpotifyOAuthStateRepository } from '../repositories/spotifyOAuthStateRepository.js'
import { createSpotifyOAuthStateService } from "../services/spotifyOAuthStateService.js";
import { createSpotifyLinkService } from '../services/spotifyLinkService.js'



const connections = createSpotifyConnectionRepository(db)

let spotifyCredentials 
const getSpotifyCredentials = () => {
    if (spotifyCredentials) return spotifyCredentials
    spotifyCredentials = createSpotifyCredentialService({connections})
    return spotifyCredentials
}

const stateRepository = createSpotifyOAuthStateRepository(db)
const states = createSpotifyOAuthStateService({states: stateRepository})

let spotifyLinks
const getSpotifyLinks = () => {
    if (spotifyLinks) return spotifyLinks
    spotifyLinks = createSpotifyLinkService({states, connections, redirectUri: process.env.SPOTIFY_LINK_REDIRECT_URI})
    return spotifyLinks
}


export const createServer = ({authInfo} = {}) => {
    const userId = authInfo?.extra?.userId
    if (!userId) throw new Error('Authenticated Baikai user is missing')
    const getSpotifyHeaders = async () => {
        try {
            return await getSpotifyCredentials().getHeaders(userId)
        } catch (e) {
            if (e.message === SPOTIFY_CONNECTION_ERROR) {
                const authorizationUrl = getSpotifyLinks().createAuthorizationUrl(userId)
                throw new Error(`Spotify account must be connected. Connect Spotify here: ${authorizationUrl}`)
            }
            throw e
        }
    }
    const server = new McpServer({
        name: "spotify-baikai",
        version: "1.0.0"
    })
    registerServerInfoTool(server)
    registerCatalogTools(server, { getSpotifyHeaders })
    registerLibraryTools(server, { getSpotifyHeaders })
    registerPlaylistTools(server, { getSpotifyHeaders })
    return server
}

