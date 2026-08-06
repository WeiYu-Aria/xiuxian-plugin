import path from 'node:path'
import config from './config/config.js'
import { pluginRoot } from './config/constant.js'

const schemas = [
  group('修炼设置'),
  number('cultivateCd', '修炼冷却', '两次修炼之间的冷却时间，单位为秒', 0, 86400, 1),
  number('cultivateExpMin', '最低修为', '单次修炼获得修为的下限', 0, 1000000000, 1),
  number('cultivateExpMax', '最高修为', '单次修炼获得修为的上限', 0, 1000000000, 1),

  group('灵石设置'),
  number('stoneDropChance', '掉落概率', '修炼时掉落灵石的概率，0 表示关闭，1 表示必定掉落', 0, 1, 0.01),
  number('stoneDropMin', '掉落下限', '单次掉落灵石的最小数量', 0, 1000000, 1),
  number('stoneDropMax', '掉落上限', '单次掉落灵石的最大数量', 0, 1000000, 1),

  group('突破设置'),
  number('minorFailLoseRatio', '小境界失败损失', '突破小境界失败时损失的修为比例', 0, 1, 0.01),
  number('majorFailLoseRatio', '大境界失败损失', '突破大境界失败时损失的修为比例', 0, 1, 0.01),

  group('帮助图片设置'),
  text('helpTitle', '帮助菜单标题', '帮助菜单顶部显示的标题', 80),
  text('helpSubtitle', '帮助菜单副标题', '留空可隐藏副标题', 160),
  number('helpColumns', '帮助菜单列数', '建议使用 2 列', 1, 6, 1),
  number('helpColWidth', '帮助菜单列宽', '每列宽度，单位为像素', 120, 1000, 1),
  text('helpTheme', '帮助菜单主题', '主题目录名称', 64)
]

export function supportGuoba() {
  return {
    pluginInfo: {
      name: 'xiuxian-plugin',
      title: '修仙插件',
      description: '面向 Yunzai 的文字放置修仙插件',
      author: 'WeiYu-Aria',
      authorLink: 'https://github.com/WeiYu-Aria',
      link: 'https://github.com/WeiYu-Aria/xiuxian-plugin',
      isV3: true,
      isV2: false,
      showInMenu: 'auto',
      icon: 'mingcute:taiji-line',
      iconColor: '#6ecdc1',
      iconPath: path.join(pluginRoot, 'resources/help/icon.png')
    },
    configInfo: {
      schemas,
      getConfigData() {
        return config.all()
      },
      setConfigData(data, { Result } = {}) {
        try {
          config.setMany(data)
          return Result?.ok ? Result.ok({}, '保存成功') : true
        } catch (error) {
          return Result?.error
            ? Result.error(error.message)
            : { success: false, message: error.message }
        }
      }
    }
  }
}

function group(label) {
  return { label, component: 'SOFT_GROUP_BEGIN' }
}

function number(field, label, bottomHelpMessage, min, max, step) {
  return {
    field,
    label,
    bottomHelpMessage,
    component: 'InputNumber',
    required: true,
    componentProps: { min, max, step, style: { width: '100%' } }
  }
}

function text(field, label, bottomHelpMessage, maxlength) {
  return {
    field,
    label,
    bottomHelpMessage,
    component: 'Input',
    componentProps: { maxlength, allowClear: true }
  }
}
