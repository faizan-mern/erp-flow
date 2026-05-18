import { MessageRole } from '@prisma/client'
import { prisma } from '../../prisma/client'
import { cacheGet, cacheSet } from '../../lib/redis'

export async function createChat(companyId: string, userId: string, title: string) {
  return prisma.aiChat.create({
    data: { companyId, userId, title },
  })
}

export async function listChats(companyId: string, userId: string) {
  return prisma.aiChat.findMany({
    where: { companyId, userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  })
}

export async function getChat(id: string, companyId: string, userId: string) {
  return prisma.aiChat.findFirst({
    where: { id, companyId, userId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function saveMessage(
  chatId: string,
  companyId: string,
  userId: string,
  role: MessageRole,
  content: string,
) {
  return prisma.$transaction(async (tx) => {
    const chat = await tx.aiChat.findFirst({
      where: { id: chatId, companyId, userId },
      select: { id: true },
    })
    if (!chat) {
      throw Object.assign(new Error('Chat not found'), { status: 404 })
    }

    const msg = await tx.aiMessage.create({
      data: { chatId: chat.id, role, content },
    })

    await tx.aiChat.updateMany({
      where: { id: chat.id, companyId, userId },
      data: { updatedAt: new Date() },
    })

    return msg
  })
}

export async function updateChatTitle(id: string, companyId: string, userId: string, title: string) {
  return prisma.aiChat.updateMany({
    where: { id, companyId, userId },
    data: { title },
  })
}

export async function deleteChat(id: string, companyId: string, userId: string) {
  return prisma.aiChat.deleteMany({
    where: { id, companyId, userId },
  })
}

export async function getEmployeeCount(companyId: string) {
  const key = `ai:emp_count:${companyId}`
  const cached = await cacheGet<number>(key)
  if (cached !== null) return cached

  const count = await prisma.employee.count({ where: { companyId, isActive: true } })
  await cacheSet(key, count, 60)
  return count
}

export async function getLowStockCount(companyId: string) {
  const key = `inv:low_stock:${companyId}`
  const cached = await cacheGet<number>(key)
  if (cached !== null) return cached

  const result = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM products
    WHERE "companyId" = ${companyId}
      AND "isActive" = true
      AND quantity <= "lowStockThreshold"
  `
  const count = Number(result[0]?.count ?? 0)
  await cacheSet(key, count, 30)
  return count
}

export async function getPendingExpenseTotals(companyId: string) {
  const key = `ai:pending_exp:${companyId}`
  const cached = await cacheGet<{ count: number; totalAmount: number }>(key)
  if (cached !== null) return cached

  const result = await prisma.expense.aggregate({
    where: { companyId, status: 'PENDING' },
    _sum: { amount: true },
    _count: { _all: true },
  })
  const data = {
    count: result._count._all,
    totalAmount: result._sum.amount?.toNumber() ?? 0,
  }
  await cacheSet(key, data, 30)
  return data
}
