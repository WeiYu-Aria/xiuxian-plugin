export const defaultConfig = Object.freeze({
  cultivateCd: 300,
  cultivateExpMin: 10,
  cultivateExpMax: 30,
  stoneDropChance: 0.3,
  stoneDropMin: 1,
  stoneDropMax: 5,
  minorFailLoseRatio: 0.2,
  majorFailLoseRatio: 0.5,
  helpTitle: '修仙插件',
  helpSubtitle: '指令菜单',
  helpColumns: 2,
  helpColWidth: 280,
  helpTheme: 'default'
})

const rules = {
  cultivateCd: number(0, 86400, true),
  cultivateExpMin: number(0, 1e9, true),
  cultivateExpMax: number(0, 1e9, true),
  stoneDropChance: number(0, 1),
  stoneDropMin: number(0, 1e6, true),
  stoneDropMax: number(0, 1e6, true),
  minorFailLoseRatio: number(0, 1),
  majorFailLoseRatio: number(0, 1),
  helpTitle: string(1, 80),
  helpSubtitle: string(0, 160),
  helpColumns: number(1, 6, true),
  helpColWidth: number(120, 1000, true),
  helpTheme: value => /^[\w-]+$/.test(String(value)) ? String(value) : invalid('主题名格式无效'),
}

export function validateConfigValue(key, value) {
  if (!Object.hasOwn(rules, key)) throw new TypeError(`未知配置项：${key}`)
  return rules[key](value)
}

export function normalizeConfig(input = {}) {
  const output = { ...defaultConfig }
  for (const [key, value] of Object.entries(input)) {
    if (!Object.hasOwn(rules, key)) continue
    try { output[key] = validateConfigValue(key, value) } catch { /* 非法旧配置回退默认值 */ }
  }
  return output
}

function number(min, max, integer = false) {
  return value => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < min || parsed > max || (integer && !Number.isInteger(parsed))) {
      return invalid(`应为 ${min}~${max} 的${integer ? '整数' : '数字'}`)
    }
    return parsed
  }
}
function string(min, max) {
  return value => {
    if (typeof value !== 'string' || value.length < min || value.length > max) return invalid(`文本长度应为 ${min}~${max}`)
    return value
  }
}
function invalid(message) { throw new TypeError(message) }
