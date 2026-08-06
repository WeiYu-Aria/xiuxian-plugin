# 玩家存档迁移与回滚

## 存储结构

玩家数据以 SQLite 为唯一持久化数据源：

```text
data/xiuxian.sqlite3
```

Redis 使用 `xiuxian:player:<玩家ID>` 键缓存玩家数据，默认有效期 30 秒。读取优先访问 Redis，未命中或 Redis 故障时回源 SQLite；保存后同步更新缓存，删除后同步失效。

## 从 JSON 自动迁移

首次启动新版插件时会检查 `data/players/*.json`：

1. 只读取安全的 QQ/OpenID 文件名；
2. 校验并解析全部旧存档；
3. 在同一个 SQLite 事务中导入，旧文件名中的玩家 ID 为准；
4. 已存在的数据库记录不会被旧 JSON 覆盖；
5. 全部导入成功后写入迁移标记；
6. 将旧目录改名为 `players.json-backup-时间戳` 留作备份。

任何 JSON 损坏都会中止整批迁移，不会留下部分导入结果。修复对应文件后重新启动即可再次迁移。

## 升级前备份

```bash
cd /path/to/Yunzai/plugins/xiuxian-plugin
cp -a data "data.backup.$(date +%Y%m%d%H%M%S)"
```

SQLite 使用 WAL 模式。在线复制时应同时保存数据库及可能存在的 `-wal`、`-shm` 文件；最稳妥的方法仍是停止 Yunzai 后备份整个 `data` 目录。

## 回滚

如需回滚到 JSON 版本，停止 Yunzai，恢复升级前备份的 `data/players` 目录，再安装旧版插件。新版不会自动把 SQLite 反向导出成 JSON。

## 并发与缓存

- 同一进程内，同一玩家的修改通过串行队列执行，避免命令并发覆盖。
- SQLite 使用 WAL、`busy_timeout=5000` 和事务保证持久化一致性。
- Redis 不是数据源，清空或重启 Redis 不会丢失玩家数据。
- 排行榜直接查询 SQLite 索引，不依赖 Redis，也不扫描 JSON 文件。
