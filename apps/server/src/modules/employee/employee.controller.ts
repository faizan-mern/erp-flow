import { Response, NextFunction } from 'express'
import * as service from './employee.service'
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  listEmployeesQuerySchema,
  attendanceSchema,
} from './employee.validator'
import { sendSuccess } from '../../utils/response'
import { logActivity } from '../../utils/activity'
import { AuthRequest } from '../../types'

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const query = listEmployeesQuerySchema.parse(req.query)
    const result = await service.listEmployees(req.user.companyId, query)
    sendSuccess(res, result, 'Employees retrieved')
  } catch (err) {
    next(err)
  }
}

export async function getOne(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const targetId = req.params['id'] as string

    // EMPLOYEEs can only view their own record (which still leaks salary —
    // intentional, since it's their own salary). Admins and managers can view
    // anyone in their company.
    if (req.user.role === 'EMPLOYEE') {
      const ownEmployeeId = await service.resolveCallerEmployeeId(req.user.userId, req.user.companyId)
      if (ownEmployeeId !== targetId) {
        throw Object.assign(new Error('Forbidden — employees can only view their own record'), { status: 403 })
      }
    }

    const employee = await service.getEmployee(targetId, req.user.companyId)
    sendSuccess(res, employee, 'Employee retrieved')
  } catch (err) {
    next(err)
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const employeeId = await service.resolveCallerEmployeeId(req.user.userId, req.user.companyId)
    const employee = await service.getEmployee(employeeId, req.user.companyId)
    sendSuccess(res, employee, 'Current employee retrieved')
  } catch (err) {
    next(err)
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = createEmployeeSchema.parse(req.body)
    const employee = await service.createEmployee(req.user.companyId, input)
    logActivity({
      companyId: req.user.companyId,
      userId: req.user.userId,
      action: 'CREATE',
      resourceType: 'employee',
      resourceId: employee.id,
      details: { firstName: input.firstName, lastName: input.lastName },
      ipAddress: req.ip,
    })
    sendSuccess(res, employee, 'Employee created', 201)
  } catch (err) {
    next(err)
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params['id'] as string
    const input = updateEmployeeSchema.parse(req.body)
    const employee = await service.updateEmployee(id, req.user.companyId, input)
    logActivity({
      companyId: req.user.companyId,
      userId: req.user.userId,
      action: 'UPDATE',
      resourceType: 'employee',
      resourceId: id,
      details: input as Record<string, string | number | boolean | null>,
      ipAddress: req.ip,
    })
    sendSuccess(res, employee, 'Employee updated')
  } catch (err) {
    next(err)
  }
}

export async function deactivate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params['id'] as string
    await service.deactivateEmployee(id, req.user.companyId)
    logActivity({
      companyId: req.user.companyId,
      userId: req.user.userId,
      action: 'DELETE',
      resourceType: 'employee',
      resourceId: id,
      ipAddress: req.ip,
    })
    sendSuccess(res, null, 'Employee deactivated')
  } catch (err) {
    next(err)
  }
}

export async function checkIn(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = attendanceSchema.parse(req.body)
    const employeeId = await service.resolveCallerEmployeeId(req.user.userId, req.user.companyId)
    const record = await service.checkIn(req.user.companyId, employeeId, input)
    sendSuccess(res, record, 'Checked in successfully', 201)
  } catch (err) {
    next(err)
  }
}

export async function checkOut(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    attendanceSchema.parse(req.body)
    const employeeId = await service.resolveCallerEmployeeId(req.user.userId, req.user.companyId)
    const record = await service.checkOut(req.user.companyId, employeeId)
    sendSuccess(res, record, 'Checked out successfully')
  } catch (err) {
    next(err)
  }
}

export async function getAttendance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const targetId = req.params['id'] as string

    if (req.user.role === 'EMPLOYEE') {
      const ownEmployeeId = await service.resolveCallerEmployeeId(req.user.userId, req.user.companyId)
      if (ownEmployeeId !== targetId) {
        throw Object.assign(new Error('Forbidden — employees can only view their own attendance'), { status: 403 })
      }
    }

    const records = await service.getAttendance(targetId, req.user.companyId)
    sendSuccess(res, records, 'Attendance retrieved')
  } catch (err) {
    next(err)
  }
}
