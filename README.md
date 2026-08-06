# xiuxian-plugin

## 介绍

一个适用于 Yunzai/TRSS-Yunzai 的文字修仙插件。

目前有修炼、突破、灵石、丹药、功法、修为面板和排行榜等内容，配置可在锅巴后台修改。玩家数据使用 SQLite 持久化，并复用 Yunzai 的 Redis 作为读取缓存。

## 运行要求

- Node.js 22.13.0 或更高版本
- Yunzai 已正常连接 Redis

Redis 只作为缓存。Redis 暂时不可用时会自动读取 SQLite，不影响玩家存档。

## 安装

在 Yunzai 根目录执行：

```shell
cd plugins
git clone https://github.com/WeiYu-Aria/xiuxian-plugin.git
cd xiuxian-plugin
npm install --omit=dev
```

安装完成后重启 Yunzai，发送 `#修仙帮助` 即可查看菜单。

## 指令

```text
#修炼
#我的修为
#突破
#修仙榜
#功法商店
#修习 功法ID
#我的功法
#买丹药 丹药ID 数量
#服用 丹药ID
#我的丹药
#修仙帮助
```

插件主人还可以使用：

```text
#更新修仙插件
#强制更新修仙插件
#修仙更新日志
```

## 配置

安装 [锅巴插件](https://github.com/guoba-yunzai/guoba-plugin) 后，可在锅巴后台修改修炼、灵石、突破和帮助菜单等设置。

玩家数据库保存在：

```text
data/xiuxian.sqlite3
```

旧版 `data/players/*.json` 会在首次启动时自动导入数据库。成功后，原目录会改名为带时间戳的备份目录，不会被删除。

更新或迁移前建议先备份整个 `data` 目录。

## 其他

有问题可以提交 Issue，想改功能也欢迎提交 Pull Request。

项目地址：[https://github.com/WeiYu-Aria/xiuxian-plugin](https://github.com/WeiYu-Aria/xiuxian-plugin)
