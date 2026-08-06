import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultConfig, normalizeConfig, validateConfigValue } from '../config/schema.js'

test('config normalization preserves explicit zero and falls back from invalid legacy values', () => {
  const cfg = normalizeConfig({ cultivateCd: 0, stoneDropChance: 0, helpColumns: 0, unknown: 1 })
  assert.equal(cfg.cultivateCd, 0)
  assert.equal(cfg.stoneDropChance, 0)
  assert.equal(cfg.helpColumns, defaultConfig.helpColumns)
  assert.equal(Object.hasOwn(cfg, 'unknown'), false)
})

test('config validation rejects unsafe and out-of-range values', () => {
  assert.throws(() => validateConfigValue('stoneDropChance', 2), /应为/)
  assert.throws(() => validateConfigValue('helpTheme', '../secret'), /格式/)
  assert.throws(() => validateConfigValue('missing', 1), /未知配置项/)
  assert.throws(() => validateConfigValue('enableImagePanel', false), /未知配置项/)
})
