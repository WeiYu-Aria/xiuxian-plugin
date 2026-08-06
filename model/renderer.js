/**
 * renderer.js —— 用 puppeteer 把 HTML 渲染成图片发到 QQ
 * 兼容 TRSS-Yunzai 的 e.runtime.render 模式
 */
import { config } from '../config/config.js'

const DEFAULT_WIDTH = 800
const DEFAULT_HEIGHT = 1200

export async function renderToImage(e, html, options = {}) {
  const width = options.width || DEFAULT_WIDTH
  const height = options.height || DEFAULT_HEIGHT
  const selector = options.selector || 'body'

  // 优先用 TRSS 自带的渲染后端
  if (e.runtime?.render) {
    try {
      return await e.runtime.render(html, {
        width,
        height,
        selector,
        type: 'png',
        quality: 90,
        ...options.renderOpts,
      })
    } catch (err) {
      console.warn('[修仙插件] e.runtime.render 失败，回退 puppeteer:', err.message)
    }
  }

  // 回退：直接调 puppeteer
  const puppeteer = await import('puppeteer').catch(() => null)
  if (!puppeteer) throw new Error('未安装 puppeteer，无法渲染图片')

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width, height })
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const el = await page.$(selector)
    const buf = await el.screenshot({ type: 'png', omitBackground: true })
    return buf
  } finally {
    await browser.close()
  }
}

/** 简易 HTML 模板：仙侠风面板 */
export function wrapPanel(title, sections, opts = {}) {
  const bg = opts.bg || 'linear-gradient(160deg, #1a0e2e 0%, #2d1b4e 40%, #1a0e2e 100%)'
  const accent = opts.accent || '#d4a574'
  const text = opts.text || '#e8d5b5'

  const sectionsHtml = sections.map(s => `
    <div class="section">
      ${s.title ? `<div class="section-title">${s.title}</div>` : ''}
      <div class="section-body">${s.body}</div>
    </div>
  `).join('\n')

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 800px;
    min-height: 200px;
    background: ${bg};
    font-family: "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif;
    color: ${text};
    padding: 32px 40px;
  }
  .title {
    text-align: center;
    font-size: 36px;
    font-weight: bold;
    color: ${accent};
    text-shadow: 0 0 20px ${accent}66;
    margin-bottom: 24px;
    letter-spacing: 6px;
  }
  .section { margin-bottom: 20px; }
  .section-title {
    font-size: 20px;
    color: ${accent};
    border-left: 4px solid ${accent};
    padding-left: 12px;
    margin-bottom: 10px;
  }
  .section-body {
    font-size: 18px;
    line-height: 1.8;
    padding-left: 16px;
  }
  .row { display: flex; justify-content: space-between; padding: 4px 0; }
  .row .label { color: #aaa; }
  .row .value { color: ${text}; font-weight: bold; }
  .bar-bg {
    width: 100%; height: 14px; background: #333; border-radius: 7px; overflow: hidden;
    margin-top: 6px;
  }
  .bar-fill { height: 100%; background: linear-gradient(90deg, ${accent}, #f0c27f); border-radius: 7px; }
  .pill { display: inline-block; background: ${accent}33; border: 1px solid ${accent}66; border-radius: 4px; padding: 2px 8px; margin: 2px 4px 2px 0; font-size: 15px; }
  .danger { color: #ff6b6b; }
  .success { color: #51cf66; }
  .warning { color: #ffd43b; }
  .muted { color: #888; font-size: 14px; }
  hr { border: none; border-top: 1px solid #ffffff22; margin: 16px 0; }
</style>
</head>
<body>
  <div class="title">${title}</div>
  ${sectionsHtml}
</body>
</html>`
}
