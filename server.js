import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const DATA_DIR = path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "assets", "uploads");
const CHARACTER_FILE = path.join(DATA_DIR, "characters.json");
const SESSION_FILE = path.join(DATA_DIR, "sessions.json");
const ACGN_VOICE_INDEX_FILE = path.join(__dirname, "outputs", "acgn-tts", "acgn-voices-index.json");
const ACGN_DEFAULT_BASE = "https://u95167-8ncb-3637bf8b.bjb1.seetacloud.com:8443";
const ACGN_FALLBACK_BASE = "https://api.ttson.cn";
const ACGN_OFFICIAL_BASE = "https://api.ttson.cn";
const ACGN_OFFICIAL_FALLBACKS = [
  "https://api.ttson.cn",
  "https://u95167-8ncb-3637bf8b.bjb1.seetacloud.com:8443",
  "https://ht.ttson.cn:37284"
];
const CUTOUT_SCRIPT = path.join(__dirname, "tools", "cutout_white_bg.py");
const CSP_DIR = process.env.CSP_SKILL_DIR || "C:\\Users\\ZhuanZ\\.codex\\skills\\character-skill-producer";
const CSP_SEARCH = path.join(CSP_DIR, "scripts", "source_search.py");
const SKILL_ROOT = process.env.CODEX_SKILL_ROOT || "C:\\Users\\ZhuanZ\\.codex\\skills";
const CHARACTER_SKILLS = {
  "takamatsu-tomori": path.join(SKILL_ROOT, "takamatsu-tomori", "SKILL.md"),
  "chihaya-anon": path.join(SKILL_ROOT, "chihaya-anon", "SKILL.md"),
  "togawa-sakiko": path.join(SKILL_ROOT, "togawa-sakiko", "SKILL.md"),
  "nagasaki-soyo": path.join(SKILL_ROOT, "nagasaki-soyo", "SKILL.md"),
  "kaname-rana": path.join(SKILL_ROOT, "kaname-rana", "SKILL.md"),
  "taki-shiina": path.join(SKILL_ROOT, "taki-shiina", "SKILL.md"),
  "mutsumi-wakaba": path.join(SKILL_ROOT, "mutsumi-wakaba", "SKILL.md"),
  "misumi-uika": path.join(SKILL_ROOT, "misumi-uika", "SKILL.md"),
  "yahata-umiri": path.join(SKILL_ROOT, "yahata-umiri", "SKILL.md"),
  "yutenji-nyamu": path.join(SKILL_ROOT, "yutenji-nyamu", "SKILL.md"),
  "yuki-asuna": path.join(SKILL_ROOT, "yuki-asuna", "SKILL.md")
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg"
};

const defaultCharacters = [
  {
    id: "takamatsu-tomori",
    name: "高松灯",
    work: "BanG Dream! It's MyGO!!!!!",
    subtitle: "MyGO!!!!! 主唱兼作词",
    imageUrl: makeFallbackPortrait("高松灯"),
    accent: "#7aa8ff",
    tags: ["内向", "诗性", "认真"],
    sourceUrl: "https://zh.moegirl.org.cn/高松灯",
    prompt: "你扮演高松灯。回应应克制、认真、带一点停顿感，优先表达真实感受和细微观察，不主动变成外向角色。",
    createdAt: new Date().toISOString()
  },
  {
    id: "chihaya-anon",
    name: "千早爱音",
    work: "BanG Dream! It's MyGO!!!!!",
    subtitle: "MyGO!!!!! 节奏吉他手",
    imageUrl: makeFallbackPortrait("千早爱音"),
    accent: "#ff83ad",
    tags: ["社交", "可爱", "行动派"],
    sourceUrl: "https://zh.moegirl.org.cn/千早爱音",
    prompt: "你扮演千早爱音。回应应轻快、有社交感，但底层带着失败后的羞耻与重新开始的努力感。",
    createdAt: new Date().toISOString()
  },
  {
    id: "togawa-sakiko",
    name: "丰川祥子",
    work: "BanG Dream! Ave Mujica",
    subtitle: "Ave Mujica 制作人兼键盘手",
    imageUrl: makeFallbackPortrait("丰川祥子"),
    accent: "#b8a5ff",
    tags: ["克制", "礼仪", "控制"],
    sourceUrl: "https://zh.moegirl.org.cn/丰川祥子",
    prompt: "你扮演丰川祥子。回应应礼貌、克制、有距离感，避免轻易袒露脆弱，用体面维持局面。",
    createdAt: new Date().toISOString()
  }
];

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(UPLOAD_DIR, { recursive: true });
  if (!existsSync(CHARACTER_FILE)) {
    await writeJson(CHARACTER_FILE, defaultCharacters);
  }
  if (!existsSync(SESSION_FILE)) {
    await writeJson(SESSION_FILE, {});
  }
}

function slugify(input) {
  return String(input || "character")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    || `character-${Date.now()}`;
}

function assetSlug(input) {
  return String(input || "asset")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || `asset-${Date.now()}`;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, data) {
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

async function saveDataUrlAsset(dataUrl, prefix) {
  const text = String(dataUrl || "");
  if (!text) return "";
  const match = text.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif|svg\+xml));base64,(.+)$/);
  if (!match) throw new Error("上传图片格式不支持");
  const mime = match[1];
  const ext = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg"
  }[mime];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 8 * 1024 * 1024) throw new Error("上传图片不能超过 8MB");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${assetSlug(prefix)}-${Date.now()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/assets/uploads/${filename}`;
}

async function saveRemoteImageAsset(url, prefix) {
  const text = String(url || "");
  if (!text || text.startsWith("/") || text.startsWith("data:")) return text;
  const response = await fetch(text, {
    headers: { "user-agent": "CSP-Visual-Chat/0.1" },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) return text;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) return text;
  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : contentType.includes("gif")
        ? "gif"
        : "jpg";
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 10 * 1024 * 1024) return text;
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${assetSlug(prefix)}-${Date.now()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/assets/uploads/${filename}`;
}

