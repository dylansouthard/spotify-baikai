import * as z from 'zod/v4'
import { defaultLimit, defaultOffset } from './conveniences.js'
import { paginatedResultsSchema, trackSchema, spotifyTrackUriSchema} from './shared.js'

export const listPlaylistsInputSchema = z.object({
    limit: defaultLimit,
    offset: defaultOffset
})

export const playlistSummarySchema = z.object({
    id: z.string(),
    name: z.string()
})

export const listPlaylistResultSchema = paginatedResultsSchema.extend({
    playlists: z.array(playlistSummarySchema)
})

export const createPlaylistInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
}).strict()

export const createPlaylistResultSchema = z.object({
  playlist_id: z.string(),
  url: z.string(),
})

export const addTracksToPlaylistInputSchema = z.object({
  playlist_id: z.string().min(1),
  uris: z.array(
    spotifyTrackUriSchema
  ).min(1),
}).strict()

export const addTracksToPlaylistResultSchema = z.object({
  snapshotId: z.string(),
})

export const getPlaylistInputSchema = z.object({
  playlist_id: z.string()
}).strict()

export const playlistResultSchema = z.object({
  uri:z.string(),
  playlist_id:z. string(),
  description:z.string(),
  name:z.string(),
  total_items:z.number().int(),
  tracks:z.array(trackSchema)
})
