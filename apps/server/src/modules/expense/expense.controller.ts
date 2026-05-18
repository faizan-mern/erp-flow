import { Response, NextFunction } from 'express'
import * as service from './expense.service'
import * as employeeRepo from '../employee/employee.repository'
import {
  createExpenseSchema,
  updateExpenseSchema,
  rejectExpenseSchema,
  listExpensesQuerySchema,
} from './expense.validator'
import { sendSuccess } from '../../utils/response'
import { logActivity } from '../../utils/activity'
import { uploadInvoice, isCloudinaryConfigured } from '../../lib/cloudinary'
import { AuthRequest } from '../../types'

// Resolves the caller's employeeId (or null if no Employee row is linked).
// Used to (a) attribute expenses to a person, (b) enforce own-only viewing,
// (c) enforce segregation of duties on approve/reject.
async function getCallerEmployeeId(req: AuthRequest): Promise<string | null> {
  const emp = await employeeRepo.findEmployeeByUserId(req.user.userId, req.user.companyId)
  return emp?.id ?? null
}

// ─── LIST + GET ─────────────────────────────────────────────────────────────

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const filters = listExpensesQuerySchema.parse(req.query)
    const employeeId = await getCallerEmployeeId(req)
    const result = await service.listExpensesForRequester(
      req.user.companyId,
      filters,
      { role: req.user.role, employeeId }
    )
    sendSuccess(res, result, 'Expenses retrieved')
  } catch (err) { next(err) }
}

export async function getOne(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const employeeId = await getCallerEmployeeId(req)
    const expense = await service.getExpenseForRequester(
      req.params['id'] as string,
      req.user.companyId,
      { role: req.user.role, employeeId }
    )
    sendSuccess(res, expense, 'Expense retrieved')
  } catch (err) { next(err) }
}

// ─── SUBMIT + EDIT ──────────────────────────────────────────────────────────

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = createExpenseSchema.parse(req.body)
    const employeeId = await getCallerEmployeeId(req)
    if (!employeeId) {
      throw Object.assign(new Error('No employee profile linked to your user — cannot submit expenses'), { status: 400 })
    }
    const expense = await service.submitExpense(req.user.companyId, employeeId, input)
    logActivity({
      companyId: req.user.companyId,
      userId: req.user.userId,
      action: 'CREATE',
      resourceType: 'expense',
      resourceId: expense.id,
      details: { title: input.title, amount: input.amount },
      ipAddress: req.ip,
    })
    sendSuccess(res, expense, 'Expense submitted', 201)
  } catch (err) { next(err) }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params['id'] as string
    const input = updateExpenseSchema.parse(req.body)
    const employeeId = await getCallerEmployeeId(req)
    const expense = await service.updateExpense(id, req.user.companyId, employeeId, input)
    logActivity({
      companyId: req.user.companyId,
      userId: req.user.userId,
      action: 'UPDATE',
      resourceType: 'expense',
      resourceId: id,
      ipAddress: req.ip,
    })
    sendSuccess(res, expense, 'Expense updated')
  } catch (err) { next(err) }
}

// ─── APPROVE / REJECT ───────────────────────────────────────────────────────

export async function approve(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params['id'] as string
    const employeeId = await getCallerEmployeeId(req)
    const expense = await service.approveExpense(id, req.user.companyId, req.user.userId, employeeId)
    logActivity({
      companyId: req.user.companyId,
      userId: req.user.userId,
      action: 'APPROVE',
      resourceType: 'expense',
      resourceId: id,
      ipAddress: req.ip,
    })
    sendSuccess(res, expense, 'Expense approved')
  } catch (err) { next(err) }
}

export async function reject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params['id'] as string
    const { reason } = rejectExpenseSchema.parse(req.body ?? {})
    const employeeId = await getCallerEmployeeId(req)
    const expense = await service.rejectExpense(id, req.user.companyId, req.user.userId, employeeId, reason)
    logActivity({
      companyId: req.user.companyId,
      userId: req.user.userId,
      action: 'REJECT',
      resourceType: 'expense',
      resourceId: id,
      details: reason ? { reason } : undefined,
      ipAddress: req.ip,
    })
    sendSuccess(res, expense, 'Expense rejected')
  } catch (err) { next(err) }
}

// ─── ANALYTICS + CATEGORIES ─────────────────────────────────────────────────

export async function analytics(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const year  = req.query['year']  ? Number(req.query['year'])  : undefined
    const month = req.query['month'] ? Number(req.query['month']) : undefined
    const data = await service.getMonthlyAnalytics(req.user.companyId, year, month)
    sendSuccess(res, data, 'Monthly analytics')
  } catch (err) { next(err) }
}

export async function categories(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await service.listCategories(req.user.companyId)
    sendSuccess(res, data, 'Categories')
  } catch (err) { next(err) }
}

// ─── FILE UPLOAD ────────────────────────────────────────────────────────────

export async function uploadInvoiceFile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const file = (req as AuthRequest & { file?: Express.Multer.File }).file
    if (!file) {
      throw Object.assign(new Error('No file selected. Please choose a PDF or image up to 10 MB.'), { status: 400 })
    }

    // Friendly error when Cloudinary env vars are missing (common in local/dev).
    // Surface as 503 so the UI can show a "service unavailable" message rather than a vague 500.
    if (!isCloudinaryConfigured()) {
      throw Object.assign(
        new Error('Invoice upload is not configured on the server. Please add Cloudinary credentials or skip the invoice.'),
        { status: 503 }
      )
    }

    try {
      const url = await uploadInvoice(file.buffer, file.originalname)
      sendSuccess(res, { url }, 'Invoice uploaded')
    } catch (uploadErr) {
      console.error('[cloudinary] upload failed:', uploadErr)
      // In dev, surface the real Cloudinary error inline so you can debug from
      // the Network tab without scrolling the server terminal. Production still
      // returns just the friendly message to avoid leaking credentials/internals.
      const friendly = 'Could not upload your invoice. Please try again, or submit the expense without an invoice.'
      const detail = (uploadErr as { message?: string })?.message ?? String(uploadErr)
      const message = process.env.NODE_ENV === 'production'
        ? friendly
        : `${friendly} [dev cause: ${detail}]`
      throw Object.assign(new Error(message), { status: 502 })
    }
  } catch (err) { next(err) }
}
