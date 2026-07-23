import json
import math
import os
from datetime import date

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "dev-overview")
MANIFEST = os.path.join(OUT_DIR, "manifest.json")
OUT = os.path.join(OUT_DIR, "overview.png")

FONT_BOLD = "/usr/share/fonts/truetype/nanum/NanumSquareB.ttf"
FONT_REG = "/usr/share/fonts/truetype/nanum/NanumSquareR.ttf"

CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩"

with open(MANIFEST, encoding="utf-8") as f:
    pages = json.load(f)

imgs = [Image.open(p["file"]).convert("RGB") for p in pages]
labels = [f"{CIRCLED[i] if i < len(CIRCLED) else i + 1} {p['label']}" for i, p in enumerate(pages)]
cell_w, cell_h = imgs[0].size

COLS = min(3, len(imgs))
ROWS = math.ceil(len(imgs) / COLS)
PAD = 28
LABEL_H = 52
TITLE_H = 96
BG = (245, 240, 232)
CARD_BG = (255, 255, 255)
LABEL_COLOR = (61, 46, 28)
TITLE_COLOR = (46, 34, 20)
BORDER = (223, 210, 190)

cell_total_w = cell_w + PAD * 2
cell_total_h = cell_h + LABEL_H + PAD * 2

canvas_w = cell_total_w * COLS
canvas_h = TITLE_H + cell_total_h * ROWS

canvas = Image.new("RGB", (canvas_w, canvas_h), BG)
draw = ImageDraw.Draw(canvas)

title_font = ImageFont.truetype(FONT_BOLD, 34)
sub_font = ImageFont.truetype(FONT_REG, 18)
label_font = ImageFont.truetype(FONT_BOLD, 22)

title_text = "DormEats 개발 현황 — 전체 페이지 한눈에 보기"
tw = draw.textlength(title_text, font=title_font)
draw.text(((canvas_w - tw) / 2, 22), title_text, font=title_font, fill=TITLE_COLOR)
sub_text = f"{date.today().isoformat()} 기준 · 하단 탭 {len(imgs)}종 스냅샷"
sw = draw.textlength(sub_text, font=sub_font)
draw.text(((canvas_w - sw) / 2, 64), sub_text, font=sub_font, fill=(120, 104, 82))

for i, (img, label) in enumerate(zip(imgs, labels)):
    col = i % COLS
    row = i // COLS
    x0 = col * cell_total_w
    y0 = TITLE_H + row * cell_total_h

    card_x0, card_y0 = x0 + PAD // 2, y0 + PAD // 2
    card_x1, card_y1 = x0 + cell_total_w - PAD // 2, y0 + cell_total_h - PAD // 2
    draw.rounded_rectangle([card_x0, card_y0, card_x1, card_y1], radius=18, fill=CARD_BG, outline=BORDER, width=2)

    lw = draw.textlength(label, font=label_font)
    label_x = x0 + (cell_total_w - lw) / 2
    label_y = y0 + PAD
    draw.text((label_x, label_y), label, font=label_font, fill=LABEL_COLOR)

    img_x = x0 + (cell_total_w - cell_w) // 2
    img_y = y0 + LABEL_H + PAD
    canvas.paste(img, (img_x, img_y))

canvas.save(OUT, quality=95)
print("Saved:", OUT, canvas.size)
