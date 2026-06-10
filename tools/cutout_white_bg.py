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

REMBG_SESSIONS = {}
new_session = None
rembg_remove = None
REMBG_IMPORT_ATTEMPTED = False
SUBJECT_ALPHA_THRESHOLD = 72


def ensure_rembg():
    global new_session, rembg_remove, REMBG_IMPORT_ATTEMPTED
    if REMBG_IMPORT_ATTEMPTED:
        return rembg_remove is not None and new_session is not None
    REMBG_IMPORT_ATTEMPTED = True
    try:
        from rembg import new_session as loaded_new_session, remove as loaded_remove
    except Exception:
        new_session = None
        rembg_remove = None
        return False
    new_session = loaded_new_session
    rembg_remove = loaded_remove
    return True


def is_border_background(pixel):
    r, g, b, a = pixel
    if a == 0:
        return True
    bright = min(r, g, b) >= 232
    neutral = max(r, g, b) - min(r, g, b) <= 42
    dark = max(r, g, b) <= 34
    return neutral and (bright or dark)


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


def source_has_complex_background(image):
    if cv2 is None or np is None:
        return False
    rgba = np.array(image.convert("RGBA"))
    rgb = rgba[:, :, :3].astype("float32")
    h, w = rgb.shape[:2]
    edge = max(4, int(min(w, h) * 0.035))
    edge_pixels = np.concatenate([
        rgb[:edge, :, :].reshape(-1, 3),
        rgb[h - edge:, :, :].reshape(-1, 3),
        rgb[:, :edge, :].reshape(-1, 3),
        rgb[:, w - edge:, :].reshape(-1, 3),
    ], axis=0)
    channel_std = float(edge_pixels.std(axis=0).mean())
    color_span = float((edge_pixels.max(axis=0) - edge_pixels.min(axis=0)).mean())
    neutral = np.abs(edge_pixels.max(axis=1) - edge_pixels.min(axis=1)) <= 36
    bright = edge_pixels.min(axis=1) >= 226
    dark = edge_pixels.max(axis=1) <= 36
    simple_ratio = float(np.count_nonzero(neutral & (bright | dark))) / float(len(edge_pixels))
    return simple_ratio < 0.58 and (channel_std > 24 or color_span > 96)


def polish_cutout_edges(image):
    if cv2 is None or np is None:
        return crop_alpha(image)

    rgba = np.array(image.convert("RGBA"))
    alpha = rgba[:, :, 3]
    if not np.any(alpha > 0):
        return image

    strong = (alpha > SUBJECT_ALPHA_THRESHOLD).astype("uint8")
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    strong = cv2.morphologyEx(strong, cv2.MORPH_CLOSE, kernel, iterations=1)
    strong = cv2.morphologyEx(strong, cv2.MORPH_OPEN, kernel, iterations=1)
    strong = fill_alpha_holes((strong * 255).astype("uint8"))
    soft = cv2.GaussianBlur(strong, (3, 3), 0)
    alpha = np.minimum(alpha, np.maximum(strong, soft)).astype("uint8")
    alpha[alpha < 8] = 0

    # Semi-transparent edge pixels often carry the old background color. Borrow nearby
    # opaque foreground color so the standee no longer has dark/bright halos on stage.
    edge_mask = ((alpha > 0) & (alpha < 245)).astype("uint8") * 255
    if np.count_nonzero(edge_mask):
        opaque = alpha >= 245
        if np.count_nonzero(opaque) > 0:
            rgb = rgba[:, :, :3].copy()
            inpaint_mask = edge_mask
            try:
                rgb = cv2.inpaint(rgb, inpaint_mask, 3, cv2.INPAINT_TELEA)
                blend = (edge_mask > 0)[:, :, None]
                rgba[:, :, :3] = np.where(blend, rgb, rgba[:, :, :3])
            except Exception:
                pass

    rgba[:, :, 3] = alpha
    return crop_alpha(Image.fromarray(rgba, "RGBA"), pad=10)


