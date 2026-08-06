import { Player } from '../model/player.js'

export async function mutatePlayer(userId, task, { create = false, name = '' } = {}) {
  return Player.withLock(userId, async id => {
    let player = await Player.load(id)
    const created = !player && create
    if (created) player = new Player(id, name)
    if (!player) return { missing: true, save: false }
    const result = task(player, { created }) ?? {}
    if (result.save === true) await Player.save(player)
    return { ...result, player, created }
  })
}

export async function readPlayer(userId) {
  return Player.load(userId)
}
