// Data.js —— 通用数据工具
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { pluginRoot } from '../config/constant.js'

// 动态导入模块（支持锅巴热更新）
export async function importModule(relativePath) {
  const fullPath = path.join(pluginRoot, relativePath)
  const url = `${pathToFileURL(fullPath).href}?t=${Date.now()}`
  return await import(url)
}

// 取值：优先 a，其次 b，再其次 def
export function def(a, b, defVal) {
  if (a !== undefined && a !== null && a !== '') return a
  if (b !== undefined && b !== null && b !== '') return b
  return defVal
}

// 深度合并
export function mergeDeep(target, ...sources) {
  for (const src of sources) {
    for (const [k, v] of Object.entries(src || {})) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        target[k] = mergeDeep(target[k] || {}, v)
      } else {
        target[k] = v
      }
    }
  }
  return target
}

// 读取 JSON 文件
export function readJSON(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }
  } catch (e) {
    console.error('[Data] readJSON error:', e)
  }
  return fallback
}

/**
 * 原子写入 JSON：同目录临时文件写完后 rename，避免进程中断留下半个存档。
 * Node 的同步文件操作本身会在单进程内串行执行，因此保留原有同步 API，
 * 不额外引入会改变调用方式的异步锁。
 */
export function writeJSON(filePath, data) {
  const dir = path.dirname(filePath)
  const tempPath = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`
  )

  try {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
    fs.renameSync(tempPath, filePath)
    return true
  } catch (e) {
    try { fs.rmSync(tempPath, { force: true }) } catch { /* ignore cleanup errors */ }
    console.error('[Data] writeJSON error:', e)
    return false
  }
}

export default { importModule, def, mergeDeep, readJSON, writeJSON }