def resize_for_model(image, max_side=1150):
    w, h = image.size
    side = max(w, h)
    if side <= max_side:
        return image
    scale = max_side / float(side)
    return image.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)


def pre_crop_complex_scene(image):
    if cv2 is None or np is None:
        return image
    w, h = image.size
    if w < 1200 or w < h * 1.25:
        return image

    rgba = np.array(image.convert("RGBA"))
    rgb = rgba[:, :, :3]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    sat = hsv[:, :, 1].astype("float32")
    val = hsv[:, :, 2].astype("float32")
    # UI screenshots usually have a large illustrated character with higher
    # saturation/edge density than the atmospheric background.
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 60, 140).astype("float32")
    signal = sat * 0.65 + edges * 0.35 + np.maximum(0, val - 128) * 0.08
    signal[:int(h * 0.08), :] *= 0.25
    signal[int(h * 0.72):, :] *= 0.45
    signal[:, :int(w * 0.18)] *= 0.55

    cols = signal.sum(axis=0)
    window = max(40, int(w * 0.18))
    kernel = np.ones(window, dtype="float32") / float(window)
    smooth = np.convolve(cols, kernel, mode="same")
    center = int(np.argmax(smooth))
    crop_w = int(min(w * 0.56, max(h * 0.52, w * 0.34)))
    left = max(0, min(w - crop_w, center - crop_w // 2))
    right = min(w, left + crop_w)
    return image.crop((left, 0, right, h))


def fill_alpha_holes(alpha):
    if cv2 is None or np is None:
        return alpha
    binary = (alpha > 24).astype("uint8")
    h, w = binary.shape
    flood = binary.copy()
    mask = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(flood, mask, (0, 0), 1)
    holes = flood == 0
    output = alpha.copy()
    output[holes] = 255
    return output


def component_subject_score(stats, label, image_width, image_height):
    x = stats[label, cv2.CC_STAT_LEFT]
    y = stats[label, cv2.CC_STAT_TOP]
    bw = stats[label, cv2.CC_STAT_WIDTH]
    bh = stats[label, cv2.CC_STAT_HEIGHT]
    area = stats[label, cv2.CC_STAT_AREA]
    if bw <= 0 or bh <= 0:
        return -1

    canvas = float(image_width * image_height)
    area_ratio = area / canvas
    width_ratio = bw / float(image_width)
    height_ratio = bh / float(image_height)
    aspect = bh / float(max(1, bw))
    center_x = x + bw / 2
    center_bias = 1 - min(1, abs(center_x - image_width / 2) / max(1, image_width / 2))
    bottom = y + bh

    score = area_ratio * 620
    score += height_ratio * 260
    score += center_bias * 42

    # Anime standees are usually tall. Round heads, bust crops, and icons should lose.
    if aspect >= 1.35:
        score += min(90, (aspect - 1.35) * 42)
    else:
        score -= (1.35 - aspect) * 120
    if height_ratio < 0.24:
        score -= 160
    if area_ratio < 0.006:
        score -= 180
    if width_ratio > 0.68 and aspect < 1.2:
        score -= 150

    edge = max(3, int(min(image_width, image_height) * 0.018))
    touches_left = x <= edge
    touches_right = x + bw >= image_width - edge
    touches_top = y <= edge
    touches_bottom = bottom >= image_height - edge

    # A character can naturally stand on the bottom edge, but being cut by left/right/top
    # usually means the source was a collage or cropped preview.
    if touches_left or touches_right:
        score -= 280
        if width_ratio > 0.38 or height_ratio > 0.72:
            score -= 170
    if touches_top:
        score -= 130
    if touches_bottom and not (aspect >= 1.45 and height_ratio >= 0.45):
        score -= 65

    # Prefer complete full-body sprites: they are tall and reach into the lower half.
    if aspect >= 1.55 and height_ratio >= 0.34 and bottom >= image_height * 0.58:
        score += 120
    if aspect >= 2.0 and height_ratio >= 0.42:
        score += 70

    return score


def selected_subject_labels(alpha):
    if cv2 is None or np is None:
        return None

    binary = (alpha > SUBJECT_ALPHA_THRESHOLD).astype("uint8")
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    if count <= 2:
        return labels, {1} if count == 2 else set()

    h, w = alpha.shape
    group_kernel_size = max(5, int(min(w, h) * 0.024))
    if group_kernel_size % 2 == 0:
        group_kernel_size += 1
    group_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (group_kernel_size, group_kernel_size))
    grouped_binary = cv2.dilate(binary, group_kernel, iterations=1)
    grouped_binary = cv2.morphologyEx(grouped_binary, cv2.MORPH_CLOSE, group_kernel, iterations=1)
    group_count, group_labels, group_stats, _ = cv2.connectedComponentsWithStats(grouped_binary, connectivity=8)

    scored = []
    for label in range(1, group_count):
        score = component_subject_score(group_stats, label, w, h)
        area = group_stats[label, cv2.CC_STAT_AREA]
        if score > -120 and area > w * h * 0.0025:
            scored.append((score, label))

    if not scored:
        areas = stats[1:, cv2.CC_STAT_AREA]
        return labels, {int(np.argmax(areas) + 1)}

    scored.sort(reverse=True)
    _, main_group = scored[0]
    keep = set()
    for label in range(1, count):
        if np.any((labels == label) & (group_labels == main_group)):
            keep.add(label)

    if not keep:
        areas = stats[1:, cv2.CC_STAT_AREA]
        return labels, {int(np.argmax(areas) + 1)}

    group_mask = group_labels == main_group
    ys, xs = np.where(group_mask)
    main_x = int(xs.min())
    main_y = int(ys.min())
    main_w = int(xs.max() - xs.min() + 1)
    main_h = int(ys.max() - ys.min() + 1)
    main_area = int(np.count_nonzero(group_mask))

    # Keep nearby detached accessories, hair tips, weapons, or shadows when they clearly
    # belong to the chosen standee. Do not keep separate heads or another full character.
    for label in range(1, count):
        if label in keep:
            continue
        x = stats[label, cv2.CC_STAT_LEFT]
        y = stats[label, cv2.CC_STAT_TOP]
        bw = stats[label, cv2.CC_STAT_WIDTH]
        bh = stats[label, cv2.CC_STAT_HEIGHT]
        area = stats[label, cv2.CC_STAT_AREA]
        gap_x = max(0, max(main_x - (x + bw), x - (main_x + main_w)))
        gap_y = max(0, max(main_y - (y + bh), y - (main_y + main_h)))
        close = gap_x <= max(10, w * 0.035) and gap_y <= max(10, h * 0.035)
        accessory = area <= main_area * 0.28 and (bh <= main_h * 0.72 or bw <= main_w * 0.72)
        separate_standee = (
            bh / float(max(1, bw)) >= 1.4
            and bh >= main_h * 0.16
            and area >= main_area * 0.024
            and x >= main_x + main_w * 0.52
        )
        if separate_standee:
            continue
        if close and accessory:
            keep.add(label)

    return labels, keep


def remove_layout_artifacts(image):
    if cv2 is None or np is None:
        return image

    rgba = np.array(image)
    alpha = rgba[:, :, 3]
    h, w = alpha.shape
    binary = (alpha > SUBJECT_ALPHA_THRESHOLD).astype("uint8")
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(18, int(w * 0.16)), 3))
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, max(18, int(h * 0.16))))
    line_mask = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=1).astype(bool)
    line_mask |= cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=1).astype(bool)
    if line_mask.any():
        alpha = np.where(line_mask, 0, alpha).astype("uint8")
        rgba[:, :, 3] = alpha
        binary = (alpha > SUBJECT_ALPHA_THRESHOLD).astype("uint8")

    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    if count <= 1:
        return image

    remove = np.zeros_like(alpha, dtype=bool)
    for label in range(1, count):
        x = stats[label, cv2.CC_STAT_LEFT]
        y = stats[label, cv2.CC_STAT_TOP]
        bw = stats[label, cv2.CC_STAT_WIDTH]
        bh = stats[label, cv2.CC_STAT_HEIGHT]
        area = stats[label, cv2.CC_STAT_AREA]
        if bw <= 0 or bh <= 0:
            continue
        fill_ratio = area / float(bw * bh)
        long_horizontal = bw >= w * 0.28 and bh <= max(5, h * 0.025)
        long_vertical = bh >= h * 0.28 and bw <= max(5, w * 0.025)
        block = rgba[y:y + bh, x:x + bw, :3]
        component_mask = labels[y:y + bh, x:x + bw] == label
        if component_mask.any():
            brightness = block[component_mask].max(axis=1).mean()
        else:
            brightness = 255
        dark_panel = brightness <= 46 and fill_ratio >= 0.28 and bw >= w * 0.10 and bh >= h * 0.025
        if long_horizontal or long_vertical or dark_panel:
            remove |= labels == label

    if not remove.any():
        return image

    rgba[:, :, 3] = np.where(remove, 0, alpha).astype("uint8")
    return Image.fromarray(rgba, "RGBA")


