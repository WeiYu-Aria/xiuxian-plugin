import test from 'node:test'
import assert from 'node:assert/strict'
import config from '../config/config.js'
import { BreakthroughApp } from '../apps/breakthrough.js'
import { CultivateApp } from '../apps/cultivate.js'
import { Player } from '../model/player.js'

async function cleanup(...ids) {
  for (const id of ids) await Player.delete(id)
}

test('concurrent cultivate commands retain both complete read-modify-write transactions', async () => {
  const id = '71001'
  const original = config.all()
  const random = Math.random
  await cleanup(id)
  try {
    const p = new Player(id)
    p.realmId = 1
    p.nextExp = 100
    await Player.save(p)
    config._cfg.cultivateCd = 0
    config._cfg.cultivateExpMin = 10
    config._cfg.cultivateExpMax = 10
    config._cfg.stoneDropChance = 0
    Math.random = () => 0.5
    const event = () => ({ user_id: id, reply: async () => {} })
    await Promise.all([new CultivateApp(event()).go(), new CultivateApp(event()).go()])
    const saved = await Player.load(id)
    assert.equal(saved.exp, 36)
    assert.equal(saved.totalCultivateTimes, 2)
  } finally {
    Math.random = random
    config._cfg = original
    await cleanup(id)
  }
})

test('breakthrough consumes buffs and applies result in one final save', async () => {
  const id = '71002'
  const originalRandom = Math.random
  const originalSave = Player.save
  await cleanup(id)
  try {
    const p = new Player(id)
    p.realmId = 1
    p.level = 9
    p.nextExp = 100
    p.exp = 100
    p.activePillBuffs = { breakthrough: 0.1, revive: true }
    await originalSave.call(Player, p)

    let saves = 0
    Player.save = player => { saves++; return originalSave.call(Player, player) }
    Math.random = () => 0.99
    const replies = []
    await new BreakthroughApp({ user_id: id, reply: async msg => replies.push(msg) }).go()

    const saved = await Player.load(id)
    assert.equal(saves, 1)
    assert.equal(saved.activePillBuffs.breakthrough, 0)
    assert.equal(saved.activePillBuffs.revive, false)
    assert.equal(saved.realmId, 1)
    assert.equal(saved.exp, 100)
    assert.match(replies[0], /回生丹/)
  } finally {
    Math.random = originalRandom
    Player.save = originalSave
    await cleanup(id)
  }
})

test('major failure loss honors an explicit zero ratio', async () => {
  const id = '71003'
  const original = config.all()
  const random = Math.random
  await cleanup(id)
  try {
    const p = new Player(id)
    p.realmId = 1
    p.level = 9
    p.nextExp = 100
    p.exp = 100
    await Player.save(p)
    config._cfg.majorFailLoseRatio = 0
    Math.random = () => 0.99
    await new BreakthroughApp({ user_id: id, reply: async () => {} }).go()
    assert.equal((await Player.load(id)).exp, 100)
  } finally {
    Math.random = random
    config._cfg = original
    await cleanup(id)
  }
})
