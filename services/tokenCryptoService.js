import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const ENVELOPE_VERSION = 'v1'

const getEncryptionKey = () => {
    const encodedKey = process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY_BASE64
    if (!encodedKey) throw new Error('SPOTIFY_TOKEN_ENCRYPTION_KEY_BASE64 is required')
    const key = Buffer.from(encodedKey, 'base64')
    if (key.length !== 32) throw new Error('SPOTIFY_TOKEN_ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes')
    return key
}

const buildAssociatedData = ({ userId, spotifyUserId, tokenType }) => {
    return Buffer.from(
        JSON.stringify({userId, spotifyUserId, tokenType}),
        'utf-8'
    )
}

export const encryptToken = (plainText, {userId, spotifyUserId, tokenType}) => {
    const key = getEncryptionKey()
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv)
    const associatedData = buildAssociatedData({userId, spotifyUserId, tokenType})
    cipher.setAAD(associatedData)
    const ciphertext = Buffer.concat([
        cipher.update(plainText, 'utf8'),
        cipher.final()
    ])

    const authTag = cipher.getAuthTag()
    return [
        ENVELOPE_VERSION,
        iv.toString('base64url'),
        ciphertext.toString('base64url'),
        authTag.toString('base64url')
    ].join('.')
}

export const decryptToken = (envelope, {userId, spotifyUserId, tokenType}) => {
    const [version, ivEncoded, ciphertextEncoded, authTagEncoded] = envelope.split('.')
    if (version !== ENVELOPE_VERSION || !ivEncoded || !ciphertextEncoded || !authTagEncoded) {
        throw new Error('Invalid encrypted token envelope')
    }
    const key = getEncryptionKey()
    const iv = Buffer.from(ivEncoded, 'base64url')
    const ciphertext = Buffer.from(ciphertextEncoded, 'base64url')
    const authTag = Buffer.from(authTagEncoded, 'base64url')
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAAD(buildAssociatedData({userId, spotifyUserId, tokenType}))
    decipher.setAuthTag(authTag)
    const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
    ])
    return plaintext.toString('utf8')
}

export const validateTokenCryptoConfig = () => {
    getEncryptionKey()
    const keyId = process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY_ID?.trim()
    if (!keyId) throw new Error('SPOTIFY_TOKEN_ENCRYPTION_KEY_ID is required')
    return {encryptionKeyId: keyId}
}