def crop_left_standee_from_sheet(image):
    if cv2 is None or np is None:
        return image

    w, h = image.size
    if w < h * 1.04:
        return image

    alpha = np.array(image.getchannel("A"))
    mask = alpha > SUBJECT_ALPHA_THRESHOLD
    bbox = Image.fromarray(alpha, "L").getbbox()
    if not bbox:
        return image
    bbox_width = bbox[2] - bbox[0]
    bbox_height = bbox[3] - bbox[1]
    if bbox_width < w * 0.62 or bbox_height < h * 0.72:
        return image

    cols = mask.sum(axis=0).astype("float32")
    window = max(9, int(w * 0.025))
    kernel = np.ones(window, dtype="float32") / float(window)
    smooth = np.convolve(cols, kernel, mode="same")
    left_peak = float(smooth[:max(1, int(w * 0.34))].max())
    if left_peak < h * 0.18:
        return image

    search_start = int(w * 0.26)
    search_end = int(w * 0.52)
    if search_end <= search_start:
        return image
    valley_index = int(np.argmin(smooth[search_start:search_end]) + search_start)
    valley_value = float(smooth[valley_index])
    if valley_value > left_peak * 0.42:
        return image

    cut = min(w, max(int(w * 0.30), valley_index - max(8, int(w * 0.06))))
    left_mask = mask[:, :cut]
    right_mask = mask[:, cut:]
    if left_mask.sum() < right_mask.sum() * 0.55:
        return image

    return image.crop((0, 0, cut, h))


