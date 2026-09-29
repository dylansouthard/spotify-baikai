import * as z from 'zod/v4'


export const timeRanges = z.enum(['short_term', 'medium_term', 'long_term']).describe(
    "Spotify affinity time ranges: short_term ≈ 4 weeks, " +
    "medium_term ≈ 6 months, long_term ≈ 1 year. " +
    "Spotify's 'long_term' is not lifetime listening history."
  )

export const defaultLimit = z.number().int().min(1).max(50).optional()
export const defaultOffset = z.number().int().min(0).optional()