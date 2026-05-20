import { z } from 'zod'

export const listCompaniesSchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
})

export const toggleActiveSchema = z.object({
  isActive: z.boolean(),
})

export type ListCompaniesInput = z.infer<typeof listCompaniesSchema>
export type ToggleActiveInput  = z.infer<typeof toggleActiveSchema>
