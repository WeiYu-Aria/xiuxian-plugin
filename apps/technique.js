import { Player } from '../model/player.js'
import { TechniqueManager } from '../model/technique.js'
import { mutatePlayer } from '../services/player-service.js'

export class TechniqueApp {
  constructor(e) { this.e = e }

  async goShop() {
    const list = TechniqueManager.formatList()
    let msg = `功法商店\n━━━━━━━━━━━━━━\n\n`
    msg += list + '\n\n'
    msg += `使用 #修习 [功法id] 来学习\n`
    msg += `例：#修习 spirit_gather`
    await this.e.reply(msg)
    return true
  }

  async goLearn() {
    const userId = this.e.user_id || this.e.sender?.user_id
    const id = this.e.msg.replace(/^#修习\s*/, '').trim()
    const result = await mutatePlayer(userId, player => {
      const outcome = TechniqueManager.learn(player, id)
      return { ...outcome, save: outcome.ok }
    })
    await this.e.reply(result.missing ? '先 #修炼 踏入仙途再说！' : result.msg)
    return true
  }

  async goMy() {
    const userId = this.e.user_id || this.e.sender?.user_id
    const player = await Player.load(userId)
    if (!player) { await this.e.reply('你还未踏入仙途。'); return true }

    const t = TechniqueManager.getById(player.techniqueId)
    let msg = `${player.name} 的功法\n━━━━━━━━━━━━━━\n`
    if (t) {
      msg += `当前修习：【${t.quality}】${t.name}\n`
      msg += `${t.desc}\n`
      msg += `效果：修炼经验 +${Math.round((t.expMultiplier - 1) * 100)}%\n`
      msg += `　　　突破成功率 +${Math.round(t.breakthroughBonus * 100)}%`
    } else {
      msg += '尚未修习任何功法。\n去 #功法商店 看看吧。'
    }
    await this.e.reply(msg)
    return true
  }
}
