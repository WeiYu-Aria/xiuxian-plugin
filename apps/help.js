import config from '../config/config.js'
import { renderImage } from '../model/render.js'

const HELP_GROUPS = [
  {
    title: '修炼',
    items: [
      { cmd: '#修炼 / #打坐', desc: '闭关获取修为（有冷却）' },
      { cmd: '#我的修为', desc: '查看个人修仙面板' },
      { cmd: '#突破', desc: '尝试突破瓶颈（有风险）' }
    ]
  },
  {
    title: '功法',
    items: [
      { cmd: '#功法商店', desc: '浏览可购买功法' },
      { cmd: '#修习 [id]', desc: '花费灵石学习功法' },
      { cmd: '#我的功法', desc: '查看当前功法' }
    ]
  },
  {
    title: '丹药',
    items: [
      { cmd: '#买丹药 [id] [数量]', desc: '购买丹药' },
      { cmd: '#服用 [id]', desc: '使用丹药（有每日上限）' },
      { cmd: '#我的丹药', desc: '查看背包' }
    ]
  },
  {
    title: '其他',
    items: [
      { cmd: '#修仙榜', desc: '查看全服境界排行' },
      { cmd: '#修仙帮助', desc: '显示本菜单' }
    ]
  }
]

export class HelpApp {
  constructor(e) { this.e = e }

  async go() {
    const savedSubtitle = config.get('helpSubtitle')
    const subtitle = savedSubtitle === '文字放置修仙 · 指令菜单'
      ? '指令菜单'
      : savedSubtitle.replace(/^文字放置修仙\s*[·•|｜-]?\s*/, '')

    const data = {
      title: config.get('helpTitle'),
      subtitle,
      groups: HELP_GROUPS,
      columns: config.get('helpColumns') || 2,
      colWidth: config.get('helpColWidth') || 280
    }

    const rendered = await renderImage(this.e, 'help/index.html', data)
    if (rendered) return true

    // 文本兜底
    let msg = `${data.title}\n${data.subtitle}\n\n`
    for (const g of HELP_GROUPS) {
      msg += `${g.title}\n`
      for (const it of g.items) {
        msg += `${it.cmd}\n${it.desc}\n`
      }
      msg += '\n'
    }
    msg += '修炼会随机掉落灵石，可用于购买功法和丹药。'
    await this.e.reply(msg)
    return true
  }
}
