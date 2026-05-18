import api from './api'

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM'

export interface AiMessage {
  id: string
  chatId: string
  role: MessageRole
  content: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface AiChat {
  id: string
  companyId: string
  userId: string
  title: string
  createdAt: string
  updatedAt: string
  messages?: AiMessage[]
}

export async function createChat(title: string = 'New Chat'): Promise<AiChat> {
  const { data } = await api.post('/api/v1/ai/chats', { title })
  return data.data
}

export async function getChats(): Promise<AiChat[]> {
  const { data } = await api.get('/api/v1/ai/chats')
  return data.data
}

export async function getChat(id: string): Promise<AiChat> {
  const { data } = await api.get(`/api/v1/ai/chats/${id}`)
  return data.data
}

export async function deleteChat(id: string): Promise<void> {
  await api.delete(`/api/v1/ai/chats/${id}`)
}

export async function sendMessage(chatId: string, content: string): Promise<AiChat> {
  const { data } = await api.post(`/api/v1/ai/chats/${chatId}/messages`, { content })
  return data.data
}
