import lodash from 'lodash'
import fs from 'fs'
import path from 'path'
import Data from '../../model/Data.js'
import { pluginResources } from '../../config/constant.js'

const themeDir = path.join(pluginResources, 'help/theme/')

async function getThemeCfg(theme, exclude) {
  let ret = []
  let names = []
  let dirs = []
  try {
    dirs = fs.readdirSync(themeDir)
  } catch (e) {
    dirs = []
  }

  for (const dir of dirs) {
    if (fs.existsSync(path.join(themeDir, dir, 'main.png'))) {
      names.push(dir)
    }
  }

  if (lodash.isArray(theme)) {
    ret = lodash.intersection(theme, names)
  } else if (theme === 'all') {
    ret = names
  }

  if (exclude && lodash.isArray(exclude)) {
    ret = lodash.difference(ret, exclude)
  }

  if (ret.length === 0) ret = ['default']

  const name = lodash.sample(ret)
  const resPath = '{{_res_path}}help/theme/'
  const dirPath = path.join(themeDir, name)

  let themeStyle = {}
  try {
    themeStyle = (await Data.importModule(`resources/help/theme/${name}/config.js`)).style || {}
  } catch (e) {
    themeStyle = {}
  }

  return {
    name,
    main: `${resPath}${name}/main.png`,
    bg: fs.existsSync(path.join(dirPath, 'bg.jpg'))
      ? `${resPath}${name}/bg.jpg`
      : `${resPath}default/bg.jpg`,
    style: themeStyle,
  }
}

async function getThemeData(helpCfg) {
  const cfg = lodash.cloneDeep(helpCfg || {})
  const colCount = Math.min(5, Math.max(parseInt(cfg.colCount) || 3, 2))
  const colWidth = Math.min(500, Math.max(100, parseInt(cfg.colWidth) || 265))
  const width = Math.min(2500, Math.max(800, colCount * colWidth + 30))

  const theme = await getThemeCfg(cfg.theme, cfg.themeExclude)
  const ts = theme.style || {}

  const out = [
    `body { background-image: url(${theme.bg}); width: ${width}px; }`,
    `.container { background-image: url(${theme.main}); width: ${width}px; }`,
  ]

  function css(sel, prop, key, def, fn) {
    let val = Data.def(ts[key], cfg[key], def)
    if (fn) val = fn(val)
    out.push(`${sel} { ${prop}: ${val}; }`)
  }

  css('.help-title, .help-group', 'color', 'fontColor', '#d3bc8e')
  css('.help-title, .help-group', 'text-shadow', 'fontShadow', 'none')
  css('.help-desc', 'color', 'descColor', '#cccccc')
  css('.cont-box', 'background', 'contBgColor', 'rgba(6,21,31,0.5)')
  css('.cont-box', 'backdrop-filter', 'contBgBlur', 3,
    n => cfg.bgBlur === false ? 'none' : `blur(${n}px)`)
  css('.help-group', 'background', 'headerBgColor', 'rgba(6,21,31,0.4)')
  css('.help-table .tr:nth-child(odd)', 'background', 'rowBgColor1', 'rgba(6,21,31,0.2)')
  css('.help-table .tr:nth-child(even)', 'background', 'rowBgColor2', 'rgba(6,21,31,0.35)')

  return {
    style: out.join('\n'),
    colCount,
    themeName: theme.name,
  }
}

export default { getThemeCfg, getThemeData }
