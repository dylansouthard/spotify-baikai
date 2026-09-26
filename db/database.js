// db/database.js

import Database from 'better-sqlite3'

import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const defaultDbPath = process.env.BAIKAI_DB_PATH
  ? resolve(process.env.BAIKAI_DB_PATH)
  : resolve('data/spotify-baikai.sqlite')

export const openDatabase = (dbPath = defaultDbPath) => {
  mkdirSync(dirname(dbPath), {
    recursive: true,
  })

  const database = new Database(dbPath)

  database.pragma('foreign_keys = ON')
  database.pragma('journal_mode = WAL')
  database.pragma('busy_timeout = 5000')

  return database
}

export const db = openDatabase()

export const getDatabasePath = () => defaultDbPath