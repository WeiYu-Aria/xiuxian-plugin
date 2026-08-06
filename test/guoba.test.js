import test from 'node:test'
import assert from 'node:assert/strict'
import { supportGuoba } from '../guoba.support.js'

test('Guoba support exposes plugin metadata and editable schemas', () => {
  const support = supportGuoba()
  assert.equal(support.pluginInfo.name, 'xiuxian-plugin')
  assert.equal(support.pluginInfo.author, 'WeiYu-Aria')
  assert.match(support.pluginInfo.link, /WeiYu-Aria\/xiuxian-plugin/)
  assert.ok(Array.isArray(support.configInfo.schemas))
  assert.ok(support.configInfo.schemas.length >= 13)

  const fields = support.configInfo.schemas.map(item => item.field).filter(Boolean)
  for (const field of ['cultivateCd', 'stoneDropChance', 'majorFailLoseRatio', 'helpTitle']) {
    assert.ok(fields.includes(field), `missing Guoba field: ${field}`)
  }
})

test('Guoba configuration callbacks use the current config shape', () => {
  const { configInfo } = supportGuoba()
  const data = configInfo.getConfigData()
  assert.equal(typeof data.cultivateCd, 'number')
  assert.equal(Object.hasOwn(data, 'enableImagePanel'), false)
  assert.equal(Object.hasOwn(data, 'enableImageRanking'), false)

  let response
  const Result = {
    ok(payload, message) { response = { ok: true, payload, message }; return response },
    error(message) { response = { ok: false, message }; return response }
  }
  const result = configInfo.setConfigData(data, { Result })
  assert.equal(result.ok, true)
})
