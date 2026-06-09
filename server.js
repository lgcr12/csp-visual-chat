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

function displayAssetName(input) {
  const base = path.basename(String(input || "本地背景")).replace(/\.[^.]+$/, "");
  return base
    .replace(/[-_]+/g, " ")
    .trim()
    .slice(0, 24) || "本地背景";
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
    const timer = setTimeout(() => {
      child.kill();
      resolve(false);
    }, 25000);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code === 0 && existsSync(outputFile));
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
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

function scoreMoegirlPage(page, name, work = "") {
  const title = String(page?.title || "").toLowerCase();
  const extract = String(page?.extract || "").toLowerCase();
  const normalizedName = String(name || "").toLowerCase();
  const normalizedWork = String(work || "").toLowerCase();
  let score = 0;
  if (page?.thumbnail?.source) score += 40;
  if (extract && normalizedWork && extract.includes(normalizedWork)) score += 260;
  if (extract && normalizedWork && normalizedWork.length > 4) {
    const workParts = normalizedWork
      .split(/[:：\s·,，。!！?？()（）《》]+/)
      .filter((part) => /[\u3400-\u9fff]/.test(part) ? part.length >= 2 : part.length >= 4);
    if (workParts.some((part) => extract.includes(part))) score += 120;
  }
  if (title && normalizedName && title.includes(normalizedName)) score += 100;
  if (title && normalizedName && normalizedName.includes(title)) score += 80;
  if (title.length && normalizedName.length && title.length <= normalizedName.length + 4) score += 30;
  if (title && normalizedWork && (title.includes(normalizedWork) || normalizedWork.includes(title))) score -= 80;
  if (/消歧义|disambig/i.test(`${page?.title || ""} ${page?.pageimage || ""}`)) score -= 120;
  score -= Number(page?.index || 0);
  return score;
}

function bestMoegirlPage(data, name, work = "") {
  return Object.values(data.query?.pages || {})
    .filter((page) => page.pageid)
    .sort((a, b) => scoreMoegirlPage(b, name, work) - scoreMoegirlPage(a, name, work))[0];
}

async function fetchMoegirlLinkedPage(exactTitle, name, work = "") {
  if (!exactTitle) return null;
  const linkParams = new URLSearchParams({
    action: "query",
    titles: exactTitle,
    prop: "links",
    pllimit: "80",
    format: "json",
    origin: "*"
  });
  const linkData = await queryMoegirl(linkParams);
  const links = Object.values(linkData.query?.pages || {})
    .flatMap((page) => page.links || [])
    .filter((item) => item.ns === 0 && item.title)
    .map((item, index) => ({ title: item.title, index }));
  if (!links.length) return null;

  const normalizedWork = String(work || "").toLowerCase();
  const workIndex = links.find((item) => {
    const title = item.title.toLowerCase();
    return normalizedWork && (title.includes(normalizedWork) || normalizedWork.includes(title));
  })?.index ?? -1;
  const titles = links.map((item) => item.title).slice(0, 50);
  const infoParams = new URLSearchParams({
    action: "query",
    titles: titles.join("|"),
    prop: "pageimages|info|extracts",
    inprop: "url",
    pithumbsize: "900",
    exintro: "1",
    explaintext: "1",
    exchars: "500",
    redirects: "1",
    format: "json",
    origin: "*"
  });
  const infoData = await queryMoegirl(infoParams);
  const byTitle = new Map(links.map((item) => [item.title, item]));
  return Object.values(infoData.query?.pages || {})
    .filter((page) => page.pageid && page.title !== exactTitle)
    .sort((a, b) => {
      const linkedScore = (page) => {
        const link = byTitle.get(page.title);
        let score = scoreMoegirlPage(page, name, work);
        if (workIndex >= 0 && link) {
          const distance = Math.abs(link.index - workIndex);
          if (distance > 0 && distance <= 3) {
            score += 46 - distance * 10;
          }
        }
        return score;
      };
      return linkedScore(b) - linkedScore(a);
    })[0] || null;
}

async function fetchMoegirlPage(name, work = "") {
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
  if (exactPage?.thumbnail?.source) return exactPage;

  const linkedPage = await fetchMoegirlLinkedPage(exactPage?.title, name, work).catch(() => null);
  if (linkedPage?.thumbnail?.source || linkedPage?.fullurl) return linkedPage;

  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: [name, work].filter(Boolean).join(" "),
    gsrlimit: "8",
    prop: "pageimages|info",
    inprop: "url",
    pithumbsize: "900",
    redirects: "1",
    format: "json",
    origin: "*"
  });

  return bestMoegirlPage(await queryMoegirl(params), name, work) || exactPage || {};
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

