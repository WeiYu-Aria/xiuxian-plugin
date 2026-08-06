const htmlEscapes = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => htmlEscapes[char])
}

export function renderHelpTemplate(data = {}) {
  const groupIcons = ['🧘', '📜', '🧪', '✨']
  const groups = (data.groups || []).map((group, index) => `
    <div class="group">
      <div class="group-head">
        <div class="group-icon">${groupIcons[index] || '✦'}</div>
        <div class="group-title">${escapeHtml(group.title)}</div>
      </div>
      <div class="items">${(group.items || []).map(item => `
        <div class="item">
          <div class="cmd">${escapeHtml(item.cmd)}</div>
          <div class="desc">${escapeHtml(item.desc)}</div>
        </div>`).join('')}
      </div>
    </div>`).join('')

  return `
  <div class="header glass">
    <div class="app-icon">☯</div>
    <div class="heading">
      <div class="eyebrow">CULTIVATION</div>
      <div class="title">${escapeHtml(data.title)}</div>
      <div class="subtitle">${escapeHtml(data.subtitle)}</div>
    </div>
    <div class="version">CLEAR 04</div>
  </div>
  <div class="content" style="column-count:${Number(data.columns) || 2};">${groups}</div>
  <div class="footer glass"><span class="footer-dot"></span>修炼有缘得灵石，可用于购置功法与丹药</div>`
}

export function renderTemplate(tplPath, data) {
  const normalized = tplPath.replace(/\\/g, '/').replace(/\.html$/, '')
  if (normalized === 'help/index') return renderHelpTemplate(data)
  throw new Error(`不支持的模板：${tplPath}`)
}

export default { escapeHtml, renderTemplate }
