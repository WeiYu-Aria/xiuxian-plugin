import test from 'node:test'
import assert from 'node:assert/strict'
import config from '../config/config.js'
import { Player } from '../model/player.js'
import { RealmManager } from '../model/realm.js'

async function cleanup(id) { await Player.delete(id) }

test('player ids accept QQ ids and platform OpenIDs but reject unsafe input', () => {
  for (const id of [
    '123456789',
    '3889280554:0A3EC393A1335505165B6D0B0287D322',
    '388928ABC_D322',
    'openid-with-dashes'
  ]) {
    assert.equal(Player.normalizeId(id), id)
  }
  for (const id of ['../escape', '..', '1/../../x', '1\\x', '%2e%2e', '含中文', '', null, 'a'.repeat(129)]) {
    assert.throws(() => Player.normalizeId(id), /玩家 ID/)
  }
})

test('database transaction queue serializes synchronous work and survives errors', async () => {
  const events = []
  await Promise.all([
    Player.withLock('70001', () => { events.push('a') }),
    Player.withLock('70001', () => { events.push('b') })
  ])
  assert.deepEqual(events, ['a', 'b'])
  await assert.rejects(Player.withLock('70001', () => { throw new Error('expected') }), /expected/)
  assert.equal(await Player.withLock('70001', () => 42), 42)
})

test('mortal players have a positive threshold, grow normally, and old zero saves migrate', async () => {
  const id = '70003'
  await cleanup(id)
  try {
    const player = new Player(id)
    assert.equal(player.nextExp, RealmManager.getRealm(1).baseExp)
    player.addExp(40)
    assert.equal(player.exp, 40)
    await Player.save({ ...player, nextExp: 0 })
    assert.equal((await Player.load(id)).nextExp, RealmManager.getRealm(1).baseExp)
  } finally { await cleanup(id) }
})

test('zero drop configuration is honored and min/max are normalized', () => {
  const original = config.all()
  const player = new Player('70004')
  const random = Math.random
  try {
    config._cfg.stoneDropChance = 0
    Math.random = () => 0.5
    assert.equal(player.dropStones(), null)

    config._cfg.stoneDropChance = 1
    config._cfg.stoneDropMin = 5
    config._cfg.stoneDropMax = 2
    Math.random = () => 0
    const drop = player.dropStones()
    assert.equal(drop.amount, 2)
  } finally {
    Math.random = random
    config._cfg = original
  }
})
