import { playerRepository } from '../model/player.js'
import { RealmManager } from '../model/realm.js'

export class RankingApp {
  constructor(e) { this.e = e }

  async go() {
    const selfQQ = String(this.e.user_id || this.e.sender?.user_id)
    const { top, total, selfRank, selfData } = playerRepository.ranking(10, selfQQ)
    if (total === 0) {
      await this.e.reply('尚无任何人踏入仙途...')
      return true
    }

    const lines = [
      '修仙榜 · 全服前十',
      '━━━━━━━━━━━━━━'
    ]
    top.forEach((player, index) => {
      const realm = RealmManager.getRealm(player.realmId)
      const rank = `${String(index + 1).padStart(2, '0')}.`
      lines.push(`${rank} ${player.name}`)
      lines.push(`　 ${realm.name} · 第${player.level}层｜战力 ${player.score}`)
    })
    lines.push('', `在榜修士：${total} 位`)
    if (selfRank !== null) {
      lines.push(`我的排名：第 ${selfRank} 名`)
      if (selfRank > 10 && selfData) {
        const realm = RealmManager.getRealm(selfData.realmId)
        lines.push(`　 ${selfData.name}｜${realm.name} · 第${selfData.level}层｜战力 ${selfData.score}`)
      }
    }

    await this.e.reply(lines.join('\n'))
    return true
  }
}
