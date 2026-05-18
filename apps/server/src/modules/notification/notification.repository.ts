import { Prisma } from '@prisma/client'
import { prisma } from '../../prisma/client'

export async function createNotification(data: {
  companyId: string
  userId: string
  type: string
  title: string
  message: string
  notifData?: Record<string, unknown>
}) {
  return prisma.notification.create({
    data: {
      companyId: data.companyId,
      userId:    data.userId,
      type:      data.type,
      title:     data.title,
      message:   data.message,
      data:      data.notifData as Prisma.InputJsonValue | undefined,
    },
  })
}

export async function listForUser(userId: string, companyId: string) {
  return prisma.notification.findMany({
    where: { userId, companyId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}

export async function countUnread(userId: string, companyId: string) {
  return prisma.notification.count({
    where: { userId, companyId, isRead: false },
  })
}

export async function markAllRead(userId: string, companyId: string) {
  await prisma.notification.updateMany({
    where: { userId, companyId, isRead: false },
    data: { isRead: true },
  })
}
