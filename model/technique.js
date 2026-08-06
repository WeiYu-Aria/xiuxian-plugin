import fs from 'node:fs'
import path from 'node:path'
import { pluginResources } from '../config/constant.js'

const techPath = path.resolve(pluginResources, 'techniques.json')
const techniques = JSON.parse(fs.readFileSync(techPath, 'utf8'))

export class TechniqueManager {
  static getById(id) {
    return techniques.find(t => t.id === id) || null
  }

  static getAll() {
    return techniques
  }

  static getLearnable(player) {
    return techniques.filter(t => t.id !== 'none' && !player.learnedTechniques.includes(t.id))
  }

  static getCurrent(player) {
    if (!player.techniqueId || player.techniqueId === 'none') return null
    return this.getById(player.techniqueId)
  }

  static getExpMultiplier(player) {
    const t = this.getCurrent(player)
    return t ? (t.expMultiplier ?? 1) : 1
  }

  static getExpBonus(player) {
    const t = this.getCurrent(player)
    return t ? (t.expBonus ?? 0) : 0
  }

  static getBreakthroughBonus(player) {
    const t = this.getCurrent(player)
    return t ? (t.breakthroughBonus ?? 0) : 0
  }

  static canLearn(player, techId) {
    const tech = this.getById(techId)
    if (!tech) return { ok: false, msg: '功法不存在' }
    if (player.learnedTechniques.includes(techId)) return { ok: false, msg: '已学过此功法' }
    if (player.spiritStones < tech.price) return { ok: false, msg: `灵石不足，需 ${tech.price}` }
    if (player.realmId < (tech.minRealm ?? 0)) {
      try {
        const realmsPath = path.resolve(pluginResources, 'realms.json')
        const realms = JSON.parse(fs.readFileSync(realmsPath, 'utf8'))
        const need = realms.find(r => r.id === tech.minRealm)
        return { ok: false, msg: `需达到${need ? need.name : '更高境界'}` }
      } catch {
        return { ok: false, msg: '需达到更高境界' }
      }
    }
    return { ok: true }
  }

  static learn(player, techId) {
    const check = this.canLearn(player, techId)
    if (!check.ok) return check
    const tech = this.getById(techId)
    player.spiritStones -= tech.price
    if (!player.learnedTechniques.includes(techId)) {
      player.learnedTechniques.push(techId)
    }
    player.techniqueId = techId
    return { ok: true, msg: `成功修习【${tech.name}】！\n品质：${tech.quality}\n效果：修炼经验 +${Math.round((tech.expMultiplier - 1) * 100)}%，突破成功率 +${Math.round(tech.breakthroughBonus * 100)}%` }
  }

  static formatList() {
    return techniques.map(t => {
      const buff = `经验+${Math.round((t.expMultiplier - 1) * 100)}% / 突破+${Math.round(t.breakthroughBonus * 100)}%`
      return `【${t.quality}】${t.name} — ${t.price}灵石\n　　${t.desc}\n　　${buff}`
    }).join('\n\n')
  }
}