def keep_main_alpha_region(image):
    if cv2 is None or np is None:
        return image

    rgba = np.array(image)
    alpha = rgba[:, :, 3]
    selected = selected_subject_labels(alpha)
    if not selected:
        return image

    labels, keep_labels = selected
    if not keep_labels:
        return image
    keep = np.isin(labels, list(keep_labels))
    kernel = np.ones((3, 3), np.uint8)
    keep = cv2.dilate(keep.astype("uint8"), kernel, iterations=1).astype(bool)

    rgba[:, :, 3] = np.where(keep, alpha, 0).astype("uint8")
    return prune_satellite_components(Image.fromarray(rgba, "RGBA"))


def prune_satellite_components(image):
    if cv2 is None or np is None:
        return image

    rgba = np.array(image)
    alpha = rgba[:, :, 3]
    binary = (alpha > SUBJECT_ALPHA_THRESHOLD).astype("uint8")
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    if count <= 2:
        return image

    areas = stats[1:, cv2.CC_STAT_AREA]
    main_label = int(np.argmax(areas) + 1)
    main_x = stats[main_label, cv2.CC_STAT_LEFT]
    main_y = stats[main_label, cv2.CC_STAT_TOP]
    main_w = stats[main_label, cv2.CC_STAT_WIDTH]
    main_h = stats[main_label, cv2.CC_STAT_HEIGHT]
    main_area = stats[main_label, cv2.CC_STAT_AREA]
    keep = labels == main_label
    h, w = alpha.shape

    for label in range(1, count):
        if label == main_label:
            continue
        x = stats[label, cv2.CC_STAT_LEFT]
        y = stats[label, cv2.CC_STAT_TOP]
        bw = stats[label, cv2.CC_STAT_WIDTH]
        bh = stats[label, cv2.CC_STAT_HEIGHT]
        area = stats[label, cv2.CC_STAT_AREA]
        gap_x = max(0, max(main_x - (x + bw), x - (main_x + main_w)))
        gap_y = max(0, max(main_y - (y + bh), y - (main_y + main_h)))
        close = gap_x <= max(8, w * 0.024) and gap_y <= max(8, h * 0.024)
        tiny = area <= main_area * 0.018 or (bw <= main_w * 0.18 and bh <= main_h * 0.18)
        if close and tiny:
            keep |= labels == label

    rgba[:, :, 3] = np.where(keep, alpha, 0).astype("uint8")
    return Image.fromarray(rgba, "RGBA")


