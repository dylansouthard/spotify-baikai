import { db } from '../db/database.js'

import { createUserRepository } from '../repositories/userRepository.js'
import { verifyBaikaiAccessToken } from './auth0Service.js'
import { hasScope } from '../util/conveniences.js'

const users = createUserRepository(db)

export const authenticateBaikaiUser = async (accessToken) => {
    const claims = await verifyBaikaiAccessToken(accessToken)
    if (!hasScope(claims, 'mcp:access')) throw new Error('Missing required scope: mcp:access')
    const user = users.findOrCreateByAuthIdentity({authIssuer:claims.iss, authSubject:claims.sub})
    return {user, claims}
}