import { Response } from 'express'
import { ApiResponse } from '../types'

export function sendSuccess<T>(res: Response, data: T, message = 'Success', status = 200) {
  const body: ApiResponse<T> = { success: true, message, data }
  return res.status(status).json(body)
}

export function sendError(res: Response, message: string, status = 400) {
  const body: ApiResponse = { success: false, message, error: message }
  return res.status(status).json(body)
}
