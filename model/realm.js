import fs from 'node:fs'
import path from 'node:path'
import { pluginResources } from '../config/constant.js'

const realmsPath = path.resolve(pluginResources, 'realms.json')
const realms = JSON.parse(fs.readFileSync(realmsPath, 'utf8'))

export class RealmManager {
  static getRealm(realmId) {
    return realms.find(r => r.id === realmId) || realms[0]
  }

  static getNextRealm(realmId) {
    return realms.find(r => r.id === realmId + 1)
  }

  static calculateExpToNext(realmId, level) {
    const realm = this.getRealm(realmId)
    if (!realm) return 0
    const baseExp = realm.baseExp > 0
      ? realm.baseExp
      : (this.getNextRealm(realmId)?.baseExp ?? 1)
    return Math.max(1, Math.floor(baseExp * Math.pow(1.5, level - 1)))
  }

  static calculateBreakthroughRate(realmId, level) {
    const realm = this.getRealm(realmId)
    if (!realm) return 0
    if (level < realm.levels) return 0.8
    return realm.breakthroughRate
  }

  static getProgressBar(exp, nextExp, length = 12) {
    if (nextExp <= 0) return '████████████ 100%'
    const ratio = Math.min(exp / nextExp, 1)
    const filled = Math.floor(ratio * length)
    const empty = length - filled
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.floor(ratio * 100)}%`
  }

  static getAllRealms() {
    return realms
  }
}
