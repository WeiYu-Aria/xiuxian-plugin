"""
生成 help/icon.png —— 5列 x 10行 的图标精灵图
每个图标 50x50px，共 50 个槽位
用户可替换此文件以自定义图标
"""
from PIL import Image, ImageDraw, ImageFont
import os

COLS, ROWS = 5, 10
SIZE = 50
W, H = COLS * SIZE, ROWS * SIZE

img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# 用 RGB 元组代替字符串颜色，避免 PIL 解析失败
icons = [
    # Row 0: 修炼类 (1-5)
    ((76, 175, 80),   '⚡'),   # 1
    ((255, 152, 0),   '🔥'),   # 2
    ((33, 150, 243),  '📊'),   # 3
    ((156, 39, 176),  '⚙'),   # 4
    ((96, 125, 139),  '❓'),   # 5
    # Row 1: 功法 (11-15)
    ((121, 85, 72),   '📖'),   # 11
    ((255, 87, 34),   '📚'),   # 12
    ((63, 81, 181),   '✏'),   # 13
    ((0, 150, 136),   '✦'),   # 14
    ((233, 30, 99),   '❤'),   # 15
    # Row 2: 丹药 (21-25)
    ((139, 195, 74),  '💊'),   # 21
    ((255, 193, 7),   '🛒'),   # 22
    ((255, 87, 34),   '🍵'),   # 23
    ((103, 58, 183),  '⚗'),   # 24
    ((0, 188, 212),   '✿'),   # 25
    # Row 3: 其他 (31-35)
    ((244, 67, 54),   '🏆'),   # 31
    ((158, 158, 158), '❓'),   # 32
    ((63, 81, 185),   '⚙'),   # 33
    ((76, 175, 80),   '✈'),   # 34
    ((255, 152, 0),   '☀'),   # 35
    # Row 4: 管理 (41-45)
    ((211, 47, 47),   '🔄'),   # 41
    ((198, 40, 40),   '⚠'),   # 42
    ((21, 101, 192),  '📋'),   # 43
    ((96, 125, 139),  '⚙'),   # 44
    ((158, 158, 158), '❓'),   # 45
]

try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-microhei.ttc', 22)
except Exception:
    try:
        font = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 22)
    except Exception:
        font = ImageFont.load_default()

for idx, (bg, symbol) in enumerate(icons):
    row = idx // COLS
    col = idx % COLS
    x, y = col * SIZE, row * SIZE

    # 背景圆角矩形
    draw.rounded_rectangle([x+2, y+2, x+SIZE-3, y+SIZE-3], radius=8, fill=bg)

    # 符号居中
    try:
        bbox = draw.textbbox((0, 0), symbol, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((x + (SIZE - tw)//2, y + (SIZE - th)//2 - 2), symbol, fill='white', font=font)
    except Exception:
        pass

out = os.path.join(os.path.dirname(__file__), 'icon.png')
img.save(out, 'PNG')
print(f'Generated {out}: {W}x{H}')
