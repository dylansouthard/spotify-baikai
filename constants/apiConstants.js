export const API_CONST = {
  SF_ACCT_BASE: 'https://accounts.spotify.com/',
  SF_API_BASE: 'https://api.spotify.com/v1/',
  URL_ENCODED_HEADERS: { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  OPEN_AI_CALLBACK: 'https://chat.openai.com/aip/g-83a8fa8db29d1a28bd4fed25e76afd0a8bf3fbdd/oauth/callback',
}

export const getCredentials = () => ({
  client_id: process.env.SPOTIFY_ID,
  client_secret: process.env.SPOTIFY_SECRET,
})

export const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '')
  return { Authorization: `Bearer ${token}` }
}
