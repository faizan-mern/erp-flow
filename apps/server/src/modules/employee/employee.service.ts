import * as repo from './employee.repository'
import { CreateEmployeeInput, UpdateEmployeeInput, ListEmployeesQuery, AttendanceInput } from './employee.validator'

export async function listEmployees(companyId: string, query: ListEmployeesQuery) {
  return repo.listEmployees(companyId, query)
}

export async function getEmployee(id: string, companyId: string) {
  const employee = await repo.findEmployeeById(id, companyId)
  if (!employee) throw Object.assign(new Error('Employee not found'), { status: 404 })
  return employee
}

export async function createEmployee(companyId: string, data: CreateEmployeeInput) {
  return repo.createEmployee(companyId, data)
}

export async function updateEmployee(id: string, companyId: string, data: UpdateEmployeeInput) {
  await getEmployee(id, companyId)
  return repo.updateEmployee(id, companyId, data)
}

export async function deactivateEmployee(id: string, companyId: string) {
  await getEmployee(id, companyId)
  return repo.deactivateEmployee(id, companyId)
}

export async function checkIn(companyId: string, employeeId: string, input: AttendanceInput) {
  await getEmployee(employeeId, companyId)

  const existing = await repo.findTodayAttendance(employeeId)
  if (existing) throw Object.assign(new Error('Already checked in today'), { status: 409 })

  return repo.createAttendanceRecord(employeeId, companyId, input.notes)
}

export async function checkOut(companyId: string, employeeId: string) {
  await getEmployee(employeeId, companyId)

  const existing = await repo.findTodayAttendance(employeeId)
  if (!existing) throw Object.assign(new Error('No check-in found for today'), { status: 400 })
  if (existing.checkOut) throw Object.assign(new Error('Already checked out today'), { status: 409 })

  return repo.updateAttendanceCheckout(existing.id)
}

export async function resolveCallerEmployeeId(userId: string, companyId: string) {
  const employee = await repo.findEmployeeByUserId(userId, companyId)
  if (!employee) throw Object.assign(new Error('No employee profile linked to this user'), { status: 404 })
  return employee.id
}

export async function getAttendance(employeeId: string, companyId: string) {
  await getEmployee(employeeId, companyId)
  return repo.listAttendance(employeeId, companyId)
}