def remove_border_background(image):
    if cv2 is not None and np is not None:
        rgba = np.array(image)
        rgb = rgba[:, :, :3]
        alpha = rgba[:, :, 3]
        min_channel = rgb.min(axis=2)
        max_channel = rgb.max(axis=2)
        neutral = max_channel - min_channel <= 42
        bright = min_channel >= 232
        dark = max_channel <= 34
        edge_pixels = np.concatenate([
            rgb[0, :, :],
            rgb[-1, :, :],
            rgb[:, 0, :],
            rgb[:, -1, :],
        ], axis=0)
        edge_color = np.median(edge_pixels, axis=0)
        edge_brightness = float(edge_color.max())
        edge_distance = np.linalg.norm(rgb.astype("float32") - edge_color.astype("float32"), axis=2)
        edge_threshold = 52 if edge_brightness >= 210 else 38 if edge_brightness <= 64 else 32
        border_like = edge_distance <= edge_threshold
        background_candidate = (alpha == 0) | (neutral & (bright | dark)) | border_like
        count, labels, stats, _ = cv2.connectedComponentsWithStats(background_candidate.astype("uint8"), connectivity=8)
        if count > 1:
            border_labels = np.unique(np.concatenate([
                labels[0, :],
                labels[-1, :],
                labels[:, 0],
                labels[:, -1],
            ]))
            border_labels = border_labels[border_labels > 0]
            remove_labels = set(int(label) for label in border_labels)
            canvas = float(alpha.size)
            for label in range(1, count):
                if label in remove_labels:
                    continue
                x = stats[label, cv2.CC_STAT_LEFT]
                y = stats[label, cv2.CC_STAT_TOP]
                bw = stats[label, cv2.CC_STAT_WIDTH]
                bh = stats[label, cv2.CC_STAT_HEIGHT]
                area = stats[label, cv2.CC_STAT_AREA]
                if bw <= 0 or bh <= 0:
                    continue
                area_ratio = area / canvas
                fill_ratio = area / float(bw * bh)
                long_panel = bw >= image.width * 0.18 or bh >= image.height * 0.18
                if area_ratio >= 0.0045 and fill_ratio >= 0.32 and long_panel:
                    remove_labels.add(label)

            if remove_labels:
                output = rgba.copy()
                output[:, :, 3] = np.where(np.isin(labels, list(remove_labels)), 0, alpha).astype("uint8")
                cleaned = remove_layout_artifacts(Image.fromarray(output, "RGBA"))
                cleaned = crop_left_standee_from_sheet(cleaned)
                return crop_alpha(keep_main_alpha_region(cleaned))

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
    return polish_cutout_edges(keep_main_alpha_region(result))


