import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

// Centralized error handler — registered last in app.ts
// Any error thrown with next(err) lands here
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message)

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    })
    return
  }

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
}
