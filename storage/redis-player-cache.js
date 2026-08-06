export class RedisPlayerCache {
  constructor({ prefix = 'xiuxian:player:', ttlSeconds = 30, client } = {}) {
    this.prefix = prefix
    this.ttlSeconds = Math.max(1, Math.floor(Number(ttlSeconds) || 30))
    this.client = client
    this.warned = false
  }

  getClient() {
    return this.client ?? globalThis.redis ?? null
  }

  key(playerId) {
    return `${this.prefix}${playerId}`
  }

  async get(playerId) {
    const redis = this.getClient()
    if (!redis?.get) return null
    try {
      const raw = await redis.get(this.key(playerId))
      if (!raw) return null
      const value = JSON.parse(raw)
      return value && typeof value === 'object' ? value : null
    } catch (error) {
      this.warn(error)
      return null
    }
  }

  async set(playerId, value) {
    const redis = this.getClient()
    if (!redis?.set) return false
    try {
      await redis.set(this.key(playerId), JSON.stringify(value), { EX: this.ttlSeconds })
      return true
    } catch (error) {
      // 兼容旧版 node-redis/ioredis 的参数形式。
      try {
        await redis.set(this.key(playerId), JSON.stringify(value), 'EX', this.ttlSeconds)
        return true
      } catch (fallbackError) {
        this.warn(fallbackError)
        return false
      }
    }
  }

  async delete(playerId) {
    const redis = this.getClient()
    if (!redis?.del) return false
    try {
      await redis.del(this.key(playerId))
      return true
    } catch (error) {
      this.warn(error)
      return false
    }
  }

  warn(error) {
    if (this.warned) return
    this.warned = true
    console.warn(`[修仙插件] Redis 缓存暂不可用，已回源 SQLite：${error.message}`)
  }
}

export default RedisPlayerCache
