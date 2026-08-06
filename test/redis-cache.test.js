import test from 'node:test'
import assert from 'node:assert/strict'
import { RedisPlayerCache } from '../storage/redis-player-cache.js'

function fakeRedis() {
  const values = new Map()
  const calls = []
  return {
    values,
    calls,
    async get(key) { calls.push(['get', key]); return values.get(key) ?? null },
    async set(key, value, options) { calls.push(['set', key, options]); values.set(key, value); return 'OK' },
    async del(key) { calls.push(['del', key]); return values.delete(key) ? 1 : 0 }
  }
}

test('Redis player cache uses a namespaced key and TTL', async () => {
  const client = fakeRedis()
  const cache = new RedisPlayerCache({ client, prefix: 'test:player:', ttlSeconds: 45 })
  await cache.set('3889280554:OPENID', { qq: '3889280554:OPENID', exp: 12 })
  assert.deepEqual(client.calls[0], ['set', 'test:player:3889280554:OPENID', { EX: 45 }])
  assert.equal((await cache.get('3889280554:OPENID')).exp, 12)
  await cache.delete('3889280554:OPENID')
  assert.equal(await cache.get('3889280554:OPENID'), null)
})

test('Redis errors degrade to cache misses without throwing', async () => {
  const client = {
    async get() { throw new Error('offline') },
    async set() { throw new Error('offline') },
    async del() { throw new Error('offline') }
  }
  const cache = new RedisPlayerCache({ client })
  assert.equal(await cache.get('1'), null)
  assert.equal(await cache.set('1', { qq: '1' }), false)
  assert.equal(await cache.delete('1'), false)
})

test('Player writes through Redis and can read a cache hit without querying SQLite', async () => {
  const redis = fakeRedis()
  globalThis.redis = redis
  const { Player, playerRepository } = await import('../model/player.js')
  const id = `redis_${Date.now()}`
  await Player.delete(id)
  try {
    const value = new Player(id)
    value.exp = 27
    await Player.save(value)
    assert.equal(JSON.parse(redis.values.get(`xiuxian:player:${id}`)).exp, 27)

    const originalRead = playerRepository.read
    playerRepository.read = () => { throw new Error('SQLite should not be read on a cache hit') }
    try {
      assert.equal((await Player.load(id)).exp, 27)
    } finally {
      playerRepository.read = originalRead
    }
  } finally {
    await Player.delete(id)
    delete globalThis.redis
  }
})
