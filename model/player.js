import path from 'node:path'
import config from '../config/config.js'
import { RealmManager } from './realm.js'
import { pluginData } from '../config/constant.js'
import { SqlitePlayerRepository } from '../storage/sqlite-player-repository.js'
import { RedisPlayerCache } from '../storage/redis-player-cache.js'
import { migratePlayer, PLAYER_SCHEMA_VERSION } from './schema/player-schema.js'

export const LEGACY_DATA_DIR = path.resolve(pluginData, 'players')
export const DATABASE_PATH = path.resolve(pluginData, 'xiuxian.sqlite3')

function normalizePlayerId(qq) {
  const id = String(qq ?? '').trim()
  // QQ Bot 等适配器可能使用“数字 QQ:OpenID”或单独 OpenID。
  // 冒号在 Linux 文件名中安全；其余字符仍采用白名单，避免路径穿越和串档。
  if (!/^[A-Za-z0-9:_-]{1,128}$/.test(id)) {
    throw new TypeError('玩家 ID 必须是非空 QQ 号或安全的平台 OpenID')
  }
  return id
}

export const playerRepository = new SqlitePlayerRepository(DATABASE_PATH, {
  validateKey: normalizePlayerId,
  legacyDirectory: LEGACY_DATA_DIR
})
export const playerCache = new RedisPlayerCache({
  prefix: 'xiuxian:player:',
  ttlSeconds: 30
})

export class Player {
  static queues = new Map()

  constructor(qq, name = '') {
    this.qq = normalizePlayerId(qq)
    this.name = name || `道友${this.qq.slice(-4)}`
    this.realmId = 0
    this.level = 1
    this.exp = 0
    this.nextExp = RealmManager.calculateExpToNext(0, 1)
    this.spiritStones = 0
    this.lowStones = 0
    this.midStones = 0
    this.highStones = 0
    this.techniqueId = 'none'
    this.learnedTechniques = []
    this.bag = {}
    this.dailyPillUsed = {}
    this.activePillBuffs = {}
    this.lastCultivateTime = 0
    this.totalCultivateTimes = 0
    this.lastDailyReset = 0
    this.createdAt = Date.now()
    this.schemaVersion = PLAYER_SCHEMA_VERSION
  }

  static normalizeId(qq) {
    return normalizePlayerId(qq)
  }

  static async delete(qq) {
    const id = normalizePlayerId(qq)
    playerRepository.delete(id)
    await playerCache.delete(id)
  }

  static async withLock(qq, task) {
    const id = normalizePlayerId(qq)
    const previous = Player.queues.get(id) ?? Promise.resolve()
    const current = previous.catch(() => {}).then(() => task(id))
    Player.queues.set(id, current)
    try { return await current } finally {
      if (Player.queues.get(id) === current) Player.queues.delete(id)
    }
  }

  static async load(qq) {
    const id = normalizePlayerId(qq)
    try {
      let data = await playerCache.get(id)
      if (!data) {
        data = playerRepository.read(id)
        if (data) await playerCache.set(id, data)
      }
      if (!data) return null
      const merged = migratePlayer(data, new Player(id), id)
      Object.setPrototypeOf(merged, Player.prototype)
      return merged
    } catch (e) {
      console.error(`[修仙插件] 加载玩家${id}失败:`, e)
      return null
    }
  }

  static async save(player) {
    const saved = playerRepository.write(player.qq, player)
    await playerCache.set(saved.qq, saved)
  }

  static async create(qq, name) {
    const p = new Player(qq, name)
    await Player.save(p)
    return p
  }

  addExp(amount) {
    this.exp += Math.max(0, Number(amount) || 0)
    const realm = RealmManager.getRealm(this.realmId)
    while (this.nextExp > 0 && this.exp >= this.nextExp && this.level < realm.levels) {
      this.exp -= this.nextExp
      this.level++
      this.nextExp = RealmManager.calculateExpToNext(this.realmId, this.level)
    }
    if (this.nextExp > 0 && this.exp > this.nextExp) this.exp = this.nextExp
  }

  breakthrough() {
    const realm = RealmManager.getRealm(this.realmId)
    const isMinor = this.level < realm.levels
    if (isMinor) {
      this.level++
      this.nextExp = RealmManager.calculateExpToNext(this.realmId, this.level)
      return { success: true, major: false, msg: `突破至 ${realm.name}第${this.level}层！` }
    }
    const next = RealmManager.getNextRealm(this.realmId)
    if (!next) return { success: false, msg: '已是最高境界，无法再突破！' }
    this.realmId = next.id
    this.level = 1
    this.exp = 0
    this.nextExp = RealmManager.calculateExpToNext(this.realmId, 1)
    return { success: true, major: true, msg: `渡劫成功！飞升为【${next.name}】！` }
  }

  checkCooldown(cdSec) {
    const elapsed = (Date.now() - this.lastCultivateTime) / 1000
    if (elapsed < cdSec) return { ok: false, remain: Math.ceil(cdSec - elapsed) }
    return { ok: true }
  }

  touchCultivate() {
    this.lastCultivateTime = Date.now()
    this.totalCultivateTimes++
  }

  checkDailyReset() {
    const today = new Date().toDateString()
    const last = new Date(this.lastDailyReset).toDateString()
    if (today === last) return false
    this.dailyPillUsed = {}
    this.lastDailyReset = Date.now()
    return true
  }

  dropStones() {
    const chance = Math.min(1, Math.max(0, Number(config.get('stoneDropChance') ?? 0.3) || 0))
    if (Math.random() > chance) return null

    let min = Math.max(0, Math.floor(Number(config.get('stoneDropMin') ?? 1) || 0))
    let max = Math.max(0, Math.floor(Number(config.get('stoneDropMax') ?? 5) || 0))
    if (min > max) [min, max] = [max, min]
    const amount = min + Math.floor(Math.random() * (max - min + 1))
    const r = Math.random()
    const type = r < 0.6 ? 'low' : r < 0.9 ? 'mid' : 'high'

    if (type === 'low') this.lowStones += amount
    else if (type === 'mid') this.midStones += amount
    else this.highStones += amount
    this.spiritStones += amount * (type === 'low' ? 1 : type === 'mid' ? 5 : 25)
    return { type, amount }
  }

  totalStoneValue() {
    return this.lowStones + this.midStones * 5 + this.highStones * 25
  }

  getScore() {
    return this.realmId * 10000 + this.level * 100 + Math.floor(this.exp / 100)
  }
}
