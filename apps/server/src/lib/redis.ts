import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
})

redis.on('error', (err) => {
  console.warn('[Redis]', err.message)
})

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get(key)
    return val ? (JSON.parse(val) as T) : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  } catch {}
}

export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) await redis.del(...keys)
  } catch {}
}

export default redis
