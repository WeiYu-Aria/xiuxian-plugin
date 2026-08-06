import { Player } from '../model/player.js'
import { RealmManager } from '../model/realm.js'
import { TechniqueManager } from '../model/technique.js'

export class StatusApp {
  constructor(e) { this.e = e }

  async go() {
    const userId = this.e.user_id || this.e.sender?.user_id
    const player = await Player.load(userId)

    if (!player) {
      await this.e.reply('你还未踏入修仙之路。发送 #修炼 开启仙途！')
      return true
    }

    const realm = RealmManager.getRealm(player.realmId)
    const technique = TechniqueManager.getCurrent(player)
    const bar = RealmManager.getProgressBar(player.exp, player.nextExp)
    const days = Math.floor((Date.now() - player.createdAt) / 86400000)

    const techniqueText = technique ? `${technique.name}（${technique.quality}）` : '尚未修习'
    const msg = [
      `${player.name} · 修仙面板`,
      '━━━━━━━━━━━━━━',
      `境界　${realm.name} · 第${player.level}层`,
      `修为　${player.exp} / ${player.nextExp}`,
      `　　　[${bar}]`,
      '',
      `功法　${techniqueText}`,
      `灵石　${player.spiritStones}`,
      `　　　下品 ${player.lowStones}｜中品 ${player.midStones}｜上品 ${player.highStones}`,
      '',
      `修炼　累计 ${player.totalCultivateTimes} 次`,
      `入道　${days} 天`
    ].join('\n')

    await this.e.reply(msg)
    return true
  }
}
