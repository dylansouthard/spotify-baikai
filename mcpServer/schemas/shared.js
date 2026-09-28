import * as z from 'zod/v4'
import { defaultLimit, defaultOffset} from './conveniences.js'

export const paginatedResultsSchema = z.object({
    total: z.number().int().min(0),
    nextOffset: z.number().int().min(0).nullable().describe('The offset to be passed into subsequent queries to get the next page'),
})

export const defaultLimitOffsetSchema = z.object({
    limit:defaultLimit,
    offset:defaultOffset
})

export const statusResultSchema = z.object({
    status:z.number().int(),
    message:z.string()
})


export const trackSchema = z.object({
    title:z.string(),
    artist:z.string()
})

export const workflowErrorSchema = z.object({
    field: z.string(),
    message: z.string()
})

export const yearSchema = z.string().regex(/^\d{4}$/)

export const savedAlbumSchema = z.object({
    name: z.string(),
    artist: z.string(),
    added_at: z.string()
})
