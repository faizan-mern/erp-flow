import api from './api'

export type UserRole = 'COMPANY_ADMIN' | 'MANAGER' | 'EMPLOYEE'

export interface TeamUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isVerified: boolean
  lastLoginAt: string | null
  createdAt: string
  employee: { id: string; isActive: boolean } | null
}

export interface InviteUserData {
  email: string
  password: string
  firstName: string
  lastName: string
  role: 'MANAGER' | 'EMPLOYEE'
}

export async function fetchUsers(): Promise<TeamUser[]> {
  const res = await api.get('/api/v1/users')
  return res.data.data
}

export async function inviteUser(data: InviteUserData): Promise<TeamUser> {
  const res = await api.post('/api/v1/users', data)
  return res.data.data
}

export async function updateUserRole(id: string, role: UserRole): Promise<TeamUser> {
  const res = await api.patch(`/api/v1/users/${id}`, { role })
  return res.data.data
}
