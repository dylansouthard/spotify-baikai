import axios from "axios";

import { API_CONST } from "../constants/apiConstants.js";
import { breakDownTrack } from "../util/conveniences.js";
import { fetchTopItems } from "./tasteService.js";

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
