import { pluginName } from './constant.js'

export const helpCfg = {
  title: '修仙帮助',
  subTitle: pluginName,
  columnCount: 3,
  colWidth: 265,
  theme: 'all',
  themeExclude: [],
  style: {
    fontColor: '#d3bc8e',
    descColor: '#eee',
    contBgColor: 'rgba(6, 21, 31, .5)',
    contBgBlur: 3,
    headerBgColor: 'rgba(6, 21, 31, .4)',
    rowBgColor1: 'rgba(6, 21, 31, .2)',
    rowBgColor2: 'rgba(6, 21, 31, .35)'
  }
}

export const helpList = [{
  group: '💬 修炼类'
}, {
  group: '修炼',
  list: [
    { icon: 1, title: '#修炼', desc: '闭关获取修为（有CD）' },
    { icon: 2, title: '#突破', desc: '尝试突破瓶颈（有风险）' },
    { icon: 3, title: '#我的修为', desc: '查看个人修仙面板' },
  ]
}, {
  group: '功法',
  list: [
    { icon: 11, title: '#功法', desc: '查看当前主修功法' },
    { icon: 12, title: '#功法商店', desc: '浏览可购买功法' },
    { icon: 13, title: '#修习 [功法ID]', desc: '花费灵石学习功法' },
  ]
}, {
  group: '丹药',
  list: [
    { icon: 21, title: '#丹药商店', desc: '查看可购买丹药' },
    { icon: 22, title: '#买丹药 [ID] [数量]', desc: '花费灵石购买丹药' },
    { icon: 23, title: '#服用 [丹药ID]', desc: '使用丹药（有每日上限）' },
  ]
}, {
  group: '其他',
  list: [
    { icon: 31, title: '#修仙榜', desc: '查看全服境界排行榜' },
    { icon: 32, title: '#修仙帮助', desc: '显示本帮助菜单' },
  ]
}, {
  group: '管理命令，仅主人可用',
  auth: 'master',
  list: [
    { icon: 41, title: '#更新修仙插件', desc: '更新插件到最新版' },
    { icon: 42, title: '#强制更新修仙插件', desc: '强制覆盖更新' },
    { icon: 43, title: '#修仙更新日志', desc: '查看插件更新记录' },
  ]
}]
