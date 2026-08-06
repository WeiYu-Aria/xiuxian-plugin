import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const SAFE_PLAYER_FILE = /^([A-Za-z0-9:_-]{1,128})\.json$/

export class SqlitePlayerRepository {
  constructor(databasePath, {
    validateKey,
    legacyDirectory
  } = {}) {
    this.databasePath = databasePath === ':memory:' ? databasePath : path.resolve(databasePath)
    this.legacyDirectory = legacyDirectory ? path.resolve(legacyDirectory) : null
    this.validateKey = validateKey ?? (key => String(key))
    this.queues = new Map()

    if (this.databasePath !== ':memory:') fs.mkdirSync(path.dirname(this.databasePath), { recursive: true })
    this.db = new DatabaseSync(this.databasePath, { timeout: 5000 })
    this.initialize()
    this.prepareStatements()
    this.migrateLegacyJson()
  }

  initialize() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS players (
        qq TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        realm_id INTEGER NOT NULL,
        level INTEGER NOT NULL,
        exp INTEGER NOT NULL,
        score INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        schema_version INTEGER NOT NULL,
        payload_json TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS players_ranking_idx
        ON players(score DESC, created_at ASC, qq ASC);
      CREATE TABLE IF NOT EXISTS storage_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      ) STRICT;
      PRAGMA user_version = 1;
    `)
  }

  prepareStatements() {
    this.selectPlayer = this.db.prepare('SELECT payload_json FROM players WHERE qq = ?')
    this.upsertPlayer = this.db.prepare(`
      INSERT INTO players (
        qq, name, realm_id, level, exp, score, created_at, updated_at, schema_version, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(qq) DO UPDATE SET
        name = excluded.name,
        realm_id = excluded.realm_id,
        level = excluded.level,
        exp = excluded.exp,
        score = excluded.score,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        schema_version = excluded.schema_version,
        payload_json = excluded.payload_json
    `)
    this.insertPlayerIfMissing = this.db.prepare(`
      INSERT OR IGNORE INTO players (
        qq, name, realm_id, level, exp, score, created_at, updated_at, schema_version, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    this.deletePlayer = this.db.prepare('DELETE FROM players WHERE qq = ?')
    this.selectAll = this.db.prepare('SELECT payload_json FROM players ORDER BY qq ASC')
    this.selectTop = this.db.prepare(`
      SELECT qq, name, realm_id AS realmId, level, exp, score, created_at AS createdAt
      FROM players ORDER BY score DESC, created_at ASC, qq ASC LIMIT ?
    `)
    this.countPlayers = this.db.prepare('SELECT COUNT(*) AS total FROM players')
    this.selectRankData = this.db.prepare('SELECT score, created_at AS createdAt FROM players WHERE qq = ?')
    this.selectSelfRank = this.db.prepare(`
      SELECT COUNT(*) + 1 AS rank FROM players
      WHERE score > ?
         OR (score = ? AND created_at < ?)
         OR (score = ? AND created_at = ? AND qq < ?)
    `)
    this.getMeta = this.db.prepare('SELECT value FROM storage_meta WHERE key = ?')
    this.setMeta = this.db.prepare(`
      INSERT INTO storage_meta(key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `)
  }

  encode(key, value) {
    const safe = this.validateKey(key)
    const payload = structuredClone(value && typeof value === 'object' ? value : {})
    payload.qq = safe
    const realmId = integer(payload.realmId, 0)
    const level = integer(payload.level, 1)
    const exp = integer(payload.exp, 0)
    const createdAt = integer(payload.createdAt, Date.now())
    const score = realmId * 10000 + level * 100 + Math.floor(exp / 100)
    return [
      safe,
      String(payload.name || `道友${safe.slice(-4)}`),
      realmId,
      level,
      exp,
      score,
      createdAt,
      Date.now(),
      integer(payload.schemaVersion, 1),
      JSON.stringify(payload)
    ]
  }

  read(key) {
    const safe = this.validateKey(key)
    const row = this.selectPlayer.get(safe)
    return row ? JSON.parse(row.payload_json) : null
  }

  write(key, value) {
    const values = this.encode(key, value)
    this.upsertPlayer.run(...values)
    return JSON.parse(values[9])
  }

  delete(key) {
    const safe = this.validateKey(key)
    this.deletePlayer.run(safe)
  }

  list() {
    return this.selectAll.all().flatMap(row => {
      try { return [JSON.parse(row.payload_json)] } catch { return [] }
    })
  }

  ranking(limit = 10, selfKey = null) {
    const safeLimit = Math.max(1, Math.min(100, integer(limit, 10)))
    const top = this.selectTop.all(safeLimit)
    const total = Number(this.countPlayers.get().total)
    let selfRank = null
    let selfData = null
    if (selfKey !== null && selfKey !== undefined) {
      const safe = this.validateKey(selfKey)
      const row = this.selectRankData.get(safe)
      if (row) {
        selfRank = Number(this.selectSelfRank.get(
          row.score, row.score, row.createdAt, row.score, row.createdAt, safe
        ).rank)
        selfData = this.selectTopRow(safe)
      }
    }
    return { top, total, selfRank, selfData }
  }

  selectTopRow(key) {
    const row = this.db.prepare(`
      SELECT qq, name, realm_id AS realmId, level, exp, score, created_at AS createdAt
      FROM players WHERE qq = ?
    `).get(key)
    return row ?? null
  }

  async transaction(key, task) {
    const safe = this.validateKey(key)
    const previous = this.queues.get(safe) ?? Promise.resolve()
    const current = previous.catch(() => {}).then(() => {
      this.db.exec('BEGIN IMMEDIATE')
      try {
        const result = task(safe)
        if (result && typeof result.then === 'function') {
          throw new TypeError('数据库事务回调必须是同步函数')
        }
        this.db.exec('COMMIT')
        return result
      } catch (error) {
        try { this.db.exec('ROLLBACK') } catch { /* transaction already closed */ }
        throw error
      }
    })
    this.queues.set(safe, current)
    try { return await current } finally {
      if (this.queues.get(safe) === current) this.queues.delete(safe)
    }
  }

  migrateLegacyJson() {
    const marker = 'json_players_migrated_v1'
    if (!this.legacyDirectory || this.getMeta.get(marker)) return
    if (!fs.existsSync(this.legacyDirectory)) {
      this.setMeta.run(marker, JSON.stringify({ at: Date.now(), imported: 0, source: null }))
      return
    }

    const entries = fs.readdirSync(this.legacyDirectory, { withFileTypes: true })
      .filter(entry => entry.isFile() && SAFE_PLAYER_FILE.test(entry.name))
    const records = entries.map(entry => {
      const id = entry.name.match(SAFE_PLAYER_FILE)[1]
      const safe = this.validateKey(id)
      const file = path.join(this.legacyDirectory, entry.name)
      try {
        const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('内容不是对象')
        return this.encode(safe, { ...raw, qq: safe })
      } catch (error) {
        throw new Error(`迁移旧存档失败：${entry.name}：${error.message}`)
      }
    })

    this.db.exec('BEGIN IMMEDIATE')
    try {
      for (const values of records) this.insertPlayerIfMissing.run(...values)
      this.setMeta.run(marker, JSON.stringify({ at: Date.now(), imported: records.length, source: this.legacyDirectory }))
      this.db.exec('COMMIT')
    } catch (error) {
      try { this.db.exec('ROLLBACK') } catch { /* ignore */ }
      throw error
    }

    if (records.length > 0) this.backupLegacyDirectory()
  }

  backupLegacyDirectory() {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const target = `${this.legacyDirectory}.json-backup-${stamp}`
    try {
      fs.renameSync(this.legacyDirectory, target)
      console.log(`[修仙插件] 已将旧 JSON 存档迁移到 SQLite，原目录备份为：${target}`)
    } catch (error) {
      console.warn(`[修仙插件] SQLite 迁移完成，但旧存档目录备份失败：${error.message}`)
    }
  }

  close() {
    this.db.close()
  }
}

function integer(value, fallback) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : fallback
}

export default SqlitePlayerRepository
