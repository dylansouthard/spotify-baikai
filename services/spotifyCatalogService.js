import axios from "axios";
import { API_CONST } from "../constants/apiConstants.js";
import { joinArtists } from "../util/conveniences.js";

export const searchTracks = async ({query, limit, headers}) => {
    const params = {
        q: query,
        type: 'track',
        limit
    }
   const response = await axios.get(`${API_CONST.SF_API_BASE}search`, { headers, params })

    return response.data.tracks.items.map((track) => ({
        title: track.name,
        artist: joinArtists(track.artists),
        album: track.album.name,
        uri: track.uri,
        popularity: track.popularity,
        duration_ms: track.duration_ms
    }))
}

export const searchAlbums = async ({query, limit, headers}) => {
    const params = {
        q: query,
        type: 'album',
        limit
    }

    const response = await axios.get(`${API_CONST.SF_API_BASE}search`, { headers, params })

    return response.data.albums.items.map((album) => ({
        name:album.name,
        artist: joinArtists(album.artists),
        uri: album.uri
    }))

}