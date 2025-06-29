export const openaiCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query
  console.error('state is ', state)
  if (!code || !state) {
    return res
      .status(400)
      .send('Missing code or state' + `req query is ${req.query} json is ${JSON.stringify(req.query)}`)
  }
  console.error(`Redirect URI used: ${process.env.DOMAIN}/openai-callback`)

  const params = qs.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${process.env.DOMAIN}/openai-callback`, // This must match the one used earlier
    client_id: process.env.SPOTIFY_ID,
    client_secret: process.env.SPOTIFY_SECRET,
  })

  try {
    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    const { access_token, refresh_token, expires_in, token_type } = tokenRes.data

    // ✅ Simulate token callback to OpenAI
    const redirectToOpenAI =
      API_CONST.OPEN_AI_CALLBACK +
      `?access_token=${encodeURIComponent(access_token)}` +
      `&refresh_token=${encodeURIComponent(refresh_token)}` +
      `&token_type=${encodeURIComponent(token_type)}` +
      `&expires_in=${expires_in}` +
      `&state=${encodeURIComponent(state)}`
    console.error('[Redirecting to OpenAI]', redirectToOpenAI)
    // res.redirect(redirectToOpenAI)
    const body = qs.stringify({
      code: access_token,
      state,
    })
    await axios.post(
      API_CONST.OPEN_AI_CALLBACK, // https://chat.openai.com/aip/g-.../oauth/callback
      body,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )
    res.send(`
    <h1>Spotify connected!</h1>
    <p>You can now close this window and go back to ChatGPT.</p>
  `)
  } catch (e) {
    console.error('Token exchange failed:', e.response?.data || e)
    throwError(ERROR_TYPE.TOKEN_REFRESH, res, e.response?.data)
  }
})
