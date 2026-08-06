"""生成默认主题的背景图 main.png 和 bg.jpg"""
from PIL import Image, ImageDraw, ImageFilter
import os, math, random

random.seed(42)
OUT = os.path.dirname(__file__)

# ===== main.png: 装饰横幅 (800x200) =====
W, H = 800, 200
img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

for y in range(H):
    r = int(30 + 40 * (y / H))
    g = int(15 + 25 * (y / H))
    b = int(50 + 60 * (y / H))
    draw.line([(0, y), (W, y)], fill=(r, g, b, 200))

draw.line([(20, H//2), (W-20, H//2)], fill=(211, 188, 142, 120), width=2)
draw.line([(20, H//2-30), (W-20, H//2-30)], fill=(211, 188, 142, 40), width=1)
draw.line([(20, H//2+30), (W-20, H//2+30)], fill=(211, 188, 142, 40), width=1)

for _ in range(60):
    x = random.randint(0, W)
    y = random.randint(0, H)
    r = random.randint(1, 3)
    a = random.randint(50, 180)
    draw.ellipse([x-r, y-r, x+r, y+r], fill=(255, 240, 200, a))

img.save(os.path.join(OUT, 'main.png'), 'PNG')
print(f'Generated main.png: {W}x{H}')

# ===== bg.jpg: 全屏背景 (1000x600) =====
W, H = 1000, 600
img2 = Image.new('RGBA', (W, H), (20, 10, 40, 255))
draw2 = ImageDraw.Draw(img2)

for y in range(H):
    t = y / H
    r = int(20 + 15 * t)
    g = int(10 + 8 * t)
    b = int(40 + 30 * t)
    draw2.line([(0, y), (W, y)], fill=(r, g, b, 255))

# 雾气
overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
od = ImageDraw.Draw(overlay)
for _ in range(20):
    x = random.randint(0, W)
    y = random.randint(0, H)
    r = random.randint(80, 200)
    od.ellipse([x-r, y-r, x+r, y+r], fill=(80, 50, 120, 15))

overlay = overlay.filter(ImageFilter.GaussianBlur(60))
img2 = Image.alpha_composite(img2, overlay).convert('RGB')

# 用白色小圆点代替 emoji 星光
draw3 = ImageDraw.Draw(img2)
for _ in range(80):
    x = random.randint(0, W)
    y = random.randint(0, H)
    s = random.randint(1, 2)
    draw3.ellipse([x-s, y-s, x+s, y+s], fill=(255, 245, 220))

img2.save(os.path.join(OUT, 'bg.jpg'), 'JPEG', quality=85)
print(f'Generated bg.jpg: {W}x{H}')
