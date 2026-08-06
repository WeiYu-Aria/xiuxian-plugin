import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { SqlitePlayerRepository } from '../storage/sqlite-player-repository.js'

function fixture(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xiuxian-sqlite-'))
  const legacy = path.join(root, 'players')
  const database = path.join(root, 'xiuxian.sqlite3')
  const repo = new SqlitePlayerRepository(database, {
    validateKey: value => {
      const key = String(value)
      if (!/^[A-Za-z0-9:_-]{1,128}$/.test(key)) throw new TypeError('unsafe key')
      return key
    },
    legacyDirectory: legacy,
    readCacheTtlMs: 60000,
    maxReadCacheEntries: 100,
    ...options
  })
  return { root, legacy, database, repo }
}

function player(qq, exp = 0, extra = {}) {
  return {
    qq, name: `道友${qq}`, realmId: 1, level: 1, exp,
    createdAt: Number(qq.replace(/\D/g, '').slice(-6)) || 1,
    schemaVersion: 1, bag: {}, ...extra
  }
}

function cleanup(ctx) {
  try { ctx.repo.close() } catch {}
  fs.rmSync(ctx.root, { recursive: true, force: true })
}

test('SQLite repository persists isolated player objects and overwrites immediately', () => {
  const ctx = fixture()
  try {
    ctx.repo.write('1', player('1', 10, { bag: { pill: 1 } }))
    const first = ctx.repo.read('1')
    first.exp = 999
    first.bag.pill = 8
    assert.equal(ctx.repo.read('1').exp, 10)
    assert.equal(ctx.repo.read('1').bag.pill, 1)

    ctx.repo.write('1', player('1', 20))
    assert.equal(ctx.repo.read('1').exp, 20)
    assert.equal(ctx.repo.read('missing'), null)
    ctx.repo.write('missing', player('missing', 3))
    assert.equal(ctx.repo.read('missing').exp, 3)
  } finally { cleanup(ctx) }
})

test('delete removes database row and cached value', () => {
  const ctx = fixture()
  try {
    ctx.repo.write('1', player('1'))
    assert.ok(ctx.repo.read('1'))
    ctx.repo.delete('1')
    assert.equal(ctx.repo.read('1'), null)
    assert.deepEqual(ctx.repo.list(), [])
  } finally { cleanup(ctx) }
})

test('transaction commits synchronous mutations and rolls back failures', async () => {
  const ctx = fixture()
  try {
    ctx.repo.write('1', player('1', 1))
    await ctx.repo.transaction('1', id => {
      const value = ctx.repo.read(id)
      value.exp += 9
      ctx.repo.write(id, value)
    })
    assert.equal(ctx.repo.read('1').exp, 10)

    await assert.rejects(ctx.repo.transaction('1', id => {
      const value = ctx.repo.read(id)
      value.exp = 999
      ctx.repo.write(id, value)
      throw new Error('rollback')
    }), /rollback/)
    assert.equal(ctx.repo.read('1').exp, 10)
    await assert.rejects(ctx.repo.transaction('1', async () => {}), /同步函数/)
  } finally { cleanup(ctx) }
})

test('ranking uses persisted score with deterministic ties and self rank', () => {
  const ctx = fixture()
  try {
    ctx.repo.write('3', player('3', 500, { level: 2, createdAt: 3 }))
    ctx.repo.write('2', player('2', 500, { level: 2, createdAt: 2 }))
    ctx.repo.write('1', player('1', 0, { level: 3, createdAt: 1 }))
    const result = ctx.repo.ranking(2, '3')
    assert.equal(result.total, 3)
    assert.deepEqual(result.top.map(row => row.qq), ['1', '2'])
    assert.equal(result.selfRank, 3)
    assert.equal(result.selfData.qq, '3')
    const plan = ctx.repo.db.prepare(`
      EXPLAIN QUERY PLAN SELECT qq FROM players
      ORDER BY score DESC, created_at ASC, qq ASC LIMIT 10
    `).all().map(row => row.detail).join(' ')
    assert.match(plan, /players_ranking_idx/)
  } finally { cleanup(ctx) }
})

test('legacy JSON migration imports composite OpenIDs once and keeps a backup', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xiuxian-migrate-'))
  const legacy = path.join(root, 'players')
  const database = path.join(root, 'xiuxian.sqlite3')
  fs.mkdirSync(legacy)
  fs.writeFileSync(path.join(legacy, '3889280554:OPENID.json'), JSON.stringify(player('wrong', 88)))
  fs.writeFileSync(path.join(legacy, 'openid_AB-12.json'), JSON.stringify(player('openid_AB-12', 66)))
  let repo
  try {
    repo = new SqlitePlayerRepository(database, { validateKey: String, legacyDirectory: legacy })
    assert.equal(repo.read('3889280554:OPENID').qq, '3889280554:OPENID')
    assert.equal(repo.read('3889280554:OPENID').exp, 88)
    assert.equal(repo.list().length, 2)
    assert.equal(fs.existsSync(legacy), false)
    assert.equal(fs.readdirSync(root).some(name => name.startsWith('players.json-backup-')), true)
    repo.close()

    repo = new SqlitePlayerRepository(database, { validateKey: String, legacyDirectory: legacy })
    assert.equal(repo.list().length, 2)
  } finally {
    try { repo?.close() } catch {}
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('malformed legacy JSON aborts migration without partial import or marker', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xiuxian-migrate-bad-'))
  const legacy = path.join(root, 'players')
  const database = path.join(root, 'xiuxian.sqlite3')
  fs.mkdirSync(legacy)
  fs.writeFileSync(path.join(legacy, '1.json'), JSON.stringify(player('1')))
  fs.writeFileSync(path.join(legacy, '2.json'), '{broken')
  try {
    assert.throws(() => new SqlitePlayerRepository(database, { validateKey: String, legacyDirectory: legacy }), /2\.json/)
    assert.equal(fs.existsSync(legacy), true)
    const inspect = new SqlitePlayerRepository(database, { validateKey: String })
    assert.equal(inspect.list().length, 0)
    inspect.close()
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('stale JSON cannot overwrite a newer SQLite row', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xiuxian-migrate-existing-'))
  const legacy = path.join(root, 'players')
  const database = path.join(root, 'xiuxian.sqlite3')
  let repo = new SqlitePlayerRepository(database, { validateKey: String })
  repo.write('1', player('1', 999))
  repo.close()
  fs.mkdirSync(legacy)
  fs.writeFileSync(path.join(legacy, '1.json'), JSON.stringify(player('1', 1)))
  try {
    repo = new SqlitePlayerRepository(database, { validateKey: String, legacyDirectory: legacy })
    assert.equal(repo.read('1').exp, 999)
  } finally {
    try { repo.close() } catch {}
    fs.rmSync(root, { recursive: true, force: true })
  }
})
