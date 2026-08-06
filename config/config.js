import fs from 'node:fs'
import path from 'node:path'
import { writeJSON } from '../model/Data.js'
import { pluginData } from './constant.js'
import { defaultConfig, normalizeConfig, validateConfigValue } from './schema.js'

const cfgPath = path.resolve(pluginData, 'cfg.json')

function loadUserConfig() {
  if (!fs.existsSync(cfgPath)) return {}
  try { return JSON.parse(fs.readFileSync(cfgPath, 'utf8')) } catch { return {} }
}

class Config {
  constructor() { this._cfg = normalizeConfig(loadUserConfig()) }
  get(key) { return this._cfg[key] }
  set(key, value, { save = true } = {}) {
    this._cfg[key] = validateConfigValue(key, value)
    if (save) this.save()
  }
  setMany(values) {
    const next = { ...this._cfg }
    for (const [key, value] of Object.entries(values)) next[key] = validateConfigValue(key, value)
    this._cfg = next
    this.save()
  }
  all() { return { ...this._cfg } }
  reset() { this._cfg = { ...defaultConfig } }
  save() {
    if (!writeJSON(cfgPath, this._cfg)) throw new Error('保存修仙插件配置失败')
  }
}

const config = new Config()
export default config
