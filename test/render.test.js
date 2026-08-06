import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFallbackHtml, renderImage } from '../model/render.js'

test('renderImage keeps Yunzai runtime.render as the primary path for help', async () => {
  let call
  const expected = { delivered: true }
  const e = {
    runtime: {
      render: async (...args) => {
        call = args
        return expected
      }
    }
  }
  const result = await renderImage(e, 'help/index.html', {
    title: '修仙帮助', subtitle: '指令菜单', columns: 2,
    groups: [{ title: '修炼', items: [{ cmd: '#修炼', desc: '获取修为' }] }]
  })

  assert.equal(result, expected)
  assert.equal(call[0], 'xiuxian-plugin')
  assert.equal(call[1], 'help/index.html')
  assert.match(call[2].renderedContent, /修仙帮助/)
  assert.match(call[2].renderedContent, /#修炼/)
})

test('fallback HTML resolves help resource placeholders to absolute file URLs', () => {
  const html = buildFallbackHtml('help/index.html', {
    title: '帮助', subtitle: '菜单', columns: 2, groups: []
  })
  assert.match(html, /url\("file:\/\/.*\/resources\/background\.png"\)/)
  assert.doesNotMatch(html, /\{\{_res_path\}\}/)
})
