"""Генерирует иконку лаунчера (1024x1024 PNG) без внешних ассетов."""
from PIL import Image, ImageDraw, ImageFilter
import sys

S = 1024
out = sys.argv[1] if len(sys.argv) > 1 else "branding/icon.png"

# диагональный градиент
img = Image.new("RGBA", (S, S))
px = img.load()
c1, c2 = (124, 92, 255), (34, 211, 238)
for y in range(S):
    for x in range(S):
        t = (x + y) / (2 * S - 2)
        px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)) + (255,)

# скругление
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle((40, 40, S - 40, S - 40), radius=220, fill=255)
base = Image.new("RGBA", (S, S), (0, 0, 0, 0))
base.paste(img, (0, 0), mask)

# буква N из трёх параллелограммов
d = ImageDraw.Draw(base)
w = 120
l, r, t, b = 300, 724, 270, 754
d.polygon([(l, b), (l, t), (l + w, t), (l + w, b)], fill="white")
d.polygon([(r - w, b), (r - w, t), (r, t), (r, b)], fill="white")
d.polygon([(l, t), (l + w + 10, t), (r, b), (r - w - 10, b)], fill="white")

# мягкая тень
shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
shadow.paste((0, 0, 0, 90), (0, 0), mask.filter(ImageFilter.GaussianBlur(18)))
final = Image.alpha_composite(shadow, base)
final.save(out)
print("saved", out)
