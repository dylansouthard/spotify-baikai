import axios from "axios";
import { API_CONST } from "../constants/apiConstants.js";
import { chunkArray, divideSettledResults, joinArtists } from "../util/conveniences.js";

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

export const searchMultipleTracks = async({queries, perQueryLimit = 5, headers}) => {
    const MAX_CONCURRENT = 5

    const allResults = []
    const batches = chunkArray(queries, MAX_CONCURRENT)

    for (const batch of batches) {
        const batchResults = await Promise.allSettled(
            batch.map(query => searchTracks({query, limit: perQueryLimit, headers}))
        )
        const dividedResults = batchResults.map(r => (
            {
                matches: r.status === 'fulfilled' ? r.value : [],
                error: r.status !== 'fulfilled' ? r.reason?.response?.data?.error?.message ?? r.reason?.message ?? 'Unknown error' : null
            }
        ))
        allResults.push(...dividedResults.map((res, i) => ({
            query: batch[i],
            ...res
        })))
    }
    return allResults
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

