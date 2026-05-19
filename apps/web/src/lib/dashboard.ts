import api from './api'

export interface DashboardStats {
  employees: { total: number; active: number }
  expenses: {
    pending:    { count: number; total: number }
    approved:   { count: number; total: number }
    rejected:   { count: number; total: number }
    monthly:    Array<{ month: string; total: number; count: number }>
    byCategory: Array<{ name: string; color: string; total: number; count: number }>
  }
  inventory: { totalValue: number; lowStockCount: number }
  attendance: Array<{ date: string; present: number; absent: number; late: number }>
}

export interface ActivityItem {
  id:           string
  action:       string
  resourceType: string
  details:      Record<string, unknown> | null
  createdAt:    string
  user:         { firstName: string; lastName: string }
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<{ data: DashboardStats }>('/api/v1/dashboard/stats')
  return data.data
}

export async function fetchDashboardActivity(): Promise<ActivityItem[]> {
  const { data } = await api.get<{ data: { items: ActivityItem[] } }>('/api/v1/dashboard/activity')
  return data.data.items
}
