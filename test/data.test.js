import fs from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { readJSON, writeJSON } from '../model/Data.js'

test('writeJSON atomically replaces data and leaves no temporary files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xiuxian-data-'))
  const file = path.join(dir, 'players', '10001.json')
  try {
    assert.equal(writeJSON(file, { exp: 1 }), true)
    assert.deepEqual(readJSON(file), { exp: 1 })
    assert.equal(writeJSON(file, { exp: 2, bag: { pill: 1 } }), true)
    assert.deepEqual(readJSON(file), { exp: 2, bag: { pill: 1 } })
    assert.deepEqual(fs.readdirSync(path.dirname(file)), ['10001.json'])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('readJSON returns fallback for invalid JSON', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xiuxian-data-'))
  const file = path.join(dir, 'broken.json')
  const originalError = console.error
  try {
    console.error = () => {}
    fs.writeFileSync(file, '{broken', 'utf8')
    assert.deepEqual(readJSON(file, { safe: true }), { safe: true })
  } finally {
    console.error = originalError
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
