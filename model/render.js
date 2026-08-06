/**
 * 统一渲染封装：优先使用 Yunzai runtime.render，失败时回退本地 Puppeteer。
 */
import fs from 'node:fs'
import path from 'node:path'
import { pluginResources } from '../config/constant.js'
import { renderTemplate } from './template.js'

function buildFallbackHtml(tplPath, data) {
  const relativePath = tplPath.endsWith('.html') ? tplPath : `${tplPath}.html`
  const htmlPath = path.resolve(pluginResources, relativePath)
  const source = fs.readFileSync(htmlPath, 'utf8')
  const body = renderTemplate(tplPath, data)
  const resourceUrl = `${new URL('../resources/', import.meta.url).href}`
  return source
    .replaceAll('{{_res_path}}', resourceUrl)
    .replace('{{@renderedContent}}', body)
}

export async function renderImage(e, tplPath, data, cfg = {}) {
  const plugin = 'xiuxian-plugin'
  const defaultCfg = {
    retType: 'default',
    pageGotoParams: { waitUntil: 'networkidle0', timeout: 30000 }
  }
  const finalCfg = { ...defaultCfg, ...cfg }

  try {
    if (e?.runtime && typeof e.runtime.render === 'function') {
      const renderData = { ...data, renderedContent: renderTemplate(tplPath, data) }
      const rendered = await e.runtime.render(plugin, tplPath, renderData, finalCfg)
      return rendered ?? true
    }
  } catch (err) {
    console.error('[修仙插件] runtime.render 失败，尝试兜底:', err.message)
  }

  let browser
  try {
    const puppeteerModule = await import('puppeteer')
    const puppeteer = puppeteerModule.default || puppeteerModule
    const launchOptions = {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
    if (process.env.CHROMIUM_PATH) launchOptions.executablePath = process.env.CHROMIUM_PATH

    browser = await puppeteer.launch(launchOptions)
    const page = await browser.newPage()
    await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 2 })

    const html = buildFallbackHtml(tplPath, data)
    await page.setContent(html, { waitUntil: 'load' })
    await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready })
    const el = await page.$('#container') || await page.$('body')
    if (!el) throw new Error('模板未生成可截图节点')
    const buf = await el.screenshot({ type: 'png', omitBackground: true })

    if (e?.replyWithPro) {
      const delivered = await e.replyWithPro(buf, { type: 'image' })
      return delivered ?? true
    }
    if (e?.reply) {
      const delivered = await e.reply(buf, { type: 'image' })
      return delivered ?? true
    }
    return buf
  } catch (err) {
    console.error('[修仙插件] 兜底渲染也失败:', err.message)
    return null
  } finally {
    if (browser) {
      try { await browser.close() } catch (err) {
        console.warn('[修仙插件] 关闭浏览器失败:', err.message)
      }
    }
  }
}

export { buildFallbackHtml }
export default { renderImage }