function uploadUrlToFile(url) {
  const match = String(url || "").match(/^\/assets\/uploads\/([^/]+)$/);
  if (!match) return null;
  return path.join(UPLOAD_DIR, decodeURIComponent(match[1]));
}

function runCutout(inputFile, outputFile) {
  return new Promise((resolve) => {
    if (!existsSync(CUTOUT_SCRIPT) || !existsSync(inputFile)) {
      resolve(false);
      return;
    }
    const child = spawn(process.env.PYTHON || "python", [CUTOUT_SCRIPT, inputFile, outputFile], {
      windowsHide: true
    });
    child.on("close", (code) => resolve(code === 0 && existsSync(outputFile)));
    child.on("error", () => resolve(false));
  });
}

async function cutoutUploadedImage(url, prefix) {
  const inputFile = uploadUrlToFile(url);
  if (!inputFile || !/\.(png|jpe?g|webp)$/i.test(inputFile)) return url;
  const outputName = `${assetSlug(prefix)}-${Date.now()}-cutout.png`;
  const outputFile = path.join(UPLOAD_DIR, outputName);
  const ok = await runCutout(inputFile, outputFile);
  return ok ? `/assets/uploads/${outputName}` : url;
}

async function saveStandeeImageAsset(source, prefix) {
  const text = String(source || "");
  if (!text) return "";
  const saved = text.startsWith("data:")
    ? await saveDataUrlAsset(text, prefix)
    : await saveRemoteImageAsset(text, prefix);
  return cutoutUploadedImage(saved, prefix);
}

async function readCharacterSkill(character) {
  const skillFile = CHARACTER_SKILLS[character?.id];
  if (!skillFile || !existsSync(skillFile)) return "";
  const content = await readFile(skillFile, "utf8");
  return content.slice(0, 24000);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function json(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function runCspSearch(name, work) {
  return new Promise((resolve) => {
    if (!existsSync(CSP_SEARCH)) {
      resolve({ ok: false, warning: "CSP source_search.py not found", records: [] });
      return;
    }

    const args = [CSP_SEARCH, name, "--work", work || "", "--sources", "moegirl", "--timeout", "12"];
    const child = spawn(process.env.PYTHON || "python", args, {
      cwd: path.dirname(CSP_SEARCH),
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), 18000);
    child.stdout.on("data", (data) => { stdout += data.toString("utf8"); });
    child.stderr.on("data", (data) => { stderr += data.toString("utf8"); });
    child.on("close", () => {
      clearTimeout(timer);
      try {
        const parsed = stdout.trim() ? JSON.parse(stdout) : {};
        resolve({ ...parsed, stderr });
      } catch (error) {
        resolve({ ok: false, warning: error.message, stderr, records: [] });
      }
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, warning: error.message, records: [] });
    });
  });
}

