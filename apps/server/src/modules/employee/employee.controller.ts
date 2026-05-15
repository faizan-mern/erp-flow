import { Response, NextFunction } from 'express'
import * as service from './employee.service'
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  listEmployeesQuerySchema,
  attendanceSchema,
} from './employee.validator'
import { sendSuccess } from '../../utils/response'
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
    const employee = await service.getEmployee(req.params.id, req.user.companyId)
    sendSuccess(res, employee, 'Employee retrieved')
  } catch (err) {
    next(err)
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = createEmployeeSchema.parse(req.body)
    const employee = await service.createEmployee(req.user.companyId, input)
    sendSuccess(res, employee, 'Employee created', 201)
  } catch (err) {
    next(err)
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = updateEmployeeSchema.parse(req.body)
    const employee = await service.updateEmployee(req.params.id, req.user.companyId, input)
    sendSuccess(res, employee, 'Employee updated')
  } catch (err) {
    next(err)
  }
}

export async function deactivate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await service.deactivateEmployee(req.params.id, req.user.companyId)
    sendSuccess(res, null, 'Employee deactivated')
  } catch (err) {
    next(err)
  }
}

export async function checkIn(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = attendanceSchema.parse(req.body)
    const record = await service.checkIn(req.user.companyId, input)
    sendSuccess(res, record, 'Checked in successfully', 201)
  } catch (err) {
    next(err)
  }
}

export async function checkOut(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = attendanceSchema.parse(req.body)
    const record = await service.checkOut(req.user.companyId, input)
    sendSuccess(res, record, 'Checked out successfully')
  } catch (err) {
    next(err)
  }
}

export async function getAttendance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const records = await service.getAttendance(req.params.id, req.user.companyId)
    sendSuccess(res, records, 'Attendance retrieved')
  } catch (err) {
    next(err)
  }
}
