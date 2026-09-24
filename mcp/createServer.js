import { McpServer } from "@modelcontextprotocol/server";
import { registerServerInfoTool } from "./tools/serverInfo.js";
import { getDevSpotifyHeaders } from './devSpotifyCredentials.js'
import { registerCatalogTools } from './tools/catalog.js'
import { registerLibraryTools } from "./tools/library.js";

export const createServer = () => {
    const server = new McpServer({
        name: "spotify-baikai",
        version: "1.0.0"
    })
    registerServerInfoTool(server)
    registerCatalogTools(server, {
        getSpotifyHeaders: getDevSpotifyHeaders,
    })
    registerLibraryTools(server, {
        getSpotifyHeaders: getDevSpotifyHeaders,
    })
    return server
}

