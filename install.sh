#!/usr/bin/env bash
set -euo pipefail

# 用法: bash install.sh /path/to/Yunzai
YUNZAI_DIR="${1:-$HOME/Yunzai}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
PLUGIN_DIR="$YUNZAI_DIR/plugins/xiuxian-plugin"

echo "=========================================="
echo "  修仙插件 v2.0.0 安装脚本"
echo "=========================================="

if [[ ! -d "$YUNZAI_DIR" ]]; then
  echo "❌ 找不到 Yunzai 目录: $YUNZAI_DIR" >&2
  echo "请指定正确路径: bash install.sh /path/to/Yunzai" >&2
  exit 1
fi
mkdir -p "$YUNZAI_DIR/plugins"
TARGET_PARENT="$(cd -- "$YUNZAI_DIR/plugins" && pwd -P)"
TARGET_REAL="$TARGET_PARENT/xiuxian-plugin"

echo "✅ Yunzai 目录: $YUNZAI_DIR"
if [[ "$SCRIPT_DIR" != "$TARGET_REAL" ]]; then
  if [[ -e "$PLUGIN_DIR" ]]; then
    BACKUP="${PLUGIN_DIR}.bak.$(date +%Y%m%d%H%M%S)"
    echo "⚠️ 检测到旧版，备份至 $BACKUP"
    mv -- "$PLUGIN_DIR" "$BACKUP"
  fi
  cp -a -- "$SCRIPT_DIR" "$PLUGIN_DIR"
  echo "✅ 插件文件已复制到 $PLUGIN_DIR（保留 .git）"
else
  echo "✅ 当前已位于目标插件目录，跳过复制与备份"
fi

cd -- "$PLUGIN_DIR"
echo "📦 正在安装生产依赖..."
# 不通过 tail 管道吞掉退出码；npm 失败会由 set -e 原样终止安装。
npm install --omit=dev
echo "✅ 依赖安装完成"

echo "=========================================="
echo "  🎉 安装完成！"
echo "=========================================="
echo "下一步：重启 Yunzai，并发送 #修仙帮助 测试"