async function queryMoegirl(params) {
  const response = await fetch(`https://zh.moegirl.org.cn/api.php?${params}`, {
    headers: { "user-agent": "CSP-Visual-Chat/0.1" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Moegirl image API failed: ${response.status}`);
  return response.json();
}

function firstMoegirlPage(data) {
  return Object.values(data.query?.pages || {}).filter((page) => page.pageid)[0];
}

async function fetchMoegirlPage(name) {
  const exactParams = new URLSearchParams({
    action: "query",
    titles: name,
    prop: "pageimages|info",
    inprop: "url",
    pithumbsize: "900",
    redirects: "1",
    format: "json",
    origin: "*"
  });

  const exactPage = firstMoegirlPage(await queryMoegirl(exactParams));
  if (exactPage?.thumbnail?.source || exactPage?.fullurl) return exactPage;

  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: name,
    gsrlimit: "1",
    prop: "pageimages|info",
    inprop: "url",
    pithumbsize: "900",
    redirects: "1",
    format: "json",
    origin: "*"
  });

  return firstMoegirlPage(await queryMoegirl(params)) || {};
}

function scoreImageCandidate(candidate, kind) {
  const info = candidate.imageinfo?.[0] || {};
  const width = Number(info.width || 0);
  const height = Number(info.height || 0);
  const ratio = width ? height / width : 0;
  const text = `${candidate.title || ""} ${info.url || ""}`.toLowerCase();
  const fullBodyTerms = /(立绘|立ち絵|全身|人设|設定|公式|角色|stand|standing|standee|full|body|render|sprite|character|chara)/i;
  const chibiTerms = /(q版|q版|sd|chibi|ぷち|mini|deform|deformed|小人|二头身|三头身)/i;
  const avatarTerms = /(头像|icon|face|profile|head|portrait|表情)/i;
  const badTerms = /(logo|banner|bg|background|wallpaper|icon|头像|表情|stamp|封面|海报|截图|screenshot|watermark|cd|bd|dvd)/i;
  let score = 0;

  if (kind === "avatar") {
    if (avatarTerms.test(text)) score += 65;
    if (ratio > 0.7 && ratio < 1.35) score += 38;
    if (ratio >= 1.35 && ratio < 2.1) score += 12;
  } else if (kind === "chibi") {
    if (chibiTerms.test(text)) score += 90;
    if (fullBodyTerms.test(text)) score += 20;
    if (ratio > 0.8 && ratio < 1.8) score += 25;
  } else {
    if (fullBodyTerms.test(text)) score += 80;
    if (ratio >= 1.2) score += 45;
    if (ratio >= 1.55) score += 20;
    if (chibiTerms.test(text)) score -= 50;
  }

  if (height >= 600) score += 12;
  if (/\.png(?:$|\?)/i.test(info.url || "")) score += 8;
  if (kind !== "avatar" && badTerms.test(text)) score -= 120;
  return score;
}

function decodeHtml(text) {
  return String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function imageUrlKey(url) {
  return String(url || "")
    .replace(/^https?:/, "")
    .replace(/([?&])v=\d+.*/, "")
    .replace(/!\/.*$/, "");
}

function normalizeMoegirlImageUrl(url) {
  const text = decodeHtml(url).trim();
  if (!text || text.startsWith("data:")) return "";
  if (text.startsWith("//")) return `https:${text}`;
  if (text.startsWith("/")) return `https://zh.moegirl.org.cn${text}`;
  return text;
}

function originalMoegirlImageUrl(url) {
  return normalizeMoegirlImageUrl(url).replace(/!\/.*$/, "");
}

function parseImageAttrs(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attrs[match[1].toLowerCase()] = decodeHtml(match[2] || match[3] || match[4] || "");
  }
  return attrs;
}

function bestSrcsetUrl(srcset) {
  const candidates = String(srcset || "")
    .split(",")
    .map((part) => {
      const [url, size] = part.trim().split(/\s+/);
      const width = Number(String(size || "").replace(/[^\d]/g, "")) || 0;
      return { url, width };
    })
    .filter((item) => item.url)
    .sort((a, b) => b.width - a.width);
  return candidates[0]?.url || "";
}

async function fetchMoegirlPageImages(title) {
  if (!title) return [];
  const listParams = new URLSearchParams({
    action: "query",
    titles: title,
    prop: "images",
    imlimit: "50",
    format: "json",
    origin: "*"
  });
  const listData = await queryMoegirl(listParams);
  const imageTitles = Object.values(listData.query?.pages || {})
    .flatMap((page) => page.images || [])
    .map((item) => item.title)
    .filter(Boolean)
    .slice(0, 50);
  if (!imageTitles.length) return [];

  const infoParams = new URLSearchParams({
    action: "query",
    titles: imageTitles.join("|"),
    prop: "imageinfo",
    iiprop: "url|mime|size",
    iiurlwidth: "900",
    format: "json",
    origin: "*"
  });
  const infoData = await queryMoegirl(infoParams);
  return Object.values(infoData.query?.pages || {}).filter((page) => page.imageinfo?.[0]?.url);
}

async function fetchMoegirlHtmlImages(page) {
  const url = page?.fullurl || (page?.title ? `https://zh.moegirl.org.cn/${encodeURIComponent(page.title)}` : "");
  if (!url) return [];
  const response = await fetch(url, {
    headers: { "user-agent": "CSP-Visual-Chat/0.1" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) return [];
  const html = await response.text();
  const found = [];
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = parseImageAttrs(match[0]);
    const src = bestSrcsetUrl(attrs.srcset || attrs["data-srcset"])
      || attrs["data-src"]
      || attrs["data-lazy-src"]
      || attrs.src;
    const imageUrl = normalizeMoegirlImageUrl(src);
    const originalUrl = originalMoegirlImageUrl(imageUrl);
    if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) continue;
    if (!/\.(png|jpe?g|webp|gif)(?:[!?/#]|$)/i.test(imageUrl)) continue;
    const width = Number(attrs["data-file-width"] || attrs.width || 0);
    const height = Number(attrs["data-file-height"] || attrs.height || 0);
    found.push({
      title: attrs.alt || attrs.title || page.title || "页面图片",
      imageinfo: [{
        url: originalUrl || imageUrl,
        thumburl: normalizeMoegirlImageUrl(attrs.src) || imageUrl,
        width,
        height
      }]
    });
  }
  return found;
}

function formatImageCandidate(item) {
  const info = item.imageinfo?.[0] || {};
  const width = Number(info.width || 0);
  const height = Number(info.height || 0);
  const avatarScore = scoreImageCandidate(item, "avatar");
  const standeeScore = scoreImageCandidate(item, "standee");
  const chibiScore = scoreImageCandidate(item, "chibi");
  const best = [
    ["avatar", avatarScore],
    ["standee", standeeScore],
    ["chibi", chibiScore]
  ].sort((a, b) => b[1] - a[1])[0]?.[0] || "standee";

  return {
    title: item.title || "候选图",
    url: info.url || "",
    thumbUrl: info.thumburl || info.url || "",
    width,
    height,
    best,
    scores: {
      avatar: avatarScore,
      standee: standeeScore,
      chibi: chibiScore
    }
  };
}

async function fetchMoegirlImageCandidates(name) {
  const page = await fetchMoegirlPage(name);
  const [pageImages, htmlImages] = await Promise.allSettled([
    fetchMoegirlPageImages(page?.title),
    fetchMoegirlHtmlImages(page)
  ]);
  const rawImages = [
    ...(pageImages.status === "fulfilled" ? pageImages.value : []),
    ...(htmlImages.status === "fulfilled" ? htmlImages.value : [])
  ];
  const seen = new Set();
  const candidates = rawImages
    .map(formatImageCandidate)
    .filter((item) => item.url)
    .filter((item) => {
      const key = imageUrlKey(item.url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const displayScore = (item) => {
        const scores = item.scores || {};
        const typeBias = item.best === "standee" ? 140 : item.best === "chibi" ? 120 : 40;
        return typeBias + Math.max(scores.standee || 0, scores.chibi || 0, scores.avatar || 0);
      };
      return displayScore(b) - displayScore(a);
    });

  const standees = candidates.filter((item) => item.best === "standee").slice(0, 10);
  const chibis = candidates.filter((item) => item.best === "chibi").slice(0, 4);
  const avatars = candidates.filter((item) => item.best === "avatar").slice(0, 4);
  const ordered = [...standees, ...chibis, ...avatars].slice(0, 18);

  if (page?.thumbnail?.source) {
    ordered.unshift({
      title: `${page.title || name} 头像`,
      url: page.thumbnail.source,
      thumbUrl: page.thumbnail.source,
      width: 0,
      height: 0,
      best: "avatar",
      scores: { avatar: 120, standee: 10, chibi: 0 }
    });
  }

  return {
    sourceUrl: page?.fullurl || (page?.title ? `https://zh.moegirl.org.cn/${encodeURIComponent(page.title)}` : ""),
    candidates: ordered
  };
}

async function fetchMoegirlImages(name) {
  const result = await fetchMoegirlImageCandidates(name);
  const pick = (kind) => result.candidates
    .map((item) => ({ item, score: item.scores?.[kind] ?? 0 }))
    .sort((a, b) => b.score - a.score)[0];
  const standee = pick("standee");
  const chibi = pick("chibi");
  const avatar = pick("avatar");
  const avatarUrl = avatar?.score > 0 ? avatar.item.url : "";
  const fullBodyUrl = standee?.score > 35 ? standee.item.url : "";
  const chibiUrl = chibi?.score > 65 ? chibi.item.url : "";

  return {
    avatarUrl,
    fullBodyUrl,
    chibiUrl,
    imageUrl: fullBodyUrl || avatarUrl,
    candidates: result.candidates,
    sourceUrl: result.sourceUrl
  };
}

let acgnVoiceIndexCache = null;

function acgnHeaders(deviceId) {
  const hour = new Date().toISOString().slice(0, 13);
  const headers = {
    "accept": "application/json, text/plain, */*",
    "content-type": "application/json",
    "origin": "https://acgn.ttson.cn",
    "referer": "https://acgn.ttson.cn/",
    "x-checkout-header": "_checkout",
    "x-client-header": crypto.createHash("md5").update(`alex${hour}`).digest("hex"),
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/148 Safari/537.36"
  };
  if (deviceId) headers["x-device-id"] = deviceId;
  return headers;
}

async function fetchAcgnJson(pathname, deviceId) {
  const headers = acgnHeaders(deviceId);
  for (const base of [ACGN_DEFAULT_BASE, ACGN_FALLBACK_BASE]) {
    try {
      const response = await fetch(`${base}${pathname}`, {
        headers,
        signal: AbortSignal.timeout(20000)
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 160)}`);
      return JSON.parse(text);
    } catch (error) {
      if (base === ACGN_FALLBACK_BASE) throw error;
    }
  }
  throw new Error("ACGN request failed");
}

async function loadAcgnVoiceIndex(deviceId) {
  if (acgnVoiceIndexCache) return acgnVoiceIndexCache;
  if (existsSync(ACGN_VOICE_INDEX_FILE)) {
    acgnVoiceIndexCache = await readJson(ACGN_VOICE_INDEX_FILE, []);
    return acgnVoiceIndexCache;
  }

  const tags = await fetchAcgnJson("/flashsummary/tags?language=zh-CN", deviceId);
  const byId = new Map();
  for (const tag of Array.isArray(tags) ? tags : []) {
    if (tag.tag_id == null) continue;
    const data = await fetchAcgnJson(`/flashsummary/voices?language=zh-CN&tag_id=${encodeURIComponent(tag.tag_id)}`, deviceId);
    for (const voice of Array.isArray(data.data) ? data.data : []) {
      if (voice?.id == null || byId.has(String(voice.id))) continue;
      byId.set(String(voice.id), {
        voice_id: voice.id,
        name: voice.voice_name || voice.name || voice.speaker || "",
        tags: Array.isArray(voice.tags) ? voice.tags.map((item) => item.tag_name).filter(Boolean) : [],
        language: voice.language || "",
        gender: voice.gender || "",
        max_length: voice.max_length ?? null
      });
    }
  }
  acgnVoiceIndexCache = [...byId.values()].sort((a, b) => Number(a.voice_id) - Number(b.voice_id));
  return acgnVoiceIndexCache;
}

function normalizeSearchText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

function scoreAcgnVoice(voice, query, work = "") {
  const name = normalizeSearchText(voice.name);
  const q = normalizeSearchText(query);
  const w = normalizeSearchText(work);
  if (!q) return 0;

  let score = 0;
  if (name.includes(q)) score += 140;
  if (q.includes(name)) score += 50;
  if (w && name.includes(w)) score += 45;
  for (const part of [query, work].join(" ").split(/[\s/|,，、:：-]+/).filter(Boolean)) {
    const token = normalizeSearchText(part);
    if (token.length >= 2 && name.includes(token)) score += 24;
  }
  if (/高桥李依|高橋李依|水瀬|水濑|日语|日本|jp|japanese/i.test(voice.name)) score += 10;
  if (/Kayli|Sean|English|英文/i.test(voice.name)) score -= 12;
  return score;
}

async function searchAcgnVoices(query, { work = "", limit = 12, deviceId = "" } = {}) {
  const voices = await loadAcgnVoiceIndex(deviceId);
  return voices
    .map((voice) => ({ ...voice, score: scoreAcgnVoice(voice, query, work) }))
    .filter((voice) => voice.score > 0)
    .sort((a, b) => b.score - a.score || Number(a.voice_id) - Number(b.voice_id))
    .slice(0, limit);
}

function normalizeAcgnLanguage(value, fallback = "JP") {
  const lang = String(value || "").trim();
  return /^(ZH|EN|JP|auto)$/i.test(lang) ? lang : fallback;
}

function extractAcgnToken(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    return url.searchParams.get("token") || text;
  } catch {
    const match = text.match(/[?&]token=([^&\s]+)/);
    return match ? decodeURIComponent(match[1]) : text;
  }
}

async function postAcgnOfficialTts({ token, baseUrl, voice, input, language }) {
  const bases = baseUrl
    ? [baseUrl.replace(/\/$/, "")]
    : ACGN_OFFICIAL_FALLBACKS;
  let lastError = null;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/flashsummary/tts?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          voice_id: Number(voice),
          text: input,
          to_lang: normalizeAcgnLanguage(language),
          format: "mp3",
          speed_factor: 1,
          pitch_factor: 0,
          volume_change_dB: 0,
          emotion: 1
        }),
        signal: AbortSignal.timeout(30000)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.code !== 200 || !data.voice_path || !data.url || !data.port) {
        throw new Error(data.detail || data.msg || `ACGN official TTS failed: ${response.status}`);
      }
      return data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("ACGN official TTS failed");
}

async function downloadAcgnAudio({ data, token, deviceId, official }) {
  const query = new URLSearchParams({
    voice_audio_path: data.voice_path,
    stream: "true"
  });
  if (token) query.set("token", token);
  const audioUrl = `${data.url}:${data.port}/flashsummary/retrieveFileData?${query.toString()}`;
  const audioResponse = await fetch(audioUrl, {
    headers: official ? {} : acgnHeaders(token ? "" : deviceId),
    signal: AbortSignal.timeout(60000)
  });
  if (!audioResponse.ok) throw new Error(`ACGN audio download failed: ${audioResponse.status}`);
  return {
    contentType: audioResponse.headers.get("content-type") || "audio/mpeg",
    buffer: Buffer.from(await audioResponse.arrayBuffer())
  };
}

async function getAcgnPackageRemaining(token, baseUrl = ACGN_OFFICIAL_BASE) {
  const normalizedToken = extractAcgnToken(token);
  if (!normalizedToken) throw new Error("查询 ACGN 剩余额度需要 token");
  const endpoint = `${baseUrl.replace(/\/$/, "")}/flashsummary/getPackageRemaining?token=${encodeURIComponent(normalizedToken)}`;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.code !== 200) {
    throw new Error(data.detail || data.msg || `ACGN quota failed: ${response.status}`);
  }
  return data.data || {};
}

function makePrompt({ name, work, userNotes, csp }) {
  const record = csp?.records?.find((item) => item.status === "ok") || csp?.records?.[0] || {};
  const sourceBits = [
    `角色：${name}`,
    work ? `作品：${work}` : "",
    record.title ? `资料页：${record.title}` : "",
    record.url ? `来源：${record.url}` : "",
    userNotes ? `用户补充：${userNotes}` : ""
  ].filter(Boolean).join("\n");

  return [
    "你是一个由 CSP 角色技能蒸馏器生成的角色聊天人格。",
    "原则：行为大于形容词，证据大于印象，语境大于台词。不要编造原作中没有明确依据的事件。",
    "聊天时保持角色的表达质感，但不要输出分析报告。遇到资料不足时自然承认边界。",
    sourceBits
  ].join("\n");
}

async function createCharacter(body) {
  const name = String(body.name || "").trim();
  if (!name) throw new Error("角色名不能为空");
  const work = String(body.work || "").trim();
  const userNotes = String(body.notes || "").trim();

  const [csp, image] = await Promise.allSettled([
    runCspSearch(name, work),
    fetchMoegirlImages(name)
  ]);

  const cspValue = csp.status === "fulfilled" ? csp.value : { ok: false, warning: csp.reason?.message };
  const imageValue = image.status === "fulfilled" ? image.value : {};
  const id = `${slugify(work)}-${slugify(name)}`.replace(/^-/, "");
  const uploadedImageUrl = await saveDataUrlAsset(body.uploadedImageData, `${id}-card`);
  const uploadedPetUrl = await saveDataUrlAsset(body.uploadedPetData, `${id}-pet`);
  const useFetchedImage = body.useFetchedImage !== false;
  const petStyle = ["standee", "chibi", "live2d"].includes(body.petStyle)
    ? body.petStyle
    : body.useChibiPet === true
      ? "chibi"
      : "standee";
  const makePet = body.makePet !== false && petStyle !== "live2d";
  const fetchedAvatarUrl = useFetchedImage ? imageValue.avatarUrl || "" : "";
  const fetchedFullBodyUrl = useFetchedImage ? imageValue.fullBodyUrl || "" : "";
  const fetchedChibiUrl = useFetchedImage ? imageValue.chibiUrl || "" : "";
  const live2dModelUrl = String(body.live2dModelUrl || "").trim();
  const avatarSourceUrl = body.avatarUrl || fetchedAvatarUrl || "";
  const avatarUrl = avatarSourceUrl
    ? await saveRemoteImageAsset(avatarSourceUrl, `${id}-avatar`)
    : makeFallbackPortrait(name, body.accent);
  const cardSourceUrl = body.imageUrl || uploadedImageUrl || fetchedFullBodyUrl || "";
  const cardImageUrl = cardSourceUrl
    ? await saveStandeeImageAsset(cardSourceUrl, `${id}-standee`)
    : makeFallbackPortrait(name, body.accent);
  const petSourceUrl = makePet
    ? (petStyle === "chibi"
      ? (body.petImageUrl || uploadedPetUrl || fetchedChibiUrl || cardSourceUrl || "")
      : (body.petImageUrl || uploadedPetUrl || cardSourceUrl || ""))
    : "";
  const petImageUrl = petSourceUrl ? await saveStandeeImageAsset(petSourceUrl, `${id}-pet`) : "";
  const suppliedVoiceId = String(body.voiceId || "").trim();
  const suppliedVoiceName = String(body.voiceName || "").trim();
  const voiceCandidates = suppliedVoiceId
    ? []
    : await searchAcgnVoices(name, { work, limit: 8 }).catch(() => []);
  const matchedVoice = voiceCandidates[0] || null;
  const existing = await readJson(CHARACTER_FILE, []);
  const character = {
    id,
    name,
    work,
    subtitle: body.subtitle || `${work || "自定义作品"} 角色`,
    avatarUrl,
    imageUrl: cardImageUrl,
    petImageUrl,
    petStyle: petStyle === "live2d" ? "live2d" : petStyle === "chibi" && petImageUrl ? "chibi" : "standee",
    live2dModelUrl: petStyle === "live2d" ? live2dModelUrl : "",
    accent: body.accent || pickAccent(name),
    tags: body.tags || ["CSP", "新建角色"],
    sourceUrl: imageValue.sourceUrl || cspValue.records?.find((item) => item.url)?.url || "",
    prompt: makePrompt({ name, work, userNotes, csp: cspValue }),
    csp: cspValue,
    voiceProvider: suppliedVoiceId || matchedVoice ? "acgn-ttson" : "",
    voiceId: suppliedVoiceId || (matchedVoice ? String(matchedVoice.voice_id) : ""),
    voiceName: suppliedVoiceName || matchedVoice?.name || "",
    voiceLanguage: body.voiceLanguage || "JP",
    voiceAutoTranslate: body.voiceAutoTranslate !== false,
    voiceCandidates,
    createdAt: new Date().toISOString()
  };

  const next = [character, ...existing.filter((item) => item.id !== id)];
  await writeJson(CHARACTER_FILE, next);
  return character;
}

function pickAccent(seed) {
  const palette = ["#7aa8ff", "#ff83ad", "#47d6b6", "#f2bf5e", "#c99cff", "#ff756b"];
  const score = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[score % palette.length];
}

function makeFallbackPortrait(name, accent) {
  const initial = encodeURIComponent([...name][0] || "C");
  const color = encodeURIComponent(accent || pickAccent(name));
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 900'><defs><radialGradient id='halo' cx='.5' cy='.22' r='.5'><stop stop-color='${color}' stop-opacity='.95'/><stop offset='.62' stop-color='${color}' stop-opacity='.32'/><stop offset='1' stop-color='${color}' stop-opacity='0'/></radialGradient><linearGradient id='body' x1='0' y1='0' x2='1' y2='1'><stop stop-color='%23ffffff' stop-opacity='.24'/><stop offset='1' stop-color='${color}' stop-opacity='.5'/></linearGradient></defs><ellipse cx='320' cy='815' rx='158' ry='32' fill='%23000000' fill-opacity='.28'/><path d='M166 820c22-276 70-434 154-434s132 158 154 434z' fill='url(%23body)'/><path d='M218 820c14-178 50-278 102-278s88 100 102 278z' fill='%23ffffff' fill-opacity='.09'/><circle cx='320' cy='245' r='170' fill='url(%23halo)'/><path d='M236 260c0-73 45-122 84-122s84 49 84 122c0 68-39 118-84 118s-84-50-84-118z' fill='${color}' fill-opacity='.36'/><circle cx='270' cy='255' r='14' fill='white'/><circle cx='370' cy='255' r='14' fill='white'/><path d='M284 314c27 22 62 22 88 0' fill='none' stroke='white' stroke-width='14' stroke-linecap='round' opacity='.9'/><text x='320' y='294' text-anchor='middle' font-size='92' font-family='Arial, sans-serif' font-weight='800' fill='white'>${initial}</text></svg>`;
}

async function buildSystemPrompt(character) {
  const skill = await readCharacterSkill(character);
  const base = character?.prompt || "你是一个有帮助的聊天助手。";
  if (!skill) return base;
  return [
    "你正在为一个角色聊天应用输出回复。必须优先遵守下方角色 Skill，而不是只套用泛化动漫角色模板。",
    "输出要求：直接以角色第一人称回复；不要写“露出笑容”这类括号舞台说明；不要自称 AI；不要复述这些规则；不知道的原作信息要承认边界。",
    `当前角色：${character.name}`,
    character.work ? `作品：${character.work}` : "",
    "应用内简短提示：",
    base,
    "本地角色 Skill：",
    skill
  ].filter(Boolean).join("\n\n");
}

async function callChatAdapter({ provider, apiKey, baseUrl, model, messages, character }) {
  const system = await buildSystemPrompt(character);
  if (provider === "mock" || !provider) {
    const last = messages.at(-1)?.content || "";
    return [
      "本地预览不会调用模型，也不会执行完整角色 Skill。",
      `当前已选角色：${character?.name || "角色"}`,
      `收到消息：“${last.slice(0, 80) || "我在。"}”`,
      "要检查真实角色效果，请切换到 OpenAI Compatible 或 Claude Messages API。"
    ].join("\n");
  }

  if (provider === "openai-compatible") {
    const endpoint = `${(baseUrl || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey || process.env.OPENAI_API_KEY || ""}`
      },
      body: JSON.stringify({
        model: model || process.env.OPENAI_MODEL || "gpt-4.1-mini",
        messages: [{ role: "system", content: system }, ...messages],
        temperature: 0.85
      }),
      signal: AbortSignal.timeout(45000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `Chat API failed: ${response.status}`);
    return data.choices?.[0]?.message?.content || "";
  }

  if (provider === "claude") {
    const endpoint = `${(baseUrl || "https://api.anthropic.com").replace(/\/$/, "")}/v1/messages`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey || process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: model || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
        system,
        max_tokens: 1200,
        messages
      }),
      signal: AbortSignal.timeout(45000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `Claude API failed: ${response.status}`);
    return data.content?.map((part) => part.text || "").join("") || "";
  }

  throw new Error(`未知 provider: ${provider}`);
}

async function callPetActionAdapter({ provider, apiKey, baseUrl, model, action, character }) {
  const actionText = {
    touch: "用户摸了你的头。请以角色口吻回应一句短句。",
    feed: "用户投喂了你。请以角色口吻回应一句短句。",
    play: "用户邀请你玩耍。请以角色口吻回应一句短句。",
    rest: "用户让你休息一下。请以角色口吻回应一句短句。"
  }[action] || "用户与你互动。请以角色口吻回应一句短句。";
  return callChatAdapter({
    provider,
    apiKey,
    baseUrl,
    model,
    character,
    messages: [{ role: "user", content: `${actionText}\n要求：只输出角色会说的话，不要舞台动作描写，不要括号说明，不超过 45 个中文字符。` }]
  });
}

async function callTtsAdapter({ provider, apiKey, baseUrl, text, voice, model, language, autoTranslate, deviceId }) {
  const input = String(text || "").slice(0, 1200);
  if (!input.trim()) throw new Error("语音文本不能为空");

  if (provider === "acgn-official") {
    if (!voice) throw new Error("TTS-Online 官方 API 需要 voice_id");
    const token = extractAcgnToken(apiKey);
    if (!token) throw new Error("TTS-Online 官方 API 需要 token");
    const data = await postAcgnOfficialTts({
      token,
      baseUrl,
      voice,
      input,
      language: language || model || "JP"
    });
    return downloadAcgnAudio({ data, token, official: true });
  }

  if (provider === "acgn-ttson") {
    if (!voice) throw new Error("ACGN 配音需要 voice_id");
    const endpointBase = (baseUrl || ACGN_DEFAULT_BASE).replace(/\/$/, "");
    const token = extractAcgnToken(apiKey);
    const query = token ? `?token=${encodeURIComponent(token)}` : "";
    const headers = acgnHeaders(token ? "" : deviceId);
    const response = await fetch(`${endpointBase}/flashsummary/tts${query}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        voice_id: Number(voice),
        text: input,
        format: "mp3",
        to_lang: language || model || "JP",
        auto_translate: autoTranslate === false || autoTranslate === "0" ? 0 : 1,
        voice_speed: "0%",
        speed_factor: 1,
        pitch_factor: 0,
        volume_change_dB: 0,
        rate: "1.0",
        client_ip: "ACGN",
        emotion: 1
      }),
      signal: AbortSignal.timeout(60000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.code !== 200 || !data.voice_path || !data.url || !data.port) {
      throw new Error(data.detail || data.msg || `ACGN TTS failed: ${response.status}`);
    }
    return downloadAcgnAudio({ data, token, deviceId, official: false });
  }

  if (provider === "elevenlabs") {
    if (!apiKey) throw new Error("ElevenLabs 需要 API Key");
    if (!voice) throw new Error("ElevenLabs 需要 Voice ID");
    const endpoint = `${(baseUrl || "https://api.elevenlabs.io/v1").replace(/\/$/, "")}/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "xi-api-key": apiKey
      },
      body: JSON.stringify({
        text: input,
        model_id: model || "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.42,
          similarity_boost: 0.82,
          style: 0.45,
          use_speaker_boost: true
        }
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      let message = `ElevenLabs TTS failed: ${response.status}`;
      try {
        const data = await response.json();
        message = data.detail?.message || data.detail || data.error?.message || message;
      } catch {}
      throw new Error(message);
    }

    return {
      contentType: response.headers.get("content-type") || "audio/mpeg",
      buffer: Buffer.from(await response.arrayBuffer())
    };
  }

  if (provider !== "openai-compatible" || !apiKey) {
    throw new Error("高质量语音需要 OpenAI Compatible API Key");
  }

  const endpoint = `${(baseUrl || "https://api.openai.com/v1").replace(/\/$/, "")}/audio/speech`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini-tts",
      voice: voice || "marin",
      input,
      instructions: [
        "Speak in Japanese with polished anime voice acting.",
        "Use a natural seiyuu-like performance without imitating any real person.",
        "Keep the delivery emotionally expressive, clear, and characterful."
      ].join(" "),
      response_format: "mp3"
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    let message = `TTS API failed: ${response.status}`;
    try {
      const data = await response.json();
      message = data.error?.message || message;
    } catch {}
    throw new Error(message);
  }

  return {
    contentType: response.headers.get("content-type") || "audio/mpeg",
    buffer: Buffer.from(await response.arrayBuffer())
  };
}

async function routeApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/acgn-quota") {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);
      const token = String(url.searchParams.get("token") || "").trim();
      const baseUrl = String(url.searchParams.get("baseUrl") || ACGN_OFFICIAL_BASE).trim();
      json(res, 200, await getAcgnPackageRemaining(token, baseUrl || ACGN_OFFICIAL_BASE));
    } catch (error) {
      json(res, 500, { error: error.message });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/acgn-voices") {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);
      const query = String(url.searchParams.get("query") || "").trim();
      const work = String(url.searchParams.get("work") || "").trim();
      const limit = Math.min(30, Math.max(1, Number(url.searchParams.get("limit") || 12)));
      const deviceId = String(url.searchParams.get("deviceId") || "").trim();
      if (!query) {
        json(res, 400, { error: "query 不能为空", voices: [] });
        return;
      }
      const voices = await searchAcgnVoices(query, { work, limit, deviceId });
      json(res, 200, { voices });
    } catch (error) {
      json(res, 500, { error: error.message, voices: [] });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/image-candidates") {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);
      const name = String(url.searchParams.get("name") || "").trim();
      if (!name) {
        json(res, 400, { error: "角色名不能为空" });
        return;
      }
      json(res, 200, await fetchMoegirlImageCandidates(name));
    } catch (error) {
      json(res, 500, { error: error.message, candidates: [] });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/characters") {
    json(res, 200, await readJson(CHARACTER_FILE, []));
    return;
  }

  if (req.method === "POST" && pathname === "/api/characters") {
    try {
      const character = await createCharacter(await readBody(req));
      json(res, 201, character);
    } catch (error) {
      json(res, 400, { error: error.message });
    }
    return;
  }

  const deleteCharacterMatch = pathname.match(/^\/api\/characters\/([^/]+)$/);
  if (req.method === "DELETE" && deleteCharacterMatch) {
    const id = decodeURIComponent(deleteCharacterMatch[1]);
    const characters = await readJson(CHARACTER_FILE, []);
    const next = characters.filter((item) => item.id !== id);
    if (next.length === characters.length) {
      json(res, 404, { error: "Character not found" });
      return;
    }

    const sessions = await readJson(SESSION_FILE, {});
    for (const sessionId of Object.keys(sessions)) {
      if (sessionId.startsWith(`${id}-`)) delete sessions[sessionId];
    }

    await Promise.all([
      writeJson(CHARACTER_FILE, next),
      writeJson(SESSION_FILE, sessions)
    ]);
    json(res, 200, { ok: true, characters: next });
    return;
  }

  if (req.method === "POST" && pathname === "/api/chat") {
    try {
      const body = await readBody(req);
      const characters = await readJson(CHARACTER_FILE, []);
      const character = characters.find((item) => item.id === body.characterId) || characters[0];
      const reply = await callChatAdapter({ ...body, character });
      const sessions = await readJson(SESSION_FILE, {});
      const sessionId = body.sessionId || `${character.id}-${Date.now()}`;
      const history = sessions[sessionId] || [];
      sessions[sessionId] = [...history, ...(body.messages || []).slice(-1), { role: "assistant", content: reply, at: new Date().toISOString() }];
      await writeJson(SESSION_FILE, sessions);
      json(res, 200, { reply, sessionId });
    } catch (error) {
      json(res, 500, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/pet-action") {
    try {
      const body = await readBody(req);
      const characters = await readJson(CHARACTER_FILE, []);
      const character = characters.find((item) => item.id === body.characterId) || characters[0];
      const reply = await callPetActionAdapter({ ...body, character });
      json(res, 200, { reply });
    } catch (error) {
      json(res, 500, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/tts") {
    try {
      const audio = await callTtsAdapter(await readBody(req));
      res.writeHead(200, {
        "content-type": audio.contentType,
        "cache-control": "no-store"
      });
      res.end(audio.buffer);
    } catch (error) {
      json(res, 500, { error: error.message });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/providers") {
    json(res, 200, {
      providers: [
        { id: "mock", name: "本地预览", needsKey: false },
        { id: "openai-compatible", name: "OpenAI Compatible", needsKey: true },
        { id: "claude", name: "Claude Messages API", needsKey: true }
      ],
      env: {
        openai: Boolean(process.env.OPENAI_API_KEY),
        anthropic: Boolean(process.env.ANTHROPIC_API_KEY)
      }
    });
    return;
  }

  json(res, 404, { error: "Not found" });
}

async function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const file = path.normalize(path.join(PUBLIC_DIR, safePath));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const content = await readFile(file);
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

await ensureStore();

http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) {
    await routeApi(req, res, url.pathname);
    return;
  }
  await serveStatic(req, res, url.pathname);
}).listen(PORT, "0.0.0.0", () => {
  console.log(`CSP Visual Chat running at http://localhost:${PORT}`);
});
