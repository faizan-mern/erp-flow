import { Prisma } from '@prisma/client'
import { prisma } from '../prisma/client'

interface LogActivityInput {
  companyId: string
  userId: string
  action: string        // CREATE | UPDATE | DELETE | LOGIN | APPROVE | REJECT
  resourceType: string  // employee | expense | product | user
  resourceId?: string
  details?: Prisma.InputJsonObject
  ipAddress?: string
}

// Fire-and-forget — never await this. A failed log must never break the main request.
export function logActivity(input: LogActivityInput): void {
  prisma.activityLog.create({ data: input }).catch((err) => {
    console.warn('[ActivityLog] Failed to write:', err.message)
  })
}
