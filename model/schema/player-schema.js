import { RealmManager } from '../realm.js'

export const PLAYER_SCHEMA_VERSION = 1

export function migratePlayer(raw, defaults, id) {
  const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const merged = { ...defaults, ...data, qq: id }
  merged.schemaVersion = PLAYER_SCHEMA_VERSION
  merged.learnedTechniques = Array.isArray(merged.learnedTechniques) ? merged.learnedTechniques : []
  merged.bag = objectOrEmpty(merged.bag)
  merged.dailyPillUsed = objectOrEmpty(merged.dailyPillUsed)
  merged.activePillBuffs = objectOrEmpty(merged.activePillBuffs)
  for (const key of ['realmId', 'level', 'exp', 'spiritStones', 'lowStones', 'midStones', 'highStones', 'lastCultivateTime', 'totalCultivateTimes', 'lastDailyReset', 'createdAt']) {
    if (!Number.isFinite(Number(merged[key]))) merged[key] = defaults[key]
  }
  if (!(Number(merged.nextExp) > 0)) merged.nextExp = RealmManager.calculateExpToNext(merged.realmId, merged.level)
  return merged
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}
