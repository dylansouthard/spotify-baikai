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

export const searchMultipleTracksInputSchema = z.object({
    queries: z.array(z.string().trim().min(1)).min(1).max(25),
    per_query_limit: z.number().int().min(1).max(15).optional().default(5).describe('The max number of results to return per query')
}).strict()

export const searchMultipleTracksResultSchema = z.object({
    results: z.array(searchTracksResultSchema.extend({
        error:z.union([
    z.string(),
    z.null(),
])
    }))
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

