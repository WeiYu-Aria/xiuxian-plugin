import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PLUGIN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const PLUGIN_NAME = path.basename(PLUGIN_DIR)

let updaterPromise

/**
 * 复用 Yunzai 自带的插件更新器。
 * - Miao-Yunzai / 部分旧版：plugins/other/update.js
 * - TRSS-Yunzai：plugins/system/apps/update.ts
 */
export async function loadFrameworkUpdater() {
  updaterPromise ??= (async () => {
    const candidates = [
      '../../other/update.js',
      '../../system/apps/update.ts'
    ]

    const errors = []
    for (const modulePath of candidates) {
      try {
        const module = await import(modulePath)
        const Updater = module?.update ?? module?.Update ?? module?.default
        if (typeof Updater === 'function') return Updater
        errors.push(`${modulePath}: 未导出更新类`)
      } catch (error) {
        errors.push(`${modulePath}: ${error?.message || error}`)
      }
    }

    const detail = errors.join('；')
    console.error(`[修仙插件] 无法加载 Yunzai 更新器：${detail}`)
    return null
  })()
  return updaterPromise
}

function isMaster(e) {
  return e?.isMaster === true || e?.sender?.role === 'owner'
}

function normalizeUpdateCommand(force) {
  return `#${force ? '强制' : ''}更新${PLUGIN_NAME}`
}

function bindUpdater(Updater, e) {
  // 兼容不同 Yunzai 更新器：旧版从构造参数取事件，新版从实例 e 取事件。
  const updater = new Updater(e)
  updater.e = e
  if (typeof e?.reply === 'function') updater.reply = e.reply.bind(e)
  return updater
}

export class UpdateApp {
  constructor(e, options = {}) {
    this.e = e
    this.loadUpdater = options.loadUpdater ?? loadFrameworkUpdater
  }

  async goUpdate(force = false) {
    if (!isMaster(this.e)) {
      await this.e.reply('只有 Yunzai 主人可以更新修仙插件。')
      return true
    }

    const Updater = await this.loadUpdater()
    if (!Updater) {
      await this.e.reply('未找到 Yunzai/TRSS 内置更新器，无法自动更新。\n请确认框架的 other/update.js 或 system/apps/update.ts 存在。')
      return true
    }

    try {
      // Yunzai 更新器通过消息内容识别插件和“强制”参数。
      this.e.msg = normalizeUpdateCommand(force)
      const updater = bindUpdater(Updater, this.e)
      if (typeof updater.update !== 'function') throw new TypeError('框架更新器缺少 update() 方法')
      return (await updater.update()) ?? true
    } catch (error) {
      console.error('[修仙插件] 调用框架更新器失败：', error)
      const detail = error?.message || String(error)
      await this.e.reply(`修仙插件更新失败：${detail}\n请检查插件是否通过 git clone 安装，以及 GitHub 网络是否正常。`)
      return true
    }
  }

  async goLog() {
    if (!isMaster(this.e)) {
      await this.e.reply('只有 Yunzai 主人可以查看插件更新日志。')
      return true
    }

    const Updater = await this.loadUpdater()
    if (!Updater) {
      await this.e.reply('未找到 Yunzai/TRSS 内置更新器，无法读取更新日志。')
      return true
    }

    try {
      const updater = bindUpdater(Updater, this.e)
      if (typeof updater.getPlugin !== 'function' || typeof updater.getLog !== 'function') {
        throw new TypeError('当前框架更新器不支持插件日志接口')
      }
      if (!(await updater.getPlugin(PLUGIN_NAME))) {
        await this.e.reply(`更新器未识别到 ${PLUGIN_NAME}。\n请确认目录名为 plugins/${PLUGIN_NAME}，并通过 git clone 安装。`)
        return true
      }
      await this.e.reply(await updater.getLog(PLUGIN_NAME))
    } catch (error) {
      console.error('[修仙插件] 获取更新日志失败：', error)
      await this.e.reply(`获取修仙插件更新日志失败：${error?.message || error}`)
    }
    return true
  }
}

export default UpdateApp
