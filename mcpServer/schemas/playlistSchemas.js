import * as z from 'zod/v4'
import { defaultLimit, defaultOffset } from './conveniences.js'

export const listPlaylistsInputSchema = z.object({
    limit: defaultLimit,
    offset: defaultOffset
})

export const playlistSummarySchema = z.object({
    id: z.string(),
    name: z.string()
})

export const listPlaylistResultSchema = z.object({
    total: z.number().int().min(0),
    nextOffset: z.number().int().min(0).nullable(),
    playlists: z.array(playlistSummarySchema)
})

export const createPlaylistInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
}).strict()

export const createPlaylistResultSchema = z.object({
  playlistId: z.string(),
  url: z.string(),
})

export const addTracksToPlaylistInputSchema = z.object({
  playlistId: z.string().min(1),
  uris: z.array(
    z.string().regex(
      /^spotify:track:[A-Za-z0-9]{22}$/,
      'Must be a Spotify track URI'
    )
  ).min(1),
}).strict()

export const addTracksToPlaylistResultSchema = z.object({
  snapshotId: z.string(),
})