// services/tasteService.js
import axios from 'axios'
import { API_CONST } from '../constants/apiConstants.js'
import { getBearerToken } from '../constants/apiConstants.js'

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

export async function fetchSavedAlbums({
    limit=50,
    offset = 0,
    headers
}) {
    const response = await axios.get(`${API_CONST.SF_API_BASE}me/albums`, {
      headers,
      params: { limit, offset },
    })
    return {albums: response.data.items, total: response.data.total, next:response.data.next}
}

export async function fetchFollowedArtists({
    limit=50,
    after,
    headers,
    fetchNext = false,
    totalLimit = 300
}) {
    const response = await axios.get(`${API_CONST.SF_API_BASE}me/following`, {
      headers,
      params: { limit, after, type:'artist' },
    })
    const data = response.data.artists
    const fetchedArtists = data.items.map(a => a.name)
    if (fetchNext && data.cursors.after) {
        const remainingLimit = totalLimit - fetchedArtists.length
        if (remainingLimit > 0) {
            const nextLimit = Math.min(remainingLimit, limit)
            const results = await fetchFollowedArtists({limit:nextLimit, after:data.cursors.after, headers, fetchNext:true, totalLimit:remainingLimit})
            fetchedArtists.push(...results)
        }
    }
    return fetchedArtists
}