def remove_model_background(image, model_names=("isnet-anime", "u2net"), use_alpha_matting=False):
    if not ensure_rembg():
        return None

    model_image = resize_for_model(image)
    for model_name in model_names:
        try:
            if model_name not in REMBG_SESSIONS:
                REMBG_SESSIONS[model_name] = new_session(model_name)
            try:
                output = rembg_remove(
                    model_image,
                    session=REMBG_SESSIONS[model_name],
                    alpha_matting=use_alpha_matting,
                    alpha_matting_foreground_threshold=235,
                    alpha_matting_background_threshold=18,
                    alpha_matting_erode_size=8,
                )
            except TypeError:
                output = rembg_remove(model_image, session=REMBG_SESSIONS[model_name])
        except Exception:
            continue

        result = output.convert("RGBA")
        if not result.getchannel("A").getbbox():
            continue
        result = polish_cutout_edges(keep_main_alpha_region(result))
        if looks_like_useful_cutout(result):
            return result

    return None


def alpha_area_ratio(image):
    if cv2 is None or np is None:
        bbox = image.getchannel("A").getbbox()
        if not bbox:
            return 0
        return 1
    alpha = np.array(image.getchannel("A"))
    return float(np.count_nonzero(alpha > 24)) / float(alpha.size)


def looks_like_useful_cutout(image):
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return False
    ratio = alpha_area_ratio(image)
    return 0.018 <= ratio <= 0.82


def has_background_leak(image):
    """Detect failed border cleanup that left a full illustration background behind."""
    if cv2 is None or np is None:
        bbox = image.getchannel("A").getbbox()
        if not bbox:
            return True
        w, h = image.size
        covers_width = (bbox[2] - bbox[0]) >= w * 0.92
        covers_height = (bbox[3] - bbox[1]) >= h * 0.92
        return covers_width and covers_height

    alpha = np.array(image.getchannel("A"))
    h, w = alpha.shape
    if w <= 0 or h <= 0:
        return True

    visible = alpha > SUBJECT_ALPHA_THRESHOLD
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return True

    edge = max(3, int(min(w, h) * 0.018))
    top_ratio = float(np.count_nonzero(visible[:edge, :])) / float(edge * w)
    left_ratio = float(np.count_nonzero(visible[:, :edge])) / float(edge * h)
    right_ratio = float(np.count_nonzero(visible[:, w - edge:])) / float(edge * h)
    corner = max(edge, int(min(w, h) * 0.035))
    corner_pixels = np.concatenate([
        visible[:corner, :corner].ravel(),
        visible[:corner, w - corner:].ravel(),
        visible[h - corner:, :corner].ravel(),
        visible[h - corner:, w - corner:].ravel(),
    ])
    corner_ratio = float(np.count_nonzero(corner_pixels)) / float(corner_pixels.size)

    bbox_width = bbox[2] - bbox[0]
    bbox_height = bbox[3] - bbox[1]
    bbox_too_canvas_like = bbox_width >= w * 0.91 and bbox_height >= h * 0.88
    alpha_ratio = float(np.count_nonzero(visible)) / float(w * h)

    # Full-body characters may touch the bottom edge, but top/side/corner opacity
    # usually means the illustration background survived the cleanup.
    if top_ratio > 0.045:
        return True
    if left_ratio > 0.13 or right_ratio > 0.13:
        return True
    if corner_ratio > 0.045:
        return True
    if bbox_too_canvas_like and alpha_ratio > 0.34 and (top_ratio > 0.018 or left_ratio > 0.07 or right_ratio > 0.07 or corner_ratio > 0.018):
        return True

    return False


