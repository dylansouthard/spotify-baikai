import * as z from 'zod/v4'

export const trackMatchSchema = z.object({
  title: z.string(),
  artist: z.string(),
  album: z.string(),
  uri: z.string(),
  popularity: z.number(),
  duration_ms: z.number(),
})

export const searchTracksResultSchema = z.object({
    query: z.string(),
    matches: z.array(trackMatchSchema)
})

export const albumMatchSchema = z.object({
    name: z.string(),
    artist: z.string(),
    uri: z.string()
})

export const searchAlbumsResultSchema = z.object({
    query: z.string(),
    matches: z.array(albumMatchSchema)
})

export const catalogSearchInputSchema = z.object({
    query: z.string().min(1),
    limit: z.number().int().min(1).max(10).optional()
}).strict()
