import { Response, NextFunction } from 'express'
import * as service from './ai.service'
import { createChatSchema, sendMessageSchema } from './ai.validator'
import { sendSuccess } from '../../utils/response'
import { AuthRequest } from '../../types'

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = createChatSchema.parse(req.body)
    const chat = await service.createChat(req.user.companyId, req.user.userId, input.title)
    sendSuccess(res, chat, 'Chat created', 201)
  } catch (err) {
    next(err)
  }
}

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const chats = await service.listChats(req.user.companyId, req.user.userId)
    sendSuccess(res, chats, 'Chats retrieved')
  } catch (err) {
    next(err)
  }
}

export async function get(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const chat = await service.getChat(req.params.id as string, req.user.companyId, req.user.userId)
    sendSuccess(res, chat, 'Chat retrieved')
  } catch (err) {
    next(err)
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await service.deleteChat(req.params.id as string, req.user.companyId, req.user.userId)
    sendSuccess(res, null, 'Chat deleted')
  } catch (err) {
    next(err)
  }
}

export async function sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = sendMessageSchema.parse(req.body)
    const chat = await service.processMessage(
      req.params.id as string,
      req.user.companyId,
      req.user.userId,
      input.content
    )
    sendSuccess(res, chat, 'Message processed')
  } catch (err) {
    next(err)
  }
}