def cutout_quality_score(image):
    if image is None or not looks_like_useful_cutout(image):
        return -10000
    score = 0
    if has_background_leak(image):
        score -= 420

    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return -10000

    w, h = image.size
    bw = bbox[2] - bbox[0]
    bh = bbox[3] - bbox[1]
    ratio = alpha_area_ratio(image)
    aspect = bh / float(max(1, bw))

    score += min(240, bh / float(max(1, h)) * 210)
    if 1.15 <= aspect <= 4.2:
        score += 90
    if 0.035 <= ratio <= 0.58:
        score += 120
    if ratio > 0.70:
        score -= 220
    if bw >= w * 0.94 and bh >= h * 0.90:
        score -= 260

    if cv2 is not None and np is not None:
        alpha = np.array(image.getchannel("A"))
        edge = max(3, int(min(w, h) * 0.018))
        edge_visible = (
            np.count_nonzero(alpha[:edge, :] > SUBJECT_ALPHA_THRESHOLD)
            + np.count_nonzero(alpha[:, :edge] > SUBJECT_ALPHA_THRESHOLD)
            + np.count_nonzero(alpha[:, w - edge:] > SUBJECT_ALPHA_THRESHOLD)
        )
        score -= min(180, edge_visible / float(max(1, edge * (w + h * 2))) * 260)
        soft_ratio = float(np.count_nonzero((alpha > 0) & (alpha < 42))) / float(alpha.size)
        if soft_ratio > 0.08:
            score -= 80

    return score


def choose_best_cutout(candidates):
    valid = [(cutout_quality_score(image), label, image) for label, image in candidates if image is not None]
    valid = [item for item in valid if item[0] > -10000]
    if not valid:
        return None
    valid.sort(key=lambda item: item[0], reverse=True)
    return polish_cutout_edges(valid[0][2])


def model_cutout_from_sheet_crop(original, border_output):
    if original.width < original.height * 1.04:
        return None
    if not looks_like_useful_cutout(border_output):
        return None

    border_bbox = border_output.getchannel("A").getbbox()
    if not border_bbox:
        return None
    if border_output.height < original.height * 0.62:
        return None

    # Setting sheets often have a full-body standee on the left and expression
    # references on the right. Use the geometry found by border cleanup only as
    # a crop hint, then run the anime model on the untouched source crop so dark
    # hair/clothing pixels are not pre-erased as background.
    crop_width = int(max(
        border_output.width + original.width * 0.055,
        original.width * 0.34,
    ))
    crop_width = min(original.width, crop_width)
    if crop_width >= original.width * 0.74:
        return None

    crop = original.crop((0, 0, crop_width, original.height))
    model_output = remove_model_background(crop)
    if not model_output or not looks_like_useful_cutout(model_output):
        return None

    return polish_cutout_edges(keep_main_alpha_region(model_output))


def remove_background(src, dst):
    image = Image.open(src).convert("RGBA")
    original_pixels = image.width * image.height
    if original_pixels > 1_200_000 and image.width > image.height * 1.25:
        alpha = image.getchannel("A")
        if alpha.getextrema()[0] >= 250:
            raise SystemExit("large opaque landscape image is not a safe standee source")
    complex_background = source_has_complex_background(image)
    if complex_background and original_pixels > 1_200_000 and image.width > image.height * 1.25:
        raise SystemExit("complex full-scene screenshot is not a safe standee source")
    if complex_background:
        image = pre_crop_complex_scene(image)
    border_output = remove_border_background(image)
    sheet_model_output = model_cutout_from_sheet_crop(image, border_output)
    model_order = ("isnet-anime",) if complex_background else ("isnet-anime", "u2net")
    skip_model = complex_background and original_pixels > 900_000
    model_output = None if skip_model else remove_model_background(image, model_names=model_order)
    grabcut_output = remove_grabcut_background(image)
    border_is_useful = looks_like_useful_cutout(border_output) and not has_background_leak(border_output)
    candidates = [
        ("sheet-model", sheet_model_output),
        ("model", model_output),
        ("grabcut", grabcut_output),
        ("border", border_output if border_is_useful or not complex_background else None),
    ]
    output = choose_best_cutout(candidates)
    if output is None:
        output = polish_cutout_edges(border_output)

    output.save(dst)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: cutout_white_bg.py <input> <output>")
    remove_background(Path(sys.argv[1]), Path(sys.argv[2]))
