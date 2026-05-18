import { cacheGet, cacheSet } from '../../lib/redis'
import * as repo from './dashboard.repository'

export async function getStats(companyId: string) {
  const key = `dashboard:stats:${companyId}`
  const cached = await cacheGet<Awaited<ReturnType<typeof repo.getStats>>>(key)
  if (cached) return cached

  const data = await repo.getStats(companyId)
  await cacheSet(key, data, 60)
  return data
}

export async function getActivity(companyId: string) {
  const key = `dashboard:activity:${companyId}`
  const cached = await cacheGet<Awaited<ReturnType<typeof repo.getActivity>>>(key)
  if (cached) return cached

  const data = await repo.getActivity(companyId)
  await cacheSet(key, data, 30)
  return data
}
