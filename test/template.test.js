import fs from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { escapeHtml, renderTemplate } from '../model/template.js'

const resources = path.resolve(import.meta.dirname, '../resources')

test('help is the only image template and has no external runtime dependency', () => {
  const html = fs.readFileSync(path.join(resources, 'help/index.html'), 'utf8')
  assert.doesNotMatch(html, /https?:\/\//)
  assert.match(html, /\{\{@renderedContent\}\}/)
  assert.equal(fs.existsSync(path.join(resources, 'status')), false)
  assert.equal(fs.existsSync(path.join(resources, 'ranking')), false)
})

test('help image template uses the shared local background', () => {
  const html = fs.readFileSync(path.join(resources, 'help/index.html'), 'utf8')
  assert.match(html, /<style>[\s\S]*#container/)
  assert.match(html, /url\("\{\{_res_path\}\}background\.png"\)/)
  assert.doesNotMatch(html, /<link[^>]+stylesheet/)
  assert.ok(fs.statSync(path.join(resources, 'background.png')).size > 0)
})

test('help template renders content and escapes untrusted text', () => {
  const html = renderTemplate('help/index.html', {
    title: '<script>alert(1)</script>',
    subtitle: '菜单',
    columns: 2,
    groups: [{ title: '修炼', items: [{ cmd: '#修炼', desc: '获取修为' }] }]
  })
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /#修炼/)
  assert.doesNotMatch(html, /<script>alert/)
})

test('non-help image templates are no longer supported', () => {
  assert.throws(() => renderTemplate('status/index', {}), /不支持的模板/)
  assert.throws(() => renderTemplate('ranking/index.html', {}), /不支持的模板/)
})

test('escapeHtml handles null values', () => {
  assert.equal(escapeHtml(null), '')
  assert.equal(escapeHtml('a&b'), 'a&amp;b')
})
