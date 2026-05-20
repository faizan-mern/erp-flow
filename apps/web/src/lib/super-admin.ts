import api from './api'

export interface PlatformCompany {
  id: string
  name: string
  slug: string
  plan: string
  isActive: boolean
  createdAt: string
  _count: { users: number; employees: number; expenses: number }
}

export interface PlatformStats {
  totalCompanies: number
  activeCompanies: number
  totalUsers: number
  totalExpenses: number
  totalEmployees: number
}

export async function fetchCompanies(params?: { page?: number; search?: string }) {
  const res = await api.get('/api/v1/super-admin/companies', { params })
  return res.data.data as { companies: PlatformCompany[]; total: number }
}

export async function fetchPlatformStats() {
  const res = await api.get('/api/v1/super-admin/stats')
  return res.data.data as PlatformStats
}

export async function toggleCompany(id: string, isActive: boolean) {
  const res = await api.patch(`/api/v1/super-admin/companies/${id}/toggle`, { isActive })
  return res.data.data as PlatformCompany
}
