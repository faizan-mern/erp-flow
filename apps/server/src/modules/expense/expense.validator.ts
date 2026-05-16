import { z } from 'zod'

export const createExpenseSchema = z.object({
  title:       z.string().min(1, 'Title is required').max(200),
  amount:      z.number().positive('Amount must be greater than zero'),
  categoryId:  z.string().uuid().optional(),
  expenseDate: z.string().datetime('Expense date must be ISO 8601'),
  notes:       z.string().max(1000).optional(),
  invoiceUrl:  z.string().url().optional(),
})

// PUT /expenses/:id — only allowed while PENDING (service enforces this).
// All fields optional so the client can patch one field at a time.
export const updateExpenseSchema = createExpenseSchema.partial()

// POST /expenses/:id/reject — manager can include a reason
export const rejectExpenseSchema = z.object({
  reason: z.string().max(500).optional(),
})

export const listExpensesQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  status:     z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  categoryId: z.string().uuid().optional(),
  from:       z.string().datetime().optional(),  // ISO date — start of range
  to:         z.string().datetime().optional(),  // ISO date — end of range
  search:     z.string().optional(),             // matches title
})

export type CreateExpenseInput     = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput     = z.infer<typeof updateExpenseSchema>
export type RejectExpenseInput     = z.infer<typeof rejectExpenseSchema>
export type ListExpensesQueryInput = z.infer<typeof listExpensesQuerySchema>
