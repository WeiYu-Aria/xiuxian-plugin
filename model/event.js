import { Player } from './player.js'

export function getUserId(e) {
  return Player.normalizeId(e?.user_id ?? e?.sender?.user_id)
}

export async function replySafely(e, message, options) {
  if (typeof e?.reply !== 'function') throw new TypeError('事件缺少 reply 方法')
  return e.reply(message, options)
}

export async function runCommand(e, label, handler) {
  try { return await handler() } catch (error) {
    console.error(`[修仙插件] ${label}失败:`, error)
    await replySafely(e, '操作失败，请稍后重试；若持续出现，请联系机器人主人查看日志。')
    return true
  }
}
