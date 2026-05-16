import api from './api'

export interface Employee {
  id: string
  companyId: string
  userId?: string
  firstName: string
  lastName: string
  department?: string
  position?: string
  hireDate?: string
  salary?: number
  phone?: string
  address?: string
  isActive: boolean
  createdAt: string
  user?: { email: string; role: string }
}

export interface EmployeeListResponse {
  employees: Employee[]
  total: number
  page: number
  limit: number
}

export interface CreateEmployeeData {
  firstName: string
  lastName: string
  department?: string
  position?: string
  hireDate?: string
  salary?: number
  phone?: string
  address?: string
}

export async function fetchEmployees(params?: {
  page?: number
  limit?: number
  search?: string
  department?: string
  isActive?: string
}): Promise<EmployeeListResponse> {
  const res = await api.get('/api/v1/employees', { params })
  return res.data.data
}

export async function fetchEmployee(id: string): Promise<Employee> {
  const res = await api.get(`/api/v1/employees/${id}`)
  return res.data.data
}

export async function createEmployee(data: CreateEmployeeData): Promise<Employee> {
  const res = await api.post('/api/v1/employees', data)
  return res.data.data
}

export async function updateEmployee(id: string, data: Partial<CreateEmployeeData>): Promise<Employee> {
  const res = await api.put(`/api/v1/employees/${id}`, data)
  return res.data.data
}

export async function deactivateEmployee(id: string): Promise<void> {
  await api.delete(`/api/v1/employees/${id}`)
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: string
  notes?: string
}

export async function fetchAttendance(employeeId: string): Promise<AttendanceRecord[]> {
  const res = await api.get(`/api/v1/employees/${employeeId}/attendance`)
  return res.data.data
}

export async function checkIn(employeeId: string): Promise<AttendanceRecord> {
  const res = await api.post('/api/v1/employees/attendance/checkin', { employeeId })
  return res.data.data
}

export async function checkOut(employeeId: string): Promise<AttendanceRecord> {
  const res = await api.post('/api/v1/employees/attendance/checkout', { employeeId })
  return res.data.data
}
