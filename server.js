import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const DATA_DIR = path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "assets", "uploads");
const CHARACTER_FILE = path.join(DATA_DIR, "characters.json");
const SESSION_FILE = path.join(DATA_DIR, "sessions.json");
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
  ".webp": "image/webp"
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
  const badTerms = /(logo|banner|bg|background|wallpaper|icon|头像|表情|stamp|封面|海报|截图|screenshot|watermark|cd|bd|dvd)/i;
  let score = 0;

  if (kind === "chibi") {
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
  if (badTerms.test(text)) score -= 120;
  return score;
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

async function fetchMoegirlImages(name) {
  const page = await fetchMoegirlPage(name);
  const pageImages = await fetchMoegirlPageImages(page?.title);
  const pick = (kind) => pageImages
    .map((item) => ({ item, score: scoreImageCandidate(item, kind) }))
    .sort((a, b) => b.score - a.score)[0];
  const standee = pick("standee");
  const chibi = pick("chibi");
  const standeeInfo = standee?.score > 35 ? standee.item.imageinfo?.[0] : null;
  const chibiInfo = chibi?.score > 65 ? chibi.item.imageinfo?.[0] : null;
  const avatarUrl = page?.thumbnail?.source || "";
  const fullBodyUrl = standeeInfo?.thumburl || standeeInfo?.url || "";
  const chibiUrl = chibiInfo?.thumburl || chibiInfo?.url || "";

  return {
    avatarUrl,
    fullBodyUrl,
    chibiUrl,
    imageUrl: fullBodyUrl || avatarUrl,
    sourceUrl: page?.fullurl || (page?.title ? `https://zh.moegirl.org.cn/${encodeURIComponent(page.title)}` : "")
  };
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
  const makePet = body.makePet !== false;
  const useChibiPet = body.useChibiPet === true;
  const fetchedAvatarUrl = useFetchedImage ? imageValue.avatarUrl || "" : "";
  const fetchedFullBodyUrl = useFetchedImage ? imageValue.fullBodyUrl || "" : "";
  const fetchedChibiUrl = useFetchedImage ? imageValue.chibiUrl || "" : "";
  const avatarSourceUrl = body.avatarUrl || fetchedAvatarUrl || "";
  const avatarUrl = avatarSourceUrl
    ? await saveRemoteImageAsset(avatarSourceUrl, `${id}-avatar`)
    : makeFallbackPortrait(name, body.accent);
  const cardSourceUrl = body.imageUrl || uploadedImageUrl || fetchedFullBodyUrl || "";
  const cardImageUrl = cardSourceUrl
    ? await saveStandeeImageAsset(cardSourceUrl, `${id}-standee`)
    : makeFallbackPortrait(name, body.accent);
  const petSourceUrl = makePet
    ? (useChibiPet
      ? (body.petImageUrl || uploadedPetUrl || fetchedChibiUrl || "")
      : (body.petImageUrl || uploadedPetUrl || cardSourceUrl || ""))
    : "";
  const petImageUrl = petSourceUrl ? await saveStandeeImageAsset(petSourceUrl, `${id}-pet`) : "";
  const existing = await readJson(CHARACTER_FILE, []);
  const character = {
    id,
    name,
    work,
    subtitle: body.subtitle || `${work || "自定义作品"} 角色`,
    avatarUrl,
    imageUrl: cardImageUrl,
    petImageUrl,
    petStyle: useChibiPet && petImageUrl ? "chibi" : "standee",
    accent: body.accent || pickAccent(name),
    tags: body.tags || ["CSP", "新建角色"],
    sourceUrl: imageValue.sourceUrl || cspValue.records?.find((item) => item.url)?.url || "",
    prompt: makePrompt({ name, work, userNotes, csp: cspValue }),
    csp: cspValue,
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

async function routeApi(req, res, pathname) {
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
