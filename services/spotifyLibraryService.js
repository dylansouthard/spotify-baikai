import axios from "axios";

import { API_CONST } from "../constants/apiConstants.js";
import { breakDownSavedAlbum, breakDownTrack, getNextOffset, breakDownSavedItem } from "../util/conveniences.js";


export const getLikedTracks = async ({limit, offset, headers}) => {
    const response = await axios.get(
        `${API_CONST.SF_API_BASE}me/tracks`,
        {headers, params: {limit, offset}}
    )
    return response.data.items.map(({ track, added_at }) => {
        return {
            ...breakDownTrack(track),
            added_at
        }
    })
}

export const getTopTracks = async ({timeRange, limit, offset, headers}) => {
    const items = await fetchTopItems({type:'tracks', timeRange, limit, offset, headers})
    return items.map(track => breakDownTrack(track))
}

export const getTopArtists = async ({timeRange, limit, offset, headers}) => {
    const items = await fetchTopItems({type:'artists', timeRange, limit, offset, headers})
    return items.map((a) => a.name)
}

export async function fetchTopItems({
  type = "tracks",
  timeRange:time_range = 'long_term',
  limit = 50,
  offset = 0,
  headers
}) {

    const response = await axios.get(`${API_CONST.SF_API_BASE}me/top/${type}`, {
      headers,
      params: { time_range, limit, offset },
    })
    return response.data.items
}

export async function fetchSavedItems({
    type = "track",
    limit = 50,
    offset = 0,
    headers
}) {
    const response = await axios.get(`${API_CONST.SF_API_BASE}me/${type}s`, {
      headers,
      params: { limit, offset },
    })
    const {items, next, total} = response.data
    const nextOffset = getNextOffset(next, items, offset)
    return {items: items.map(itm => breakDownSavedItem(itm, type)), total, nextOffset}
}

export async function fetchSavedAlbums({
    limit=50,
    offset = 0,
    headers
}) {
    const response = await axios.get(`${API_CONST.SF_API_BASE}me/albums`, {
      headers,
      params: { limit, offset },
    })
    const {items, next, total} = response.data
    const nextOffset = getNextOffset(next, items, offset)
  
    return {albums: items.map(itm => breakDownSavedAlbum(itm)), total, nextOffset}
}

export const getFollowedArtists = async ({limit = 50, after, headers}) => {
    const response = await axios.get(`${API_CONST.SF_API_BASE}me/following`, {
      headers,
      params: { limit, after, type:'artist' },
    })
    const {items, cursors, total} = response.data.artists
    return {artists: items.map(a => a.name), after:cursors.after, total}
}

export async function getConsecutiveFollowedArtists({
    limit=50,
    after,
    headers,
    fetchNext = false,
    totalLimit = 300
}) {

    const {artists, after:nextAfter, total} = await getFollowedArtists({limit, after, headers})
    
    if (fetchNext && nextAfter) {
        const remainingLimit = totalLimit - artists.length
        if (remainingLimit > 0) {
            const nextLimit = Math.min(remainingLimit, limit)
            const results = await getConsecutiveFollowedArtists({limit:nextLimit, after:nextAfter, headers, fetchNext:true, totalLimit:remainingLimit})
            artists.push(...results.artists)
        }
    }
    return {total:total, artists}
}

export async function fetchFollowedArtists({
    limit=50,
    after,
    headers,
    fetchNext = false,
    totalLimit = 300
}) {

    const {artists, after:nextAfter, total} = await getFollowedArtists({limit, after, headers})

    if (fetchNext && after) {
        const remainingLimit = totalLimit - artists.length
        if (remainingLimit > 0) {
            const nextLimit = Math.min(remainingLimit, limit)
            const results = await fetchFollowedArtists({limit:nextLimit, after, headers, fetchNext:true, totalLimit:remainingLimit})
            fetchedArtists.push(...results)
        }
    }
    return fetchedArtists
}

