import axios from "axios";
import { API_CONST } from "../constants/apiConstants.js";

export const SPOTIFY_SCOPES = [
  'playlist-modify-private',
  'playlist-modify-public',
  'user-library-read',
  'user-top-read',
  'user-read-playback-state',
  'user-modify-playback-state',
  'playlist-read-private',
  'user-read-recently-played',
  'user-read-currently-playing',
  'user-follow-read',
]

export const buildSpotifyAuthorizationUrl = ({redirectUri, state}) => {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.SPOTIFY_ID,
        scope: SPOTIFY_SCOPES.join(' '),
        redirect_uri: redirectUri,
        ...(state ? {state} : {})
    })

    return `${API_CONST.SF_ACCT_BASE}authorize?${params}`
}

export const exchangeSpotifyAuthorizationCode = async ({code, redirectUri}) => {
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri:redirectUri,
        client_id: process.env.SPOTIFY_ID,
        client_secret: process.env.SPOTIFY_SECRET
    })

    return requestSpotifyToken(params)
}

export const refreshSpotifyAccessToken = async ({refreshToken}) => {
    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.SPOTIFY_ID,
        client_secret: process.env.SPOTIFY_SECRET
    })

    return requestSpotifyToken(params)
}

const requestSpotifyToken = async (params) => {
    const response = await axios.post(`${API_CONST.SF_ACCT_BASE}api/token`, params, API_CONST.URL_ENCODED_HEADERS)

    return {
        tokens: response.data,
        status: response.status,
        contentType: response.headers?.['content_type']
    }
}

export const fetchSpotifyUser = async ({accessToken}) => {
    const response = await axios.get(`${API_CONST.SF_API_BASE}me`, {
        headers:{Authorization: `Bearer ${accessToken}`}
    })
    return response.data
}