#!/usr/bin/env python3
"""Render the Chrome Web Store small promo tile for LinkDeck.

440x280, fully opaque (the store rejects alpha). Composition mirrors the
extension icon: deep indigo ground, the four accent cards, the wordmark.
"""
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

W, H = 440, 280
TOP, BOTTOM = (0x31, 0x2E, 0x81), (0x14, 0x11, 0x30)
INK, MUTED = (0xF8, 0xFA, 0xFC), (0xC7, 0xD2, 0xFE)
ACCENTS = [(0x63, 0x66, 0xF1), (0xF5, 0x9E, 0x0B), (0x22, 0xC5, 0x5E), (0x0E, 0xA5, 0xE9)]

BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
REG = "/System/Library/Fonts/Supplemental/Arial.ttf"


def main(icon_path, out_path):
    img = Image.new("RGB", (W, H), TOP)
    d = ImageDraw.Draw(img)

    # Vertical gradient ground
    for y in range(H):
        t = y / (H - 1)
        d.line([(0, y), (W, y)], fill=tuple(
            round(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3)))

    # Icon, left
    icon = Image.open(icon_path).convert("RGBA").resize((128, 128), Image.LANCZOS)
    img.paste(icon, (40, 52), icon)

    # Wordmark and tagline, right
    d.text((196, 74), "LinkDeck", font=ImageFont.truetype(BOLD, 46), fill=INK)
    f = ImageFont.truetype(REG, 17)
    d.text((198, 132), "Your new tab,", font=f, fill=MUTED)
    d.text((198, 154), "finally worth opening.", font=f, fill=MUTED)

    # Accent rule, echoing the four colour-coded sections
    x = 198
    for c in ACCENTS:
        d.rounded_rectangle([x, 190, x + 38, 196], radius=3, fill=c)
        x += 46

    img.save(out_path, "PNG")
    assert Image.open(out_path).mode == "RGB", "promo tile must be opaque"
    print(f"{out_path}: {img.size[0]}x{img.size[1]} {Image.open(out_path).mode}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
