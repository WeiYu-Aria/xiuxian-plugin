import plugin from '../../lib/plugins/plugin.js'
import { CultivateApp } from './apps/cultivate.js'
import { StatusApp } from './apps/status.js'
import { BreakthroughApp } from './apps/breakthrough.js'
import { HelpApp } from './apps/help.js'
import { RankingApp } from './apps/ranking.js'
import { TechniqueApp } from './apps/technique.js'
import { PillApp } from './apps/pill.js'
import { UpdateApp } from './apps/update.js'
import { runCommand } from './model/event.js'

export class XiuxianPlugin extends plugin {
  constructor() {
    super({
      name: '修仙插件', dsc: '文字放置修仙游戏', event: 'message', priority: 100,
      rule: [
        { reg: '^#(修炼|打坐|修仙)$', fnc: 'cultivate' },
        { reg: '^#(我的修为|修为|面板)$', fnc: 'status' },
        { reg: '^#突破$', fnc: 'breakthrough' },
        { reg: '^#(修仙帮助|修仙菜单|修仙指令)$', fnc: 'help' },
        { reg: '^#修仙榜$', fnc: 'ranking' },
        { reg: '^#功法商店$', fnc: 'techniqueShop' },
        { reg: '^#修习 (.+)$', fnc: 'learnTechnique' },
        { reg: '^#我的功法$', fnc: 'myTechnique' },
        { reg: '^#买丹药 (.+)$', fnc: 'buyPill' },
        { reg: '^#服用 (.+)$', fnc: 'usePill' },
        { reg: '^#我的丹药$', fnc: 'myPills' },
        { reg: '^#?(修仙|xiuxian)(插件)?(强制)?更新$|^#?(强制)?更新(修仙|xiuxian)(插件)?$', fnc: 'updatePlugin', permission: 'master' },
        { reg: '^#?(修仙|xiuxian)(插件)?更新日志$', fnc: 'updateLog', permission: 'master' }
      ]
    })
  }

  dispatch(label, App, method = 'go', ...args) {
    return runCommand(this.e, label, () => new App(this.e)[method](...args))
  }
  async cultivate() { return this.dispatch('修炼', CultivateApp) }
  async status() { return this.dispatch('修为面板', StatusApp) }
  async breakthrough() { return this.dispatch('突破', BreakthroughApp) }
  async help() { return this.dispatch('帮助', HelpApp) }
  async ranking() { return this.dispatch('排行榜', RankingApp) }
  async techniqueShop() { return this.dispatch('功法商店', TechniqueApp, 'goShop') }
  async learnTechnique() { return this.dispatch('修习功法', TechniqueApp, 'goLearn') }
  async myTechnique() { return this.dispatch('我的功法', TechniqueApp, 'goMy') }
  async buyPill() { return this.dispatch('购买丹药', PillApp, 'goBuy') }
  async usePill() { return this.dispatch('服用丹药', PillApp, 'goUse') }
  async myPills() { return this.dispatch('我的丹药', PillApp, 'goMy') }
  async updatePlugin() { return this.dispatch('更新', UpdateApp, 'goUpdate', this.e.msg.includes('强制')) }
  async updateLog() { return this.dispatch('更新日志', UpdateApp, 'goLog') }
}

export default XiuxianPlugin
