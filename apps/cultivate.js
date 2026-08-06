import config from '../config/config.js'
import { Player } from '../model/player.js'
import { RealmManager } from '../model/realm.js'
import { TechniqueManager } from '../model/technique.js'

export class CultivateApp {
  constructor(e) { this.e = e }

  async go() {
    const userId = this.e.user_id || this.e.sender?.user_id
    const result = await Player.withLock(userId, async () => {
      let player = await Player.load(userId)
      if (!player) {
        player = await Player.create(userId)
        return { msg: `你感应到了天地灵气，正式踏入修仙之路。\n道号：${player.name}\n\n输入 #修炼 开始第一次闭关。` }
      }

      const cd = player.checkCooldown(Math.max(0, Number(config.get('cultivateCd') ?? 300) || 0))
      if (!cd.ok) return { msg: `你还在调息中，还需等待 ${cd.remain} 秒才能继续修炼。` }

      let min = Math.max(0, Math.floor(Number(config.get('cultivateExpMin') ?? 10) || 0))
      let max = Math.max(0, Math.floor(Number(config.get('cultivateExpMax') ?? 30) || 0))
      if (min > max) [min, max] = [max, min]
      let baseGain = min + Math.floor(Math.random() * (max - min + 1))
      const mult = TechniqueManager.getExpMultiplier(player)
      baseGain = Math.floor(baseGain * mult)
      const gained = baseGain + player.realmId * 8

      player.addExp(gained)
      player.touchCultivate()
      const drop = player.dropStones()
      await Player.save(player)

      const realm = RealmManager.getRealm(player.realmId)
      const bar = RealmManager.getProgressBar(player.exp, player.nextExp)
      let msg = `${player.name} 盘膝而坐，运转周天。\n本次修为 +${gained}`
      if (mult > 1) msg += `（功法加成 ×${mult}）`
      msg += `\n\n当前境界：${realm.name} 第${player.level}层\n修为进度：[${bar}] ${player.exp}/${player.nextExp}\n`
      if (drop) {
        const names = { low: '下品灵石', mid: '中品灵石', high: '上品灵石' }
        msg += `获得${names[drop.type]} ×${drop.amount}\n`
      }
      msg += `灵石余额：${player.spiritStones}`
      if (player.exp >= player.nextExp) msg += `\n\n修为已达瓶颈，可使用 #突破 尝试破境。`
      return { msg }
    })
    await this.e.reply(result.msg)
    return true
  }
}
