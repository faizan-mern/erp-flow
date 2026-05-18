import { z } from 'zod'

export const createChatSchema = z.object({
  title: z.string().max(100).default('New Chat'),
})

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
})
