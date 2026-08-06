import test from 'node:test'
import assert from 'node:assert/strict'
import config from '../config/config.js'
import { CultivateApp } from '../apps/cultivate.js'
import { PillApp } from '../apps/pill.js'
import { TechniqueApp } from '../apps/technique.js'
import { Player } from '../model/player.js'

async function remove(id) { await Player.delete(id) }
function event(id, msg = '') {
  const replies = []
  return { user_id: id, msg, replies, reply: async value => replies.push(value) }
}

test('core flow creates player, cultivates, buys/uses pill, and learns technique', async () => {
  const id = '72001'
  const original = config.all()
  const random = Math.random
  await remove(id)
  try {
    config._cfg.cultivateCd = 0
    config._cfg.cultivateExpMin = 10
    config._cfg.cultivateExpMax = 10
    config._cfg.stoneDropChance = 0
    Math.random = () => 0.5

    const create = event(id)
    await new CultivateApp(create).go()
    assert.match(create.replies[0], /正式踏入/)
    await new CultivateApp(event(id)).go()
    let player = await Player.load(id)
    assert.equal(player.totalCultivateTimes, 1)

    player.spiritStones = 1000
    await Player.save(player)
    const buy = event(id, '#买丹药 lingqi_dan 2')
    await new PillApp(buy).goBuy()
    assert.match(buy.replies[0], /购得/)
    const use = event(id, '#服用 lingqi_dan')
    await new PillApp(use).goUse()
    assert.match(use.replies[0], /成功/)

    const learn = event(id, '#修习 spirit_gather')
    await new TechniqueApp(learn).goLearn()
    player = await Player.load(id)
    assert.equal(player.techniqueId, 'spirit_gather')
    assert.equal(player.bag.lingqi_dan, 1)
  } finally {
    Math.random = random
    config._cfg = original
    await remove(id)
  }
})

test('pill purchase rejects fractional, negative, and huge quantities without mutation', async () => {
  const id = '72002'
  await remove(id)
  try {
    const player = new Player(id)
    player.spiritStones = 1000
    await Player.save(player)
    for (const qty of ['1.5', '-2', '999999999999999999999']) {
      const e = event(id, `#买丹药 lingqi_dan ${qty}`)
      await new PillApp(e).goBuy()
      assert.match(e.replies[0], /正整数|过大/)
    }
    assert.equal((await Player.load(id)).spiritStones, 1000)
  } finally { await remove(id) }
})
