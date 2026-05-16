import { z } from 'zod'

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  department: z.string().optional(),
  position: z.string().optional(),
  hireDate: z.string().datetime().optional(),
  salary: z.number().positive().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  userId: z.string().uuid().optional(),
})

// All fields optional on update — only send what changed
export const updateEmployeeSchema = createEmployeeSchema.partial()

export const listEmployeesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  department: z.string().optional(),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
})

export const attendanceSchema = z.object({
  notes: z.string().optional(),
})

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>
export type AttendanceInput = z.infer<typeof attendanceSchema>
