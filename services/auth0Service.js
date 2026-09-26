import { ApiClient } from "@auth0/auth0-api-js";

let apiClient

const getApiClient = () => {
    if (apiClient) return apiClient
    const {AUTH0_DOMAIN: domain, AUTH0_AUDIENCE: audience} = process.env

    if (!domain || !audience) throw new Error('AUTH0_DOMAIN and AUTH0_AUDIENCE required')
    apiClient = new ApiClient({domain, audience})
    return apiClient
}

export const verifyBaikaiAccessToken = async (accessToken) => {
    if (!accessToken) throw new Error('Access token required')
    const claims = await getApiClient().verifyAccessToken({accessToken})
    if(!claims.sub) throw new Error('Authenticated user subject is missing')
    return claims
}