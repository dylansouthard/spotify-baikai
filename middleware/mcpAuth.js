import { authenticateBaikaiUser } from '../services/baikaiAuthService.js'

export const requireMcpAuth = async (req, res, next) => {
    const authorization = req.get('authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({error: 'unauthorized'})
    }

    const accessToken = authorization.slice('Bearer '.length).trim()
    if (!accessToken) {
        return res.status(401).json({error: 'unauthorized'})
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
        return res.status(401).json({error: 'unauthorized'})
    }
}