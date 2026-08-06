import test from 'node:test'
import assert from 'node:assert/strict'
import { PLUGIN_NAME, UpdateApp } from '../apps/update.js'

function event(overrides = {}) {
  const replies = []
  return {
    isMaster: true,
    msg: '',
    replies,
    reply: async message => { replies.push(message); return true },
    ...overrides
  }
}

test('plugin name matches the installation directory expected by Yunzai updater', () => {
  assert.equal(PLUGIN_NAME, 'xiuxian-plugin')
})

test('update app rejects callers that are not Yunzai master', async () => {
  for (const action of ['goUpdate', 'goLog']) {
    let loaded = false
    const e = event({ isMaster: false })
    const app = new UpdateApp(e, { loadUpdater: async () => { loaded = true } })
    assert.equal(await app[action](false), true)
    assert.match(e.replies[0], /只有 Yunzai 主人/)
    assert.equal(loaded, false)
  }
})

test('sender owner role is accepted by the defense-in-depth permission check', async () => {
  class FrameworkUpdater {
    constructor(e) { this.e = e }
    getPlugin(name) { return name === PLUGIN_NAME }
    async getLog(name) { return `log:${name}` }
  }
  const e = event({ isMaster: false, sender: { role: 'owner' } })
  const app = new UpdateApp(e, { loadUpdater: async () => FrameworkUpdater })
  assert.equal(await app.goLog(), true)
  assert.deepEqual(e.replies, [`log:${PLUGIN_NAME}`])
})

test('normal update delegates to the Yunzai updater with normalized message', async () => {
  let instance
  class FrameworkUpdater {
    constructor(e) { this.constructedWith = e; instance = this }
    async update() { return 'framework-result' }
  }
  const e = event({ msg: '#修仙更新' })
  const app = new UpdateApp(e, { loadUpdater: async () => FrameworkUpdater })
  assert.equal(await app.goUpdate(false), 'framework-result')
  assert.equal(e.msg, `#更新${PLUGIN_NAME}`)
  assert.equal(instance.e, e)
  assert.equal(instance.constructedWith, e)
})

test('force update delegates with the force marker', async () => {
  let receivedMessage
  class FrameworkUpdater {
    async update() { receivedMessage = this.e.msg; return true }
  }
  const e = event({ msg: '#强制更新修仙插件' })
  const app = new UpdateApp(e, { loadUpdater: async () => FrameworkUpdater })
  assert.equal(await app.goUpdate(true), true)
  assert.equal(receivedMessage, `#强制更新${PLUGIN_NAME}`)
})

test('update log uses framework getPlugin and getLog APIs', async () => {
  const calls = []
  class FrameworkUpdater {
    async getPlugin(name) { calls.push(['getPlugin', name]); return true }
    async getLog(name) { calls.push(['getLog', name]); return '更新日志内容' }
  }
  const e = event()
  const app = new UpdateApp(e, { loadUpdater: async () => FrameworkUpdater })
  assert.equal(await app.goLog(), true)
  assert.deepEqual(calls, [
    ['getPlugin', PLUGIN_NAME],
    ['getLog', PLUGIN_NAME]
  ])
  assert.deepEqual(e.replies, ['更新日志内容'])
})

test('update log reports installations not recognized by framework updater', async () => {
  class FrameworkUpdater {
    async getPlugin() { return false }
    async getLog() { throw new Error('should not run') }
  }
  const e = event()
  await new UpdateApp(e, { loadUpdater: async () => FrameworkUpdater }).goLog()
  assert.match(e.replies[0], /未识别.*xiuxian-plugin/)
})

test('missing or incompatible framework updater returns a useful error', async () => {
  const missingEvent = event()
  await new UpdateApp(missingEvent, { loadUpdater: async () => null }).goUpdate()
  assert.match(missingEvent.replies[0], /未找到.*更新器/)

  class IncompatibleUpdater {}
  const incompatibleEvent = event()
  await new UpdateApp(incompatibleEvent, { loadUpdater: async () => IncompatibleUpdater }).goUpdate()
  assert.match(incompatibleEvent.replies[0], /更新失败/)
})
