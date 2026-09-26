import { randomUUID } from 'node:crypto'

const mapUser = (row) => {
  if (!row) return null

  return {
    id: row.id,
    authIssuer: row.auth_issuer,
    authSubject: row.auth_subject,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const createUserRepository = (database) => {
  const insertUser = database.prepare(`
    INSERT INTO app_users (
      id,
      auth_issuer,
      auth_subject,
      created_at,
      updated_at
    )
    VALUES (
      @id,
      @authIssuer,
      @authSubject,
      @createdAt,
      @updatedAt
    )
  `)

  const findOrCreateStatement = database.prepare(`
  INSERT INTO app_users (
    id,
    auth_issuer,
    auth_subject,
    created_at,
    updated_at
  )
  VALUES (
    @id,
    @authIssuer,
    @authSubject,
    @createdAt,
    @updatedAt
  )
  ON CONFLICT(auth_issuer, auth_subject)
  DO NOTHING
`)

  const findUserById = database.prepare(`
    SELECT *
    FROM app_users
    WHERE id = ?
  `)

  const findUserByAuthIdentity = database.prepare(`
    SELECT *
    FROM app_users
    WHERE auth_issuer = ?
      AND auth_subject = ?
  `)

  return {
    create({ authIssuer, authSubject }) {
      const now = Date.now()

      const user = {
        id: randomUUID(),
        authIssuer,
        authSubject,
        createdAt: now,
        updatedAt: now,
      }

      insertUser.run(user)

      return user
    },

    findById(id) {
      return mapUser(findUserById.get(id))
    },

    findByAuthIdentity({ authIssuer, authSubject }) {
      return mapUser(findUserByAuthIdentity.get(authIssuer, authSubject))
    },
    findOrCreateByAuthIdentity({ authIssuer, authSubject }) {
      const now = Date.now()
      findOrCreateStatement.run({ id: randomUUID(), authIssuer, authSubject, createdAt: now, updatedAt: now })

      return mapUser(findUserByAuthIdentity.get(authIssuer, authSubject))
    },
  }
}
