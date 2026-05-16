import { z } from 'zod'

// Admin invites a new user. SUPER_ADMIN and COMPANY_ADMIN are deliberately
// excluded — invite is for adding teammates with limited privilege.
// To promote someone to admin, an existing admin uses the PATCH endpoint.
export const inviteUserSchema = z.object({
  email:     z.string().email(),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  role:      z.enum(['MANAGER', 'EMPLOYEE']),
})

// PATCH lets an admin change role (including to COMPANY_ADMIN) or active state.
// SUPER_ADMIN is still excluded — that's a platform-level role, not a tenant one.
export const updateUserSchema = z.object({
  role:     z.enum(['COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
  isActive: z.boolean().optional(),
})

export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