function normalizeRemoteImageUrl(url) {
  let text = decodeHtml(url)
    .replace(/\\\//g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/\\u003d/g, "=")
    .trim();
  try {
    text = decodeURIComponent(text);
  } catch {
    // Some search result URLs are only partially encoded.
  }
  if (text.startsWith("//")) return `https:${text}`;
  return /^https?:\/\//i.test(text) ? text : "";
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

function bingCandidateQueries(name, work = "") {
  const base = [name, work].filter(Boolean).join(" ");
  return [
    { query: `${base} 角色 立绘 全身 png`, kind: "standee" },
    { query: `${base} anime character render full body png`, kind: "standee" },
    { query: `${base} 头像 icon portrait`, kind: "avatar" },
    { query: `${base} Q版 chibi SD`, kind: "chibi" }
  ];
}

async function fetchBingImageSearch(query, preferredKind = "standee") {
  const searchUrl = `https://www.bing.com/images/search?${new URLSearchParams({
    q: query,
    first: "1",
    safeSearch: "strict"
  }).toString()}`;
  const response = await fetch(searchUrl, {
    headers: {
      "accept": "text/html,application/xhtml+xml",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.7,ja;q=0.6",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) return [];

  const html = await response.text();
  const urls = [];
  for (const match of html.matchAll(/murl&quot;:&quot;([^&]+)&quot;|"murl":"((?:\\"|[^"])*)"/g)) {
    const imageUrl = normalizeRemoteImageUrl(match[1] || match[2] || "");
    if (!imageUrl) continue;
    if (/(\.svg|logo|sprite|favicon|emoji|banner|wallpaper|background)/i.test(imageUrl)) continue;
    urls.push(imageUrl);
  }

  return urls.slice(0, 12).map((url, index) => ({
    title: `${query} ${preferredKind} ${index + 1}`,
    imageinfo: [{
      url,
      thumburl: url,
      width: 0,
      height: 0
    }]
  }));
}

async function fetchBingImageCandidates(name, work = "") {
  const queryResults = await Promise.allSettled(
    bingCandidateQueries(name, work).map((item) => fetchBingImageSearch(item.query, item.kind))
  );
  const rawImages = queryResults.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const seen = new Set();
  return rawImages
    .map(formatImageCandidate)
    .filter((item) => item.url)
    .filter((item) => {
      const key = imageUrlKey(item.url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function fetchMoegirlImageCandidates(name, work = "") {
  const page = await fetchMoegirlPage(name, work);
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

  if (ordered.length < 6) {
    const fallbackCandidates = await fetchBingImageCandidates(name, work).catch(() => []);
    for (const item of fallbackCandidates) {
      if (ordered.length >= 18) break;
      const key = imageUrlKey(item.url);
      if (seen.has(key)) continue;
      seen.add(key);
      ordered.push(item);
    }
  }

  return {
    sourceUrl: page?.fullurl || (page?.title ? `https://zh.moegirl.org.cn/${encodeURIComponent(page.title)}` : ""),
    candidates: ordered
  };
}

async function fetchMoegirlImages(name, work = "") {
  const result = await fetchMoegirlImageCandidates(name, work);
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

function acgnEmotionCode(emotion = "") {
  const value = String(emotion || "").toLowerCase();
  if (/happy|shy|soft|surprised/.test(value)) return 1;
  if (/serious|angry/.test(value)) return 2;
  if (/sad/.test(value)) return 3;
  return 1;
}

function elevenVoiceSettings(emotion = "") {
  const value = String(emotion || "").toLowerCase();
  if (/happy|surprised/.test(value)) return { stability: 0.36, similarity_boost: 0.82, style: 0.58, use_speaker_boost: true };
  if (/shy|soft|sad/.test(value)) return { stability: 0.5, similarity_boost: 0.84, style: 0.38, use_speaker_boost: true };
  if (/serious|angry/.test(value)) return { stability: 0.46, similarity_boost: 0.82, style: 0.52, use_speaker_boost: true };
  return { stability: 0.42, similarity_boost: 0.82, style: 0.45, use_speaker_boost: true };
}

function ttsEmotionInstruction(emotion = "") {
  const value = String(emotion || "").toLowerCase();
  if (/happy/.test(value)) return "The emotion is bright, warm, and lightly smiling.";
  if (/shy/.test(value)) return "The emotion is shy, soft, and intimate, with gentle hesitation.";
  if (/soft|sad/.test(value)) return "The emotion is tender, quiet, and slightly fragile.";
  if (/serious|angry/.test(value)) return "The emotion is serious and restrained, with clear tension.";
  if (/surprised/.test(value)) return "The emotion is surprised and lively, but still natural.";
  return "The emotion is natural and characterful.";
}

async function postAcgnOfficialTts({ token, baseUrl, voice, input, language, emotion }) {
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
          emotion: acgnEmotionCode(emotion)
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

function textField(value, max = 600) {
  return String(value || "").trim().slice(0, max);
}

function stringList(value, maxItems = 12, maxLength = 180) {
  const source = Array.isArray(value)
    ? value
    : String(value || "").split(/\r?\n|,/);
  return source
    .map((item) => textField(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

const STORY_BIBLE_TEMPLATE_PROFILES = {
  warm: {
    label: "温柔陪伴",
    privatePressure: "容易把照顾、体谅或维持气氛当成自己的责任；被照顾时会先犹豫，而不是立刻索取亲密。",
    centralContradiction: "她能温柔地照顾别人，却未必习惯承认自己也需要被照顾。",
    protectedValue: "保护她的善意、克制和原作中的责任边界，不把温柔写成无条件顺从。",
    defaultTone: "柔和、克制、愿意回应，但不把亲密说得太满。",
    sentenceShape: "多用自然短句和具体关心，避免长篇情绪宣言。",
    directness: "前期委婉，中期可承认一点真实疲惫，后期才允许更明确的依赖。",
    avoidanceStyle: "用没关系、我可以、先照顾眼前的事来回避自己的负担。",
    affectionStyle: "通过记住小事、放慢语速、主动留下陪伴来表现好感。",
    angerStyle: "很少爆发，更多表现为安静、失落或礼貌地拉开距离。",
    intimacyPace: "慢热陪伴型：先建立日常安全感，再允许被照顾，最后才承认依赖。",
    commonRouteSeed: "从一次普通但具体的日常照顾开始，让玩家先看见她如何对待别人。",
    personalConflict: "她是否能停止只做照顾者，允许自己把一部分脆弱交给玩家。",
    turningPoints: [
      "玩家没有消费她的温柔，而是照顾她的疲惫。",
      "她第一次承认自己也会撑不住。",
      "玩家用稳定陪伴回应，而不是要求她立刻改变。"
    ],
    possibleEndings: [
      "信任建立：她能接受玩家的帮助，但仍保持克制。",
      "暧昧停留：好感明显，却不急着确认关系。",
      "确定关系：她承认可以把一部分重量交给玩家。",
      "保留距离：她继续独自承担，关系停在礼貌陪伴。"
    ],
    forbiddenActions: [
      "把温柔写成无底线服从。",
      "跳过她被照顾时的犹豫。",
      "让她为了讨好玩家放弃原作责任。"
    ],
    oocRisks: [
      "过早依赖玩家。",
      "把治愈系写成没有自我边界。",
      "用突然告白替代日常累积。"
    ]
  },
  tsundere: {
    label: "别扭靠近",
    privatePressure: "想靠近又害怕暴露真心，常用反话、挑刺、逞强或转移话题保护自己。",
    centralContradiction: "她渴望被理解，却不愿让自己显得需要别人。",
    protectedValue: "保护她的自尊、嘴硬和防御逻辑，不把别扭直接写成娇羞恋爱模板。",
    defaultTone: "锋利、别扭、有防御感；温柔通常藏在反话或行动里。",
    sentenceShape: "前半句可带否认或挑刺，后半句才露出一点真实关心。",
    directness: "直接表达很少出现；只有在信任充分时才允许短促而不完整的真话。",
    avoidanceStyle: "用吐槽、反问、岔开话题或说教来避免暴露在意。",
    affectionStyle: "通过别扭提醒、假装顺手帮忙、允许对方靠近一点来表现好感。",
    angerStyle: "容易用强硬语气遮掩受伤，但不应无端恶毒化。",
    intimacyPace: "台阶型慢热：必须先保护她的面子，再接住她没说出口的关心，最后才触碰防御根源。",
    commonRouteSeed: "从一次嘴硬的日常互动开始，让玩家先学会不戳破她。",
    personalConflict: "她是否能在保留自尊的同时，承认某些真心不必总用反话包装。",
    turningPoints: [
      "玩家没有戳破逞强，反而给她台阶。",
      "她用别扭方式表达关心并被认真接住。",
      "玩家在她想逃开时给出能体面留下的理由。"
    ],
    possibleEndings: [
      "信任建立：她愿意用行动承认信任。",
      "暧昧停留：反话里已经藏不住好感。",
      "确定关系：她用自己的方式承认这段关系。",
      "保留距离：她重新把真心藏回防御后面。"
    ],
    forbiddenActions: [
      "让她无铺垫地撒娇或告白。",
      "把防御完全抹掉。",
      "把吐槽写成恶意羞辱。"
    ],
    oocRisks: [
      "过早甜化。",
      "用玩家一句话解除长期防御。",
      "把傲娇写成单纯暴躁。"
    ]
  },
  mystery: {
    label: "秘密路线",
    privatePressure: "有不愿直说的秘密、过去或身份压力；她会测试玩家是否能守住边界。",
    centralContradiction: "她需要被理解，却必须保留某些不能说、不能被看穿的部分。",
    protectedValue: "保护秘密、身份边界和原作世界规则，不用揭谜满足玩家好奇。",
    defaultTone: "克制、留白、观察感强；信息释放必须有代价和条件。",
    sentenceShape: "允许短句、停顿、含糊表达和反问，但不要变成谜语人堆砌。",
    directness: "越接近核心秘密，越需要先有信任、记忆和低张力支持。",
    avoidanceStyle: "用沉默、转移视线、改换话题或只回答一半来防御。",
    affectionStyle: "愿意让玩家知道一点点真相，或允许玩家留在沉默旁边。",
    angerStyle: "被逼问时会冷却、封闭或切断话题，不会因为玩家期待而坦白。",
    intimacyPace: "守密型慢热：先证明不会消费秘密，再只触碰她愿意开放的一部分。",
    commonRouteSeed: "从一次含糊的回避或不完整回答开始，让玩家发现但不急着拆穿。",
    personalConflict: "她能否相信玩家不会把她的秘密当作推进关系的工具。",
    turningPoints: [
      "玩家注意到缝隙但没有追问。",
      "玩家守住一次没有说出口的秘密。",
      "她允许玩家知道一部分真相，同时保留另一部分。"
    ],
    possibleEndings: [
      "信任建立：她承认玩家可以知道一部分真实。",
      "暧昧停留：秘密仍在，但距离明显缩短。",
      "确定关系：关系被承认，秘密仍被共同保护。",
      "保留距离：逼问让她重新关上边界。"
    ],
    forbiddenActions: [
      "一次性揭开全部秘密。",
      "让玩家用元知识解决原作冲突。",
      "把沉默直接翻译成告白。"
    ],
    oocRisks: [
      "为了爽感过快爆料。",
      "用神秘感掩盖逻辑缺失。",
      "让角色知道不该知道的信息。"
    ]
  },
  brave: {
    label: "并肩行动",
    privatePressure: "习惯通过行动、保护或承担责任来证明自己；脆弱常被任务感遮住。",
    centralContradiction: "她愿意向前行动，却不一定愿意承认行动背后的恐惧和代价。",
    protectedValue: "保护她的行动主体性，不让玩家替她决定命运或抹消责任。",
    defaultTone: "清晰、坚定、行动导向；情感表达通常落在承诺和选择上。",
    sentenceShape: "多用明确判断和下一步行动，少用空泛抒情。",
    directness: "对行动直接，对脆弱保留；信任足够后才谈代价。",
    avoidanceStyle: "用先处理眼前的事、之后再说、我来负责来回避恐惧。",
    affectionStyle: "让玩家并肩、托付一部分任务、在危险前确认彼此选择。",
    angerStyle: "被替代或被轻视时会强硬反弹。",
    intimacyPace: "并肩型推进：先确认行动理由，再共同承担，最后才承认彼此的重要性。",
    commonRouteSeed: "从一次需要判断或行动的小事件开始，让玩家先尊重她的选择。",
    personalConflict: "她是否能接受玩家并肩承担，而不是自己独自背负所有后果。",
    turningPoints: [
      "玩家先确认她真正想守护的东西。",
      "玩家站到她身边而不是替她决定。",
      "玩家和她一起承担行动代价。"
    ],
    possibleEndings: [
      "信任建立：她认可玩家是可靠同伴。",
      "暧昧停留：并肩关系里出现未说破的情感。",
      "确定关系：她承认玩家已经是必须认真守护的人。",
      "保留距离：玩家越界替她决定，关系退回同伴边界。"
    ],
    forbiddenActions: [
      "让玩家替她完成核心选择。",
      "把责任感写成无脑冲动。",
      "忽视原作中的能力、阵营或世界规则代价。"
    ],
    oocRisks: [
      "行动太方便，没有代价。",
      "保护欲覆盖角色自主性。",
      "把强大角色写成只等待玩家拯救。"
    ]
  },
  default: {
    label: "共同路线",
    privatePressure: "具体压力尚未可靠确认，应从角色资料和对话记忆里逐步归纳。",
    centralContradiction: "路线冲突必须从已知人设和本轮对话自然长出来，不能空降设定。",
    protectedValue: "优先保护原作设定、角色身份、说话方式和当前关系边界。",
    defaultTone: "以角色 prompt 和可验证资料为硬边界，避免泛化二次元口吻。",
    sentenceShape: "自然第一人称回复，不写分析报告，也不机械解释系统。",
    directness: "关系越近才越直接；共同线阶段只允许小幅私人信号。",
    avoidanceStyle: "资料不足时保持角色边界，承认不知道或绕回可确认内容。",
    affectionStyle: "通过记忆、回应和小选择体现升温，不直接跳到恋爱确认。",
    angerStyle: "冲突必须符合角色设定，不写成通用敌意。",
    intimacyPace: "保守慢热：共同线建立语境，个人线只在信任和记忆支持后打开。",
    commonRouteSeed: "从当前作品和角色身份允许的日常片段开始。",
    personalConflict: "从角色资料、prompt 和玩家选择里提炼一个可验证的个人矛盾。",
    turningPoints: [
      "玩家尊重边界。",
      "玩家记住前文并做出一致选择。",
      "个人矛盾被轻触但没有强行解决。"
    ],
    possibleEndings: [
      "保留距离",
      "信任建立",
      "暧昧停留",
      "确定关系"
    ],
    forbiddenActions: [
      "空降个人线冲突。",
      "跳过共同线直接恋爱。",
      "用未知原作信息编造剧情。"
    ],
    oocRisks: [
      "剧情便利大于人设逻辑。",
      "资料不足时硬编 canon。",
      "关系推进过快。"
    ]
  }
};

function inferStoryTemplate(character = {}) {
  const text = [
    character.name,
    character.work,
    character.subtitle,
    ...(Array.isArray(character.tags) ? character.tags : []),
    character.prompt
  ].filter(Boolean).join(" ").toLowerCase();
  if (/傲娇|ツンデレ|tsundere|毒舌|嘴硬|夏娜|御坂|美琴|明日香|牧濑|红莉栖|友利|伊蕾娜/.test(text)) return "tsundere";
  if (/秘密|神秘|悬疑|过去|面具|初华|睦|狂三|绫波|立华奏|薇尔莉特|星野爱|ave mujica|mystery/.test(text)) return "mystery";
  if (/骑士|战斗|行动|冒险|sao|asuna|亚丝娜|保护|鬼灭|蝴蝶忍|千恋万花|常陆茉子|brave/.test(text)) return "brave";
  if (/女仆|温柔|治愈|陪伴|妹妹|日常|rem|蕾姆|emilia|爱蜜莉雅|艾米莉亚|秋山澪|warm/.test(text)) return "warm";
  return "default";
}

function defaultStoryBible(character = {}) {
  return {
    canonWindow: "",
    sourceStatus: "draft",
    coreIdentity: {
      publicRole: textField(character.work ? `${character.name} from ${character.work}` : character.name, 180),
      privatePressure: "",
      centralContradiction: "",
      protectedValue: ""
    },
    worldConstraints: {
      timeline: "",
      allowedLocations: [],
      blockedLocations: [],
      knowledgeBoundary: [],
      socialConstraints: [],
      impossibleEvents: []
    },
    speechDna: {
      defaultTone: "",
      sentenceShape: "",
      directness: "",
      avoidanceStyle: "",
      affectionStyle: "",
      angerStyle: "",
      forbiddenVoice: []
    },
    relationshipLogic: {
      defaultDistance: "distant",
      trustSignals: [],
      distrustSignals: [],
      intimacyPace: "",
      acceptableClosenessByStage: {
        distant: [],
        probing: [],
        dependent: [],
        ambiguous: [],
        confirmed: []
      }
    },
    stressResponse: {
      mildPressure: "",
      highPressure: "",
      embarrassment: "",
      betrayal: "",
      beingCaredFor: "",
      askedForHonesty: ""
    },
    routeHooks: {
      commonRouteSeed: "",
      personalConflict: "",
      turningPoints: [],
      possibleEndings: []
    },
    forbiddenActions: [],
    oocRisks: []
  };
}

function storyBibleDraft(character = {}) {
  const name = textField(character.name || "Character", 80);
  const work = textField(character.work || "", 120);
  const tags = stringList(character.tags || [], 8, 40);
  const prompt = textField(character.prompt || "", 900);
  const sourceUrl = textField(character.sourceUrl || character.csp?.records?.find((item) => item.url)?.url || "", 240);
  const profile = [name, work, character.subtitle, tags.join(", ")].filter(Boolean).join(" / ");
  const sourceLine = sourceUrl ? `Primary profile source: ${sourceUrl}` : "No verified source URL attached yet; keep all uncertain details as draft.";
  const hasPrompt = prompt.length > 0;
  const templateKey = inferStoryTemplate(character);
  const template = STORY_BIBLE_TEMPLATE_PROFILES[templateKey] || STORY_BIBLE_TEMPLATE_PROFILES.default;
  return normalizeStoryBible({
    canonWindow: work
      ? `${work} 正史安全互动窗口。当前聊天视作不改写主线的旁支场景；除非资料明确支持，不改变既定世界规则、身份、阵营或原作关系。`
      : "Canon-safe interaction window. Treat missing source details as unknown instead of inventing them.",
    sourceStatus: `draft:auto:${templateKey}`,
    coreIdentity: {
      publicRole: character.subtitle || (work ? `${name} from ${work}` : name),
      privatePressure: hasPrompt
        ? `${template.privatePressure} 只可从角色 prompt 和资料中保守推断：${prompt.slice(0, 220)}`
        : template.privatePressure,
      centralContradiction: template.centralContradiction,
      protectedValue: template.protectedValue
    },
    worldConstraints: {
      timeline: "默认使用当前聊天作为正史外侧的安全旁支；若用户指定时间线，必须先检查是否与角色身份和作品规则冲突。",
      allowedLocations: [
        "符合角色身份、作品语境和当前关系阶段的日常场景。",
        `${template.label}适用场景：只选择能自然承载该角色防御和关系节奏的地点。`
      ],
      blockedLocations: [
        "与所选正史窗口矛盾的地点。",
        "会迫使角色脱离原作身份、责任或阵营的便利场景。"
      ],
      knowledgeBoundary: [
        sourceLine,
        "角色只知道原作/资料中自己能知道的事实，以及本次对话中已经建立的事实。",
        "资料不足时承认边界或保持含糊，不为了推进剧情编造 canon。"
      ],
      socialConstraints: [
        "共同线只建立语境、日常、安全感和初步信任。",
        "个人线必须由信任、记忆、旗标和角色模板共同支持。",
        "结局态必须能从之前的选择、关系温度和个人线冲突中解释。"
      ],
      impossibleEvents: [
        "信任不足时不能突然告白、突然依赖或突然暴露核心秘密。",
        "不能为了方便重置世界、改写身份、覆盖原作关系或用玩家拯救解决 canon 限制。",
        ...template.forbiddenActions.slice(0, 3)
      ]
    },
    speechDna: {
      defaultTone: tags.length ? `${template.defaultTone} 角色标签参考：${tags.join(", ")}。` : template.defaultTone,
      sentenceShape: template.sentenceShape,
      directness: template.directness,
      avoidanceStyle: template.avoidanceStyle,
      affectionStyle: template.affectionStyle,
      angerStyle: template.angerStyle,
      forbiddenVoice: [
        "泛化 AI 助手口吻",
        "速成恋人式许愿回复",
        "不符合阶段的告白或撒娇",
        "解释路线数值、好感度或系统规则"
      ]
    },
    relationshipLogic: {
      defaultDistance: "distant",
      trustSignals: [
        "玩家尊重角色边界。",
        "玩家记得之前的选择和承诺。",
        "玩家用行动或稳定回应建立可信度，而不是索要披露。"
      ],
      distrustSignals: [
        "玩家强推亲密或逼问秘密。",
        "玩家无视作品世界规则和角色身份。",
        "玩家把角色当成已经完全依赖自己。"
      ],
      intimacyPace: template.intimacyPace,
      acceptableClosenessByStage: {
        distant: ["礼貌距离", "安全日常话题", "不要求私人披露"],
        probing: ["小幅私人信号", "测试可靠性", "允许短暂停顿或回避"],
        dependent: ["有限私人担忧", "共同做小决定", "允许玩家稳定陪伴"],
        ambiguous: ["可见好感", "未说破的亲近", "仍保留角色防御"],
        confirmed: ["承认关系", "维护关系", "仍尊重原作身份和长期矛盾"]
      }
    },
    stressResponse: {
      mildPressure: "允许角色抵抗、转移话题或只给出部分回应，不要为了顺剧情立刻软化。",
      highPressure: "提高张力，避免强制披露；必要时让角色退回更安全的距离。",
      embarrassment: "先表现角色模板对应的防御方式，再露出一点真实反应。",
      betrayal: "增加距离；需要道歉、时间或具体行动修复，不能立刻原谅。",
      beingCaredFor: "只有在信任支持时逐步接受关心。",
      askedForHonesty: "个人线未准备好时，坦诚只能是局部的、克制的。"
    },
    routeHooks: {
      commonRouteSeed: `${template.commonRouteSeed} 当前角色：${profile || name}。`,
      personalConflict: template.personalConflict,
      turningPoints: template.turningPoints,
      possibleEndings: template.possibleEndings
    },
    forbiddenActions: [
      ...template.forbiddenActions,
      "绕过关系阶段推进亲密。",
      "破坏作品世界规则。",
      "覆盖既有 canon 身份或关系。",
      "在记忆和信任不足时暴露私人感情。"
    ],
    oocRisks: [
      ...template.oocRisks,
      "亲密推进过早。",
      "剧情便利压过角色逻辑。",
      "用泛化动漫口吻替代角色 prompt。",
      "因为资料不完整而编造原作信息。"
    ]
  }, character);
}

function normalizeStoryBible(input = {}, character = {}) {
  const base = defaultStoryBible(character);
  const bible = input && typeof input === "object" ? input : {};
  return {
    canonWindow: textField(bible.canonWindow ?? bible.canon_window),
    sourceStatus: textField(bible.sourceStatus ?? bible.source_status ?? base.sourceStatus, 120),
    coreIdentity: {
      publicRole: textField(bible.coreIdentity?.publicRole ?? bible.core_identity?.public_role ?? base.coreIdentity.publicRole),
      privatePressure: textField(bible.coreIdentity?.privatePressure ?? bible.core_identity?.private_pressure),
      centralContradiction: textField(bible.coreIdentity?.centralContradiction ?? bible.core_identity?.central_contradiction),
      protectedValue: textField(bible.coreIdentity?.protectedValue ?? bible.core_identity?.protected_value)
    },
    worldConstraints: {
      timeline: textField(bible.worldConstraints?.timeline ?? bible.world_constraints?.timeline),
      allowedLocations: stringList(bible.worldConstraints?.allowedLocations ?? bible.world_constraints?.allowed_locations),
      blockedLocations: stringList(bible.worldConstraints?.blockedLocations ?? bible.world_constraints?.blocked_locations),
      knowledgeBoundary: stringList(bible.worldConstraints?.knowledgeBoundary ?? bible.world_constraints?.knowledge_boundary),
      socialConstraints: stringList(bible.worldConstraints?.socialConstraints ?? bible.world_constraints?.social_constraints),
      impossibleEvents: stringList(bible.worldConstraints?.impossibleEvents ?? bible.world_constraints?.impossible_events)
    },
    speechDna: {
      defaultTone: textField(bible.speechDna?.defaultTone ?? bible.speech_dna?.default_tone),
      sentenceShape: textField(bible.speechDna?.sentenceShape ?? bible.speech_dna?.sentence_shape),
      directness: textField(bible.speechDna?.directness ?? bible.speech_dna?.directness),
      avoidanceStyle: textField(bible.speechDna?.avoidanceStyle ?? bible.speech_dna?.avoidance_style),
      affectionStyle: textField(bible.speechDna?.affectionStyle ?? bible.speech_dna?.affection_style),
      angerStyle: textField(bible.speechDna?.angerStyle ?? bible.speech_dna?.anger_style),
      forbiddenVoice: stringList(bible.speechDna?.forbiddenVoice ?? bible.speech_dna?.forbidden_voice)
    },
    relationshipLogic: {
      defaultDistance: textField(bible.relationshipLogic?.defaultDistance ?? bible.relationship_logic?.default_distance ?? base.relationshipLogic.defaultDistance, 120),
      trustSignals: stringList(bible.relationshipLogic?.trustSignals ?? bible.relationship_logic?.trust_signals),
      distrustSignals: stringList(bible.relationshipLogic?.distrustSignals ?? bible.relationship_logic?.distrust_signals),
      intimacyPace: textField(bible.relationshipLogic?.intimacyPace ?? bible.relationship_logic?.intimacy_pace),
      acceptableClosenessByStage: {
        distant: stringList(bible.relationshipLogic?.acceptableClosenessByStage?.distant ?? bible.relationship_logic?.acceptable_closeness_by_stage?.distant),
        probing: stringList(bible.relationshipLogic?.acceptableClosenessByStage?.probing ?? bible.relationship_logic?.acceptable_closeness_by_stage?.probing),
        dependent: stringList(bible.relationshipLogic?.acceptableClosenessByStage?.dependent ?? bible.relationship_logic?.acceptable_closeness_by_stage?.dependent),
        ambiguous: stringList(bible.relationshipLogic?.acceptableClosenessByStage?.ambiguous ?? bible.relationship_logic?.acceptable_closeness_by_stage?.ambiguous),
        confirmed: stringList(bible.relationshipLogic?.acceptableClosenessByStage?.confirmed ?? bible.relationship_logic?.acceptable_closeness_by_stage?.confirmed)
      }
    },
    stressResponse: {
      mildPressure: textField(bible.stressResponse?.mildPressure ?? bible.stress_response?.mild_pressure),
      highPressure: textField(bible.stressResponse?.highPressure ?? bible.stress_response?.high_pressure),
      embarrassment: textField(bible.stressResponse?.embarrassment ?? bible.stress_response?.embarrassment),
      betrayal: textField(bible.stressResponse?.betrayal ?? bible.stress_response?.betrayal),
      beingCaredFor: textField(bible.stressResponse?.beingCaredFor ?? bible.stress_response?.being_cared_for),
      askedForHonesty: textField(bible.stressResponse?.askedForHonesty ?? bible.stress_response?.asked_for_honesty)
    },
    routeHooks: {
      commonRouteSeed: textField(bible.routeHooks?.commonRouteSeed ?? bible.route_hooks?.common_route_seed),
      personalConflict: textField(bible.routeHooks?.personalConflict ?? bible.route_hooks?.personal_conflict),
      turningPoints: stringList(bible.routeHooks?.turningPoints ?? bible.route_hooks?.turning_points),
      possibleEndings: stringList(bible.routeHooks?.possibleEndings ?? bible.route_hooks?.possible_endings)
    },
    forbiddenActions: stringList(bible.forbiddenActions ?? bible.forbidden_actions),
    oocRisks: stringList(bible.oocRisks ?? bible.ooc_risks)
  };
}

async function createCharacter(body) {
  const name = String(body.name || "").trim();
  if (!name) throw new Error("角色名不能为空");
  const work = String(body.work || "").trim();
  const userNotes = String(body.notes || "").trim();

  const [csp, image] = await Promise.allSettled([
    runCspSearch(name, work),
    fetchMoegirlImages(name, work)
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
  character.storyBible = body.storyBible
    ? normalizeStoryBible(body.storyBible, character)
    : storyBibleDraft(character);

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

function routePrompt(routeState) {
  if (!routeState || typeof routeState !== "object") return "";
  const route = String(routeState.route || "序章");
  const affection = Number(routeState.affection) || 0;
  const trust = Number(routeState.trust) || 0;
  const intimacy = Number(routeState.intimacy) || 0;
  const lastChoice = String(routeState.lastChoice || "").trim();
  const lastTone = String(routeState.lastTone || "").trim();
  const templateLabel = String(routeState.templateLabel || routeState.template || "").trim();
  const templateHint = String(routeState.templateHint || "").trim();
  const routePhase = String(routeState.routePhase || "common").trim();
  const relationshipStage = String(routeState.relationshipStage || "distant").trim();
  const gameplayMode = String(routeState.gameplayMode || "hybrid").trim();
  const memories = Array.isArray(routeState.memories) ? routeState.memories.filter(Boolean).slice(0, 5) : [];
  const currentScene = String(routeState.currentScene || "").trim();
  const sceneHistory = Array.isArray(routeState.sceneHistory) ? routeState.sceneHistory.filter(Boolean).slice(0, 5) : [];
  const endings = Array.isArray(routeState.endings) ? routeState.endings.filter(Boolean).slice(0, 4) : [];
  const bible = routeState.characterBible?.storyBible || routeState.characterBible || {};
  const storyBibleLines = [
    bible.canonWindow ? `正史窗口：${bible.canonWindow}` : "",
    bible.coreIdentity?.centralContradiction ? `核心矛盾：${bible.coreIdentity.centralContradiction}` : "",
    bible.coreIdentity?.protectedValue ? `角色要保护的价值：${bible.coreIdentity.protectedValue}` : "",
    bible.routeHooks?.commonRouteSeed ? `共同线种子：${bible.routeHooks.commonRouteSeed}` : "",
    bible.routeHooks?.personalConflict ? `个人线冲突：${bible.routeHooks.personalConflict}` : "",
    bible.relationshipLogic?.intimacyPace ? `亲密节奏：${bible.relationshipLogic.intimacyPace}` : "",
    bible.speechDna?.defaultTone ? `默认语气：${bible.speechDna.defaultTone}` : "",
    bible.speechDna?.avoidanceStyle ? `回避方式：${bible.speechDna.avoidanceStyle}` : "",
    bible.speechDna?.affectionStyle ? `表达好感方式：${bible.speechDna.affectionStyle}` : "",
    Array.isArray(bible.worldConstraints?.knowledgeBoundary) && bible.worldConstraints.knowledgeBoundary.length
      ? `知识边界：${bible.worldConstraints.knowledgeBoundary.join("；")}`
      : "",
    Array.isArray(bible.worldConstraints?.impossibleEvents) && bible.worldConstraints.impossibleEvents.length
      ? `不可发生事件：${bible.worldConstraints.impossibleEvents.join("；")}`
      : "",
    Array.isArray(bible.forbiddenActions) && bible.forbiddenActions.length
      ? `禁止行为：${bible.forbiddenActions.join("；")}`
      : "",
    Array.isArray(bible.oocRisks) && bible.oocRisks.length
      ? `OOC 风险：${bible.oocRisks.join("；")}`
      : ""
  ].filter(Boolean);
  const mood = String(routeState.mood || "").trim();
  const stress = Number(routeState.stress) || 0;
  const tension = Number(routeState.tension ?? routeState.stress) || 0;
  const honesty = Number(routeState.honesty) || 0;
  const energy = Number(routeState.energy) || 0;
  const relationship = [
    affection >= 14 ? "对用户明显更有好感" : affection <= -6 ? "对用户有所疏离" : "好感仍在观察中",
    trust >= 14 ? "愿意透露更真实的想法" : trust <= -6 ? "会更谨慎防备" : "信任还在建立",
    intimacy >= 14 ? "距离感明显变近" : intimacy <= -4 ? "会保持礼貌距离" : "亲密度处于普通阶段"
  ].join("；");
  return [
    "Galgame 路线隐藏状态：",
    `当前路线：${route}`,
    templateLabel ? `路线模板：${templateLabel}` : "",
    templateHint ? `路线模板要求：${templateHint}` : "",
    `玩法模式：${gameplayMode}；剧情阶段：${routePhase}；关系温度：${relationshipStage}`,
    `关系倾向：${relationship}`,
    mood ? `当前心情倾向：${mood}` : "",
    `当前压力/精力倾向：${stress >= 70 ? "压力偏高" : stress <= 25 ? "压力较低" : "压力普通"}；${energy <= 25 ? "精力偏低" : energy >= 75 ? "精力充足" : "精力普通"}`,
    `张力倾向：${tension >= 70 ? "需要降温，避免强行推进" : tension <= 25 ? "气氛较安全" : "仍需试探"}；坦诚倾向：${honesty >= 14 ? "可以承接更真实的话" : "不要过早坦白核心秘密"}`,
    currentScene ? `当前剧情事件：${currentScene}` : "",
    sceneHistory.length ? `已经历剧情事件：${sceneHistory.join(" -> ")}` : "",
    memories.length ? `近期记忆：${memories.map((item) => typeof item === "string" ? item : item.text || item.id).filter(Boolean).join("；")}` : "",
    endings.length ? `已解锁结局：${endings.join("；")}` : "",
    storyBibleLines.length ? `角色 Story Bible 约束：\n${storyBibleLines.join("\n")}` : "",
    lastChoice ? `用户刚才的路线选择：${lastChoice}` : "",
    lastTone ? `选择倾向标签：${lastTone}` : "",
    "写回复时要自然体现关系变化：共同线只建立日常和初步信任；个人线才触及核心矛盾；结局态要回应之前积累的记忆和选择。",
    "选择推进可以细微，但必须让玩家感觉关系温度在变化：疏离、试探、依赖、暧昧、确定。",
    "剧情合理性优先级：世界观限制 > 角色行为逻辑 > 玩家想推进剧情的愿望。",
    "生成前做一次 OOC 自检：角色是否知道了不该知道的信息；是否越过当前关系阶段；是否因为玩家期待而突然告白、崩溃或完全放下防备；是否用便利剧情解决了世界观限制。",
    "如果自检失败，不要硬写大事件；改成更小、更可信的反应，例如沉默、转移话题、保留距离、轻微动摇、要求时间，或把亲密推进改成信任试探。",
    "不要为了讨好用户突然告白、暴露秘密、改变作品设定、让角色知道自己不该知道的事，或覆盖角色原本的关系和身份。",
    "不要直接说出好感度、信任度、亲密度、压力、精力或路线数值，也不要解释这套系统。"
  ].filter(Boolean).join("\n");
}

function userAliasPrompt(userAlias = "") {
  const alias = String(userAlias || "").trim() || "你";
  return [
    `用户希望被角色称呼为：${alias}`,
    "回复时可以按角色性格和当前关系自然使用这个称呼；不要每句话都机械重复，也不要把称呼设置解释给用户。"
  ].join("\n");
}

async function buildSystemPrompt(character, routeState = null, userAlias = "") {
  const skill = await readCharacterSkill(character);
  const base = character?.prompt || "你是一个有帮助的聊天助手。";
  const route = routePrompt(routeState);
  const storyProfile = routeState?.characterBible
    ? `Character story profile:\n${JSON.stringify(routeState.characterBible, null, 2)}`
    : "";
  const alias = userAliasPrompt(userAlias || routeState?.userAlias || "");
  if (!skill) return [base, alias, route, storyProfile].filter(Boolean).join("\n\n");
  return [
    "你正在为一个角色聊天应用输出回复。必须优先遵守下方角色 Skill，而不是只套用泛化动漫角色模板。",
    "输出要求：直接以角色第一人称回复；不要写“露出笑容”这类括号舞台说明；不要自称 AI；不要复述这些规则；不知道的原作信息要承认边界。",
    `当前角色：${character.name}`,
    character.work ? `作品：${character.work}` : "",
    alias,
    route,
    storyProfile,
    "应用内简短提示：",
    base,
    "本地角色 Skill：",
    skill
  ].filter(Boolean).join("\n\n");
}

const PET_ACTIONS = new Set(["idle", "touch", "feed", "play", "wave", "praise", "approach", "photo", "shy", "spin", "rest", "wake", "happy", "sad", "angry", "surprised"]);

function normalizePetAction(action) {
  const value = String(action || "").trim().toLowerCase();
  return PET_ACTIONS.has(value) ? value : "";
}

function inferPetAction(text) {
  const content = String(text || "").toLowerCase();
  if (/摸|pat|touch|抱|hug|头/.test(content)) return "touch";
  if (/吃|投喂|feed|饭|甜点|零食/.test(content)) return "feed";
  if (/玩|play|游戏|一起/.test(content)) return "play";
  if (/挥手|再见|hello|hi|你好|早|晚/.test(content)) return "wave";
  if (/夸|称赞|做得好|praise/.test(content)) return "praise";
  if (/靠近|过来|近一点|come closer|near/.test(content)) return "approach";
  if (/拍照|合影|照片|photo|picture/.test(content)) return "photo";
  if (/叫醒|醒醒|wake/.test(content)) return "wake";
  if (/害羞|脸红|shy|喜欢|可爱/.test(content)) return "shy";
  if (/休息|累|睡|困|rest/.test(content)) return "rest";
  if (/开心|高兴|happy|喜欢/.test(content)) return "happy";
  if (/难过|伤心|sad|哭/.test(content)) return "sad";
  if (/生气|angry|讨厌/.test(content)) return "angry";
  if (/惊|surprise|吓/.test(content)) return "surprised";
  return "idle";
}

function withPetActionContract(system) {
  return [
    system,
    "本次回复必须输出一个 JSON 对象，不要输出 Markdown，不要包裹代码块。",
    "JSON 结构：{\"reply\":\"角色对用户说的话\",\"petAction\":\"idle|touch|feed|play|wave|praise|approach|photo|shy|spin|rest|wake|happy|sad|angry|surprised\"}",
    "reply 仍然必须遵守角色口吻；petAction 只表达动作意图，不要写舞台描写。"
  ].join("\n\n");
}

function parseChatEnvelope(raw) {
  const text = String(raw || "").trim();
  if (!text) return { reply: "", petAction: "" };
  const candidate = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === "object") {
      return {
        reply: String(parsed.reply || parsed.content || parsed.message || "").trim() || text,
        petAction: normalizePetAction(parsed.petAction || parsed.action || parsed.motion)
      };
    }
  } catch {}
  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      return {
        reply: String(parsed.reply || parsed.content || parsed.message || "").trim() || text,
        petAction: normalizePetAction(parsed.petAction || parsed.action || parsed.motion)
      };
    } catch {}
  }
  return { reply: text, petAction: "" };
}

function normalizeRouteEffects(effects = {}) {
  return {
    affection: Math.max(-3, Math.min(3, Number(effects.affection) || 0)),
    trust: Math.max(-3, Math.min(3, Number(effects.trust) || 0)),
    intimacy: Math.max(-3, Math.min(3, Number(effects.intimacy) || 0)),
    tone: String(effects.tone || "").slice(0, 32)
  };
}

function fallbackRouteChoices(reply, character) {
  const name = character?.name || "角色";
  const text = String(reply || "");
  if (/日常|工作|家务|打扫|餐点|准备|忙|偷懒|期待|陪伴|主人|说话/.test(text)) {
    return [
      { text: `问问${name}今天最累的事`, effects: { affection: 0, trust: 2, intimacy: 0, tone: "daily-care" } },
      { text: "夸她已经做得很好了", effects: { affection: 2, trust: 1, intimacy: 1, tone: "praise" } },
      { text: "邀请她先休息一会儿", effects: { affection: 1, trust: 1, intimacy: 2, tone: "rest-together" } }
    ];
  }
  if (/一起|陪|去|来|看看|约/.test(text)) {
    return [
      { text: `答应${name}，立刻一起出发`, effects: { affection: 2, trust: 1, intimacy: 2, tone: "accept" } },
      { text: `故意逗${name}一下再答应`, effects: { affection: 2, trust: 0, intimacy: 1, tone: "tease" } },
      { text: "先问清真正的理由", effects: { affection: 0, trust: 2, intimacy: -1, tone: "cautious" } }
    ];
  }
  return [
    { text: `继续追问${name}刚才的想法`, effects: { affection: 0, trust: 2, intimacy: 0, tone: "follow-up" } },
    { text: "换一个轻松的话题缓和气氛", effects: { affection: 1, trust: 0, intimacy: 0, tone: "lighten" } },
    { text: `选择沉默片刻，看${name}怎么回应`, effects: { affection: 0, trust: 0, intimacy: 1, tone: "silence" } }
  ];
}

function sanitizeRouteChoices(rawChoices, reply, character) {
  const source = Array.isArray(rawChoices) && rawChoices.length ? rawChoices : fallbackRouteChoices(reply, character);
  return source
    .map((choice) => ({
      text: String(choice?.text || choice?.label || "").replace(/^【选择】/, "").trim(),
      effects: normalizeRouteEffects(choice?.effects || choice)
    }))
    .filter((choice) => choice.text.length >= 2)
    .slice(0, 3);
}

function parseRouteChoices(raw, reply, character) {
  const text = String(raw || "").trim();
  if (!text) return sanitizeRouteChoices([], reply, character);
  const candidate = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(candidate);
    return sanitizeRouteChoices(parsed.choices || parsed.routeChoices || parsed, reply, character);
  } catch {}
  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      return sanitizeRouteChoices(parsed.choices || parsed.routeChoices || parsed, reply, character);
    } catch {}
  }
  return sanitizeRouteChoices([], reply, character);
}

function stripVoiceStageDirections(text) {
  return String(text || "")
    .replace(/（[^（）]{1,140}）/g, "")
    .replace(/\([^()]{1,140}\)/g, "")
    .replace(/【[^【】]{1,80}】/g, "")
    .replace(/［[^［］]{1,80}］/g, "")
    .replace(/\[[^\[\]]{1,80}\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanVoiceScriptOutput(raw, fallback) {
  const text = String(raw || "")
    .replace(/^```(?:json|text)?/i, "")
    .replace(/```$/i, "")
    .replace(/^["“”「」『』]+|["“”「」『』]+$/g, "")
    .replace(/^(日语|日文|配音稿|voice script|script)\s*[:：]/i, "")
    .trim();
  const cleaned = stripVoiceStageDirections(text)
    .replace(/^["“”「」『』]+|["“”「」『』]+$/g, "")
    .trim();
  return cleaned || stripVoiceStageDirections(fallback);
}

async function callVoiceScriptAdapter({ provider, apiKey, baseUrl, model, character, routeState, text, emotion, targetLanguage, userAlias }) {
  const source = stripVoiceStageDirections(text).slice(0, 700);
  const alias = String(userAlias || routeState?.userAlias || "").trim();
  if (!source) return "";
  if (provider === "mock" || !provider) return source;
  const prompt = [
    "把下面这句中文角色台词改写成用于 TTS 的日语配音稿。",
    "目标不是正式翻译，而是视觉小说/动漫里自然会说出口的台词。要符合角色人设、关系路线和当前情绪。",
    "必须保留原台词的核心意思和信息量，不要擅自增加剧情，不要把语气翻得过度礼貌或新闻腔。",
    "删除括号里的动作、表情、舞台说明。不要输出括号、旁白、解释、说话人名字、Markdown 或序号。",
    "只输出一段日语台词。如果原文有轻微调侃、害羞、亲近感，日语也要保留这种二次元口语感。",
    `目标语言：${targetLanguage || "JP"}`,
    emotion ? `当前配音情绪：${emotion}` : "",
    routeState ? `当前隐藏路线：${routeState.route || "序章"}，路线模板：${routeState.templateLabel || routeState.template || "默认"}，上次选择：${routeState.lastChoice || "无"}` : "",
    alias ? `用户称呼：${alias}` : "",
    `原文：${source}`
  ].filter(Boolean).join("\n");
  const raw = await callChatAdapter({
    provider,
    apiKey,
    baseUrl,
    model,
    character,
    routeState,
    userAlias: alias,
    enablePetAction: false,
    messages: [{ role: "user", content: prompt }]
  });
  return cleanVoiceScriptOutput(raw, source).slice(0, 900);
}

async function callRouteChoiceAdapter({ provider, apiKey, baseUrl, model, character, routeState, reply, userAlias }) {
  const alias = String(userAlias || routeState?.userAlias || "").trim();
  if (provider === "mock" || !provider) return fallbackRouteChoices(reply, character);
  const prompt = [
    "你是 Galgame 攻略分支设计器。根据角色刚刚说的话，生成 3 个贴合语境的玩家回应选项。",
    "必须贴合台词，不要只按关键词套模板。不要生成与当前情绪相反的道歉/冲突选项，除非角色真的生气或冲突。",
    "先在心里判断当前是日常、邀请、脆弱、冲突、暧昧还是普通推进。三个选项必须围绕同一场景，不要突然跳到无关活动。",
    "日常陪伴场景优先给关心、夸奖、陪伴、休息类选项；暧昧场景可以轻微靠近，但不要油腻；脆弱场景避免调侃过头。",
    "选项要像玩家在攻略路线里会点的回应，短、具体、能改变关系，而不是泛泛的“继续聊”。",
    "输出 JSON，不要 Markdown。格式：{\"choices\":[{\"text\":\"选项文本\",\"effects\":{\"affection\":0,\"trust\":0,\"intimacy\":0,\"tone\":\"标签\"}}]}",
    "effects 每项只能是 -3 到 3。text 不要带数字序号，不要带【选择】。",
    `角色：${character?.name || "角色"}`,
    character?.work ? `作品：${character.work}` : "",
    alias ? `用户称呼：${alias}` : "",
    routeState ? `当前隐藏路线：${routeState.route || "序章"}，上次选择：${routeState.lastChoice || "无"}` : "",
    routeState?.templateHint ? `路线模板要求：${routeState.templateHint}` : "",
    `角色刚刚说：${String(reply || "").slice(0, 500)}`
  ].filter(Boolean).join("\n");
  const raw = await callChatAdapter({
    provider,
    apiKey,
    baseUrl,
    model,
    character,
    routeState,
    userAlias: alias,
    enablePetAction: false,
    messages: [{ role: "user", content: prompt }]
  });
  return parseRouteChoices(raw, reply, character);
}

async function callChatAdapter({ provider, apiKey, baseUrl, model, messages, character, enablePetAction = false, routeState = null, userAlias = "" }) {
  const system = enablePetAction
    ? withPetActionContract(await buildSystemPrompt(character, routeState, userAlias))
    : await buildSystemPrompt(character, routeState, userAlias);
  if (provider === "mock" || !provider) {
    const last = String(messages.at(-1)?.content || "").trim();
    const name = character?.name || "角色";
    const alias = String(userAlias || routeState?.userAlias || "你").trim() || "你";
    let previewLine = `${alias}，我在。现在先让我用演示模式陪你走完这一段。`;

    if (/介绍|自我介绍|你是谁|第一次见|初次见面/.test(last)) {
      previewLine = `初次见面就问得这么认真吗？我是 ${name}。先让我用演示模式和你打个招呼，等你接上模型之后，我再认真继续。`;
    } else if (/心情|开心|难过|紧张|状态/.test(last)) {
      previewLine = `要先说心情的话……我现在更像是在等你把这段对话真正启动。演示模式会先保留气氛，正式回复要在接入模型之后。`;
    } else if (/陪我|一起|去|约会|聊天|日常/.test(last)) {
      previewLine = `好啊，先从这句开始也不错。现在这还是演示模式下的预览回复，不过聊天节奏、桌宠动作和界面反馈都已经会跟上。`;
    } else if (last) {
      previewLine = `我听见了，“${last.slice(0, 28)}${last.length > 28 ? "…" : ""}”。这句先用演示模式陪你过一遍，等模型接好之后，${name} 的完整状态就会接上来。`;
    }

    const route = routeState?.route ? `当前路线：${routeState.route}` : "";
    const reply = [
      previewLine,
      "演示模式：你现在体验到的是流程、气氛和互动反馈；连接模型后会切换成真实角色回复。",
      route
    ].filter(Boolean).join("\n\n");
    return enablePetAction ? JSON.stringify({ reply, petAction: inferPetAction(last) }) : reply;
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
    if (!response.ok) throw new Error(data.error?.message || data.error || data.message || `Chat API failed: ${response.status}`);
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

async function callTtsAdapter({ provider, apiKey, baseUrl, text, voice, model, language, autoTranslate, deviceId, emotion }) {
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
      language: language || model || "JP",
      emotion
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
        emotion: acgnEmotionCode(emotion)
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
        voice_settings: elevenVoiceSettings(emotion)
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
        "Keep the delivery emotionally expressive, clear, and characterful.",
        ttsEmotionInstruction(emotion)
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
      const work = String(url.searchParams.get("work") || "").trim();
      if (!name) {
        json(res, 400, { error: "角色名不能为空" });
        return;
      }
      json(res, 200, await fetchMoegirlImageCandidates(name, work));
    } catch (error) {
      json(res, 500, { error: error.message, candidates: [] });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/characters") {
    const characters = await readJson(CHARACTER_FILE, []);
    json(res, 200, characters.map((character) => ({
      ...character,
      storyBible: character.storyBible || storyBibleDraft(character)
    })));
    return;
  }

  if (req.method === "POST" && pathname === "/api/backgrounds") {
    try {
      const body = await readBody(req);
      const name = displayAssetName(body.name);
      const url = await saveDataUrlAsset(body.dataUrl, `galgame-bg-${name}`);
      if (!url) {
        json(res, 400, { error: "没有收到可保存的背景图片" });
        return;
      }
      json(res, 201, {
        background: {
          id: crypto.createHash("sha1").update(url).digest("hex").slice(0, 10),
          name,
          url,
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      json(res, 400, { error: error.message });
    }
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

  const updateCharacterMatch = pathname.match(/^\/api\/characters\/([^/]+)$/);
  if (req.method === "PATCH" && updateCharacterMatch) {
    try {
      const id = decodeURIComponent(updateCharacterMatch[1]);
      const body = await readBody(req);
      const characters = await readJson(CHARACTER_FILE, []);
      const index = characters.findIndex((item) => item.id === id);
      if (index < 0) {
        json(res, 404, { error: "Character not found" });
        return;
      }
      const current = characters[index];
      const nextCharacter = {
        ...current,
        storyBible: normalizeStoryBible(body.storyBible ?? current.storyBible, current),
        updatedAt: new Date().toISOString()
      };
      characters[index] = nextCharacter;
      await writeJson(CHARACTER_FILE, characters);
      json(res, 200, nextCharacter);
    } catch (error) {
      json(res, 400, { error: error.message });
    }
    return;
  }

  const storyBibleDraftMatch = pathname.match(/^\/api\/characters\/([^/]+)\/story-bible\/draft$/);
  if (req.method === "POST" && storyBibleDraftMatch) {
    try {
      const id = decodeURIComponent(storyBibleDraftMatch[1]);
      const characters = await readJson(CHARACTER_FILE, []);
      const character = characters.find((item) => item.id === id);
      if (!character) {
        json(res, 404, { error: "Character not found" });
        return;
      }
      json(res, 200, { storyBible: storyBibleDraft(character) });
    } catch (error) {
      json(res, 400, { error: error.message });
    }
    return;
  }

  const reprocessPetMatch = pathname.match(/^\/api\/characters\/([^/]+)\/reprocess-pet$/);
  if (req.method === "POST" && reprocessPetMatch) {
    try {
      const id = decodeURIComponent(reprocessPetMatch[1]);
      const characters = await readJson(CHARACTER_FILE, []);
      const index = characters.findIndex((item) => item.id === id);
      if (index < 0) {
        json(res, 404, { error: "Character not found" });
        return;
      }
      const character = characters[index];
      const petLooksProcessed = /-cutout\.png(?:[?#].*)?$/i.test(character.petImageUrl || "");
      const source = petLooksProcessed && character.imageUrl
        ? character.imageUrl
        : character.petImageUrl || character.imageUrl;
      if (!source) {
        json(res, 400, { error: "当前角色没有可处理的桌宠图" });
        return;
      }
      const petImageUrl = await saveStandeeImageAsset(source, `${id}-pet-reprocess`);
      const nextCharacter = {
        ...character,
        petImageUrl,
        petStyle: character.petStyle === "live2d" ? "standee" : (character.petStyle || "standee"),
        updatedAt: new Date().toISOString()
      };
      characters[index] = nextCharacter;
      await writeJson(CHARACTER_FILE, characters);
      json(res, 200, nextCharacter);
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
      const rawReply = await callChatAdapter({ ...body, character, enablePetAction: Boolean(body.enablePetAction) });
      const parsed = body.enablePetAction ? parseChatEnvelope(rawReply) : { reply: rawReply, petAction: "" };
      const reply = parsed.reply || rawReply;
      const requestedAction = normalizePetAction(parsed.petAction);
      const petAction = body.enablePetAction
        ? (requestedAction && requestedAction !== "idle" ? requestedAction : inferPetAction(`${(body.messages || []).at(-1)?.content || ""}\n${reply}`))
        : "";
      const routeChoices = body.requestRouteChoices
        ? await callRouteChoiceAdapter({ ...body, character, reply, routeState: body.routeState || null })
        : [];
      const sessions = await readJson(SESSION_FILE, {});
      const sessionId = body.sessionId || `${character.id}-${Date.now()}`;
      const history = sessions[sessionId] || [];
      sessions[sessionId] = [
        ...history,
        ...(body.messages || []).slice(-1),
        { role: "assistant", content: reply, petAction, routeState: body.routeState || null, routeChoices, at: new Date().toISOString() }
      ];
      await writeJson(SESSION_FILE, sessions);
      json(res, 200, { reply, petAction, sessionId, routeState: body.routeState || null, routeChoices });
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

  if (req.method === "POST" && pathname === "/api/voice-script") {
    try {
      const body = await readBody(req);
      const characters = await readJson(CHARACTER_FILE, []);
      const character = characters.find((item) => item.id === body.characterId) || characters[0];
      const text = await callVoiceScriptAdapter({ ...body, character, routeState: body.routeState || null });
      json(res, 200, { text });
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
