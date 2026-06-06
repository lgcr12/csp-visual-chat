from collections import deque
from pathlib import Path
import sys

from PIL import Image

try:
    import cv2
    import numpy as np
except Exception:
    cv2 = None
    np = None

try:
    from rembg import new_session, remove as rembg_remove
except Exception:
    new_session = None
    rembg_remove = None

REMBG_SESSION = None


def is_border_background(pixel):
    r, g, b, a = pixel
    if a == 0:
        return True
    bright = min(r, g, b) >= 232
    neutral = max(r, g, b) - min(r, g, b) <= 42
    return bright and neutral


def crop_alpha(image, pad=8):
    w, h = image.size
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return image
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(w, bbox[2] + pad)
    bottom = min(h, bbox[3] + pad)
    return image.crop((left, top, right, bottom))


def keep_main_alpha_region(image):
    if cv2 is None or np is None:
        return image

    rgba = np.array(image)
    alpha = rgba[:, :, 3]
    binary = (alpha > 24).astype("uint8")
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    if count <= 2:
        return image

    areas = stats[1:, cv2.CC_STAT_AREA]
    main_label = int(np.argmax(areas) + 1)
    keep = labels == main_label
    h, w = alpha.shape
    center_x = w / 2
    center_y = h / 2
    for label in range(1, count):
        if label == main_label:
            continue
        x = stats[label, cv2.CC_STAT_LEFT]
        y = stats[label, cv2.CC_STAT_TOP]
        bw = stats[label, cv2.CC_STAT_WIDTH]
        bh = stats[label, cv2.CC_STAT_HEIGHT]
        area = stats[label, cv2.CC_STAT_AREA]
        overlaps_center = x <= center_x <= x + bw or y <= center_y <= y + bh
        if area > w * h * 0.018 and overlaps_center:
            keep |= labels == label

    rgba[:, :, 3] = np.where(keep, alpha, 0).astype("uint8")
    return Image.fromarray(rgba, "RGBA")


def remove_border_background(image):
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

    return crop_alpha(keep_main_alpha_region(output))


def remove_grabcut_background(image):
    if cv2 is None or np is None:
        return None

    rgba = np.array(image)
    rgb = rgba[:, :, :3]
    alpha = rgba[:, :, 3]
    h, w = rgb.shape[:2]
    if w < 80 or h < 80:
        return None

    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    mask = np.zeros((h, w), np.uint8)
    margin_x = max(8, int(w * 0.045))
    margin_top = max(8, int(h * 0.018))
    margin_bottom = max(8, int(h * 0.025))
    rect = (margin_x, margin_top, w - margin_x * 2, h - margin_top - margin_bottom)
    if rect[2] <= 0 or rect[3] <= 0:
        return None

    bg_model = np.zeros((1, 65), np.float64)
    fg_model = np.zeros((1, 65), np.float64)
    try:
        cv2.grabCut(bgr, mask, rect, bg_model, fg_model, 6, cv2.GC_INIT_WITH_RECT)
    except Exception:
        return None

    foreground = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype("uint8")
    kernel = np.ones((5, 5), np.uint8)
    foreground = cv2.morphologyEx(foreground, cv2.MORPH_OPEN, kernel, iterations=1)
    foreground = cv2.morphologyEx(foreground, cv2.MORPH_CLOSE, kernel, iterations=2)
    foreground = cv2.GaussianBlur(foreground, (5, 5), 0)

    area = np.count_nonzero(foreground > 24) / float(w * h)
    if area < 0.05 or area > 0.88:
        return None

    output = rgba.copy()
    output[:, :, 3] = np.minimum(alpha, foreground)
    result = Image.fromarray(output, "RGBA")
    if not result.getchannel("A").getbbox():
        return None
    return crop_alpha(keep_main_alpha_region(result), pad=10)


def remove_model_background(image):
    global REMBG_SESSION
    if rembg_remove is None or new_session is None:
        return None
    try:
        if REMBG_SESSION is None:
            REMBG_SESSION = new_session("isnet-anime")
        output = rembg_remove(image, session=REMBG_SESSION)
    except Exception:
        try:
            if REMBG_SESSION is None:
                REMBG_SESSION = new_session("u2net")
            output = rembg_remove(image, session=REMBG_SESSION)
        except Exception:
            return None

    result = output.convert("RGBA")
    if not result.getchannel("A").getbbox():
        return None
    return crop_alpha(keep_main_alpha_region(result), pad=10)


def remove_background(src, dst):
    image = Image.open(src).convert("RGBA")
    output = remove_model_background(image)
    if output is None:
        output = remove_grabcut_background(image)
    if output is None:
        output = remove_border_background(image)

    output.save(dst)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: cutout_white_bg.py <input> <output>")
    remove_background(Path(sys.argv[1]), Path(sys.argv[2]))
