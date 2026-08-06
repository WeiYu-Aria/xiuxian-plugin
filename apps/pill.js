import { ItemManager } from '../model/item.js'
import { mutatePlayer, readPlayer } from '../services/player-service.js'

export class PillApp {
  constructor(e) { this.e = e }

  async goBuy() {
    const userId = this.e.user_id || this.e.sender?.user_id
    const args = this.e.msg.replace(/^#买丹药\s*/, '').trim().split(/\s+/)
    const id = args[0]
    const qty = args[1] === undefined ? 1 : Number(args[1])
    const result = await mutatePlayer(userId, player => {
      const outcome = ItemManager.buy(player, id, qty)
      return { ...outcome, save: outcome.ok }
    })
    await this.e.reply(result.missing ? '先 #修炼 踏入仙途再说！' : result.msg)
    return true
  }

  async goUse() {
    const userId = this.e.user_id || this.e.sender?.user_id
    const id = this.e.msg.replace(/^#服用\s*/, '').trim()
    const result = await mutatePlayer(userId, player => {
      player.checkDailyReset()
      const outcome = ItemManager.use(player, id)
      return { ...outcome, save: outcome.ok }
    })
    await this.e.reply(result.missing ? '你还未踏入仙途。' : result.msg)
    return true
  }

  async goMy() {
    const userId = this.e.user_id || this.e.sender?.user_id
    const player = await readPlayer(userId)
    if (!player) { await this.e.reply('你还未踏入仙途。'); return true }
    let msg = `${player.name} 的丹药\n━━━━━━━━━━━━━━\n${ItemManager.formatPlayerBag(player)}`
    msg += `\n\n灵石：${player.spiritStones}\n#买丹药 [id] [数量] — 购买\n#服用 [id] — 使用`
    msg += `\n常用丹药id：jinzhu_dan, jinyuan_dan, huisheng_dan`
    await this.e.reply(msg)
    return true
  }
}
