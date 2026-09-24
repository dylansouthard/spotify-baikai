import * as z from 'zod/v4'


export const timeRanges = z.enum(['short_term', 'medium_term', 'long_term'])
export const defaultLimit = z.number().int().min(1).max(50).optional()
export const defaultOffset = z.number().int().min(0).optional()