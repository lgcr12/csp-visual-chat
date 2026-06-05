from collections import deque
from pathlib import Path
import sys

from PIL import Image


def is_border_background(pixel):
    r, g, b, a = pixel
    if a == 0:
        return True
    bright = min(r, g, b) >= 232
    neutral = max(r, g, b) - min(r, g, b) <= 42
    return bright and neutral


def remove_background(src, dst):
    image = Image.open(src).convert("RGBA")
    w, h = image.size
    pixels = image.load()
    queue = deque()
    seen = bytearray(w * h)

    def add(x, y):
        idx = y * w + x
        if not seen[idx] and is_border_background(pixels[x, y]):
            seen[idx] = 1
            queue.append((x, y))

    for x in range(w):
        add(x, 0)
        add(x, h - 1)
    for y in range(h):
        add(0, y)
        add(w - 1, y)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                add(nx, ny)

    output = image.copy()
    out = output.load()
    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if seen[idx]:
                r, g, b, _ = out[x, y]
                out[x, y] = (r, g, b, 0)

    bbox = output.getchannel("A").getbbox()
    if bbox:
        pad = 8
        left = max(0, bbox[0] - pad)
        top = max(0, bbox[1] - pad)
        right = min(w, bbox[2] + pad)
        bottom = min(h, bbox[3] + pad)
        output = output.crop((left, top, right, bottom))

    output.save(dst)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: cutout_white_bg.py <input> <output>")
    remove_background(Path(sys.argv[1]), Path(sys.argv[2]))
