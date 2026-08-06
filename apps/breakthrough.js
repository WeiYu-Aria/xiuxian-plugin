import config from '../config/config.js'
import { Player } from '../model/player.js'
import { RealmManager } from '../model/realm.js'
import { TechniqueManager } from '../model/technique.js'
import { ItemManager } from '../model/item.js'

function ratio(key, fallback) {
  return Math.min(1, Math.max(0, Number(config.get(key) ?? fallback) || 0))
}

export class BreakthroughApp {
  constructor(e) { this.e = e }

  async go() {
    const userId = this.e.user_id || this.e.sender?.user_id
    const result = await Player.withLock(userId, async () => {
      const player = await Player.load(userId)
      if (!player) return { msg: '你还未踏入修仙之路，谈何突破？' }

      const realm = RealmManager.getRealm(player.realmId)
      const isMinor = player.level < realm.levels
      if (player.exp < player.nextExp) {
        return { msg: `修为不足，还差 ${player.nextExp - player.exp} 点方可突破。` }
      }

      let rate = RealmManager.calculateBreakthroughRate(player.realmId, player.level)
      rate += TechniqueManager.getBreakthroughBonus(player)
      rate += ItemManager.consumeBreakthroughBuff(player)
      rate = Math.min(1, Math.max(0, rate))
      const hasRevive = ItemManager.hasReviveShield(player)
      let msg

      if (Math.random() <= rate) {
        const breakthrough = player.breakthrough()
        msg = `突破成功！\n${breakthrough.msg}\n\n`
        if (breakthrough.major) msg += `天道降下祥瑞，万里灵气汇于一身。\n`
        msg += `当前进度：[${RealmManager.getProgressBar(player.exp, player.nextExp)}]`
      } else if (hasRevive) {
        ItemManager.consumeReviveShield(player)
        msg = `突破失败。\n但【回生丹】之力护住元神，境界未跌。\n当前修为：${player.exp}/${player.nextExp}`
      } else {
        msg = '突破失败。'
        if (isMinor) {
          const lost = Math.floor(player.exp * ratio('minorFailLoseRatio', 0.2))
          player.exp = Math.max(0, player.exp - lost)
          msg += `\n真气逆行，损耗 ${lost} 点修为。`
        } else {
          const lost = Math.floor(player.exp * ratio('majorFailLoseRatio', 0.5))
          player.exp = Math.max(0, player.exp - lost)
          msg += `\n天劫反噬！损耗 ${lost} 点修为。`
        }
        msg += `\n\n当前修为：${player.exp}/${player.nextExp}`
      }

      await Player.save(player)
      return { msg }
    })
    await this.e.reply(result.msg)
    return true
  }
}
