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
  const res = await api.get('/api/employees', { params })
  return res.data.data
}

export async function fetchEmployee(id: string): Promise<Employee> {
  const res = await api.get(`/api/employees/${id}`)
  return res.data.data
}

export async function createEmployee(data: CreateEmployeeData): Promise<Employee> {
  const res = await api.post('/api/employees', data)
  return res.data.data
}

export async function updateEmployee(id: string, data: Partial<CreateEmployeeData>): Promise<Employee> {
  const res = await api.put(`/api/employees/${id}`, data)
  return res.data.data
}

export async function deactivateEmployee(id: string): Promise<void> {
  await api.delete(`/api/employees/${id}`)
}
