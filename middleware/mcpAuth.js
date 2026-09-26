import { authenticateBaikaiUser } from '../services/baikaiAuthService.js'

export const requireMcpAuth = async (req, res, next) => {
    const authorization = req.get('authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return sendUnauthorized(res)
    }

    const accessToken = authorization.slice('Bearer '.length).trim()
    if (!accessToken) {
        return sendUnauthorized(res)
    }

    try {
        const {user, claims} = await authenticateBaikaiUser(accessToken)
        req.auth = {
            token: accessToken,
            clientId: claims.client_id,
            scopes: claims.scope?.split(/\s+/).filter(Boolean),
            expiresAt: claims.exp,
            resource: new URL(process.env.AUTH0_AUDIENCE),
            extra:{userId: user.id}
        }
        next()
    } catch (e) {
        console.error(`MCP authentication failed`, e.message)
        return sendUnauthorized(res)
    }
}

const sendUnauthorized = (res) => {
    const resourceMetadata = `${process.env.AUTH0_AUDIENCE}/.well-known/oauth-protected-resource`
    res.set(
        'WWW-Authenticate',
        `Bearer resource_metadata="${resourceMetadata}", scope="mcp:access"`
  )

  return res.status(401).json({error:'unauthorized'})
}