export const getDevSpotifyHeaders = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Development Spotify credentials are disabled in production'
    )
  }

  if (process.env.MCP_DEV_AUTH_ENABLED !== '1') {
    throw new Error(
      'MCP development Spotify credentials are not enabled'
    )
  }

  const accessToken = process.env.MCP_DEV_SPOTIFY_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error(
      'MCP_DEV_SPOTIFY_ACCESS_TOKEN is not configured'
    )
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  }
}