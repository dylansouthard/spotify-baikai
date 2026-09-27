import axios from "axios";
import { API_CONST } from "../constants/apiConstants.js";
import { breakDownPlaylist, breakDownTrack, getNextOffset } from "../util/conveniences.js";


export const getPlaylists = async ({limit = 50, offset = 0, headers}) => {
    const response = await axios.get(`${API_CONST.SF_API_BASE}me/playlists`, {headers, params:{limit, offset}})
    const {items, next, total} = response.data
    const nextOffset = getNextOffset(next, items, offset)
    return {
        total,
        nextOffset,
        playlists: items.map(playlist => breakDownPlaylist(playlist))
    }
}

export const createPlaylist = async ({ name, description, headers }) => {
    const playlistResponse = await axios.post(`${API_CONST.SF_API_BASE}me/playlists`, {name, description, public: false}, {headers})
    return {playlist_id:playlistResponse.data.id, url: playlistResponse.data.external_urls.spotify}
}

export const addTracksToPlaylist = async ({playlistId, uris, headers}) => {
    const response = await axios.post(
    `${API_CONST.SF_API_BASE}playlists/${playlistId}/items`, { uris }, { headers })
    if (response.status !== 201) {
    const message = response.data?.error?.message
        throw new Error(
            message
            ? `Unexpected Spotify status ${response.status}: ${message}`
            : `Unexpected Spotify status: ${response.status}`
        )
    }
    
    return {snapshotId: response.data.snapshot_id}
}

export async function getPlaylist({playlistId, headers}) {
    const fields = 'description,id,name,uri,items(total,items(item(artists(name),name)))'
    const response = await axios.get(`${API_CONST.SF_API_BASE}playlists/${playlistId}`, {headers, params:{fields}})
    const {description, id, uri, name, items} = response.data
    const tracks = items.items.filter(i => i.item).map(item => breakDownTrack(item.item))
    return {description, uri:uri, playlist_id:id, name, total_items:items.total, tracks}
    
}
