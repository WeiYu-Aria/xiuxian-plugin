import test from 'node:test'
import assert from 'node:assert/strict'
import { Player } from '../model/player.js'
import { mutatePlayer } from '../services/player-service.js'

async function remove(id) { await Player.delete(id) }

test('player service is the save boundary for mutations', async () => {
  const id = '73001'
  await remove(id)
  try {
    const created = await mutatePlayer(id, player => {
      player.exp = 12
      return { save: true, msg: 'ok' }
    }, { create: true })
    assert.equal(created.created, true)
    assert.equal((await Player.load(id)).exp, 12)

    await mutatePlayer(id, player => {
      player.exp = 99
      return { save: false }
    })
    assert.equal((await Player.load(id)).exp, 12)
  } finally { await remove(id) }
})
