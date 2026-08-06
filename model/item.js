import fs from 'node:fs'
import path from 'node:path'
import { pluginResources } from '../config/constant.js'

const itemsPath = path.resolve(pluginResources, 'items.json')
const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'))

export class ItemManager {
  static getById(id) {
    return items.find(i => i.id === id) || null
  }

  static getAllPills() {
    return items.filter(i => i.type === 'pill')
  }

  static getAllStones() {
    return items.filter(i => i.type === 'stone')
  }

  static getPill(id) {
    return this.getById(id)
  }

  static getPills() {
    return this.getAllPills()
  }

  static canBuy(player, itemId, qty) {
    const item = this.getById(itemId)
    if (!item) return { ok: false, msg: '物品不存在' }
    if (item.type !== 'pill') return { ok: false, msg: '只能购买丹药' }
    if (!Number.isSafeInteger(qty) || qty < 1) return { ok: false, msg: '购买数量必须是正整数' }
    const cost = item.price * qty
    if (!Number.isSafeInteger(cost)) return { ok: false, msg: '购买数量过大' }
    if (player.spiritStones < cost) return { ok: false, msg: `灵石不足，需 ${cost}` }
    return { ok: true, cost }
  }

  static buy(player, itemId, qty = 1) {
    const check = this.canBuy(player, itemId, qty)
    if (!check.ok) return check
    const item = this.getById(itemId)
    player.spiritStones -= check.cost
    player.bag[itemId] = (player.bag[itemId] ?? 0) + qty
    return { ok: true, msg: `购得【${item.name}】×${qty}，剩余灵石：${player.spiritStones}` }
  }

  static canUsePill(player, pillId) {
    const pill = this.getById(pillId)
    if (!pill || pill.type !== 'pill') return { ok: false, msg: '丹药不存在' }
    if (!player.bag[pillId] || player.bag[pillId] <= 0) return { ok: false, msg: `你没有【${pill.name}】` }

    // 每日重置
    const today = new Date().toDateString()
    const last = new Date(player.lastDailyReset).toDateString()
    if (today !== last) {
      player.dailyPillUsed = {}
      player.lastDailyReset = Date.now()
    }

    const used = player.dailyPillUsed[pillId] ?? 0
    if (used >= (pill.dailyLimit ?? 1)) {
      return { ok: false, msg: `【${pill.name}】今日已达服用上限（${pill.dailyLimit}次）` }
    }
    return { ok: true, pill }
  }

  static use(player, pillId) {
    const check = this.canUsePill(player, pillId)
    if (!check.ok) return check
    const pill = check.pill

    player.bag[pillId]--
    if (player.bag[pillId] <= 0) delete player.bag[pillId]
    player.dailyPillUsed[pillId] = (player.dailyPillUsed[pillId] ?? 0) + 1

    let effect = ''
    if (pill.effect === 'exp') {
      player.addExp(pill.value)
      effect = `获得 ${pill.value} 点修为`
    } else if (pill.effect === 'breakthrough_buff') {
      player.activePillBuffs.breakthrough = (player.activePillBuffs.breakthrough ?? 0) + pill.value
      effect = `突破成功率 +${Math.round(pill.value * 100)}%（本次有效）`
    } else if (pill.effect === 'revive_shield') {
      player.activePillBuffs.revive = true
      effect = `获得一次突破失败保护（本次有效）`
    }

    return { ok: true, msg: `服用【${pill.name}】成功！${effect}` }
  }

  static consumeBreakthroughBuff(player) {
    const bonus = player.activePillBuffs.breakthrough ?? 0
    player.activePillBuffs.breakthrough = 0
    return bonus
  }

  static hasReviveShield(player) {
    return player.activePillBuffs.revive === true
  }

  static consumeReviveShield(player) {
    player.activePillBuffs.revive = false
  }

  static formatShop() {
    return this.getAllPills().map(p => {
      return `【${p.name}】— ${p.price}灵石\n　　${p.desc}\n　　每日限${p.dailyLimit}次`
    }).join('\n\n')
  }

  static formatPlayerBag(player) {
    const ids = Object.keys(player.bag || {}).filter(k => player.bag[k] > 0)
    if (ids.length === 0) return '背包空空如也'
    return ids.map(id => {
      const p = this.getById(id)
      return `　· ${p ? p.name : id} ×${player.bag[id]}`
    }).join('\n')
  }
}
