import {
  readdirSync,
  readFileSync,
} from 'node:fs'

import {
  dirname,
  join,
} from 'node:path'

import {
  fileURLToPath,
} from 'node:url'

import { db } from './database.js'

const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  'migrations'
)

const migrationPattern = /^(\d+)_.*\.sql$/

export const runMigrations = (
  database = db
) => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `)

  const appliedVersions = new Set(
    database
      .prepare(`
        SELECT version
        FROM schema_migrations
      `)
      .all()
      .map(({ version }) => version)
  )

  const migrations = readdirSync(migrationsDir)
    .map((name) => {
      const match = name.match(migrationPattern)

      if (!match) return null

      return {
        version: Number(match[1]),
        name,
        path: join(migrationsDir, name),
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.version - b.version)

  const applyMigration = database.transaction(
    ({ version, name, path }) => {
      const sql = readFileSync(path, 'utf8')

      database.exec(sql)

      database
        .prepare(`
          INSERT INTO schema_migrations (
            version,
            name,
            applied_at
          )
          VALUES (?, ?, ?)
        `)
        .run(
          version,
          name,
          Date.now()
        )
    }
  )

  const applied = []

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) {
      continue
    }

    applyMigration(migration)

    applied.push(migration.name)
  }

  return applied
}