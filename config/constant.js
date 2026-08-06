import path from 'node:path'
import { fileURLToPath } from 'node:url'

const _path = process.cwd().replace(/\\/g, '/')

const pluginName = 'xiuxian-plugin'
const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pluginResources = path.join(pluginRoot, 'resources')
const pluginApplications = path.join(pluginRoot, 'apps')
const pluginData = path.join(pluginRoot, 'data')

export {
  _path,
  pluginName,
  pluginRoot,
  pluginResources,
  pluginApplications,
  pluginData,
}
