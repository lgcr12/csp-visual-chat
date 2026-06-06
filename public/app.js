const state = {
  characters: [],
  current: null,
  candidates: [],
  candidateQuery: "",
  messages: [],
  sessionId: null,
  pet: {
    x: 0,
    y: 0,
    lastSpeech: "",
    suppressClick: false
  }
};

const $ = (selector) => document.querySelector(selector);
const els = {
  modal: $("#characterModal"),
  grid: $("#characterGrid"),
  messages: $("#messages"),
  input: $("#messageInput"),
  composer: $("#composer"),
  provider: $("#provider"),
  baseUrl: $("#baseUrl"),
  model: $("#model"),
  apiKey: $("#apiKey"),
  createForm: $("#createForm"),
  createStatus: $("#createStatus"),
  fetchCandidates: $("#fetchCandidates"),
  candidateStatus: $("#candidateStatus"),
  candidateGrid: $("#candidateGrid"),
  search: $("#characterSearch"),
  activeAvatar: $("#activeAvatar"),
  imageUpload: $("#imageUpload"),
  petUpload: $("#petUpload"),
  petEmpty: $("#petEmpty"),
  petActor: $("#petActor"),
  petAvatar: $("#petAvatar"),
  petBubble: $("#petBubble"),
  petToolbar: $("#petToolbar"),
  live2dStage: $("#live2dStage"),
  live2dStatus: $("#live2dStatus")
};

const SETTINGS_KEY = "csp-visual-chat-settings";
const LIVE2D_SCRIPTS = [
  "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js",
  "https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js",
  "https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.js"
];

const interactionLines = {
  "chihaya-anon": {
    touch: "诶，不是啦，突然摸头也太犯规了吧。算了，今天就允许一下。",
    feed: "这个看起来还不错欸。等一下，拍一下发 SNS 感觉也可以。",
    play: "玩耍？这个说法好像有点小学生，不过企划感还不错。",
    rest: "休息一下也行啦。一直绷着的话，又会变得很难看。"
  },
  "takamatsu-tomori": {
    touch: "嗯……有点突然。不过，不讨厌。",
    feed: "谢谢。我会慢慢吃的。",
    play: "如果是一起的话……我想试试看。",
    rest: "嗯。安静一会儿，也可以。"
  },
  "togawa-sakiko": {
    touch: "请不要突然这样。至少，也该先说明理由。",
    feed: "多谢。您的心意我收下了。",
    play: "若这是必要的排练安排，我会配合。",
    rest: "休息是为了维持之后的状态，并非懈怠。"
  },
  default: {
    touch: "这样有点突然，不过我知道了。",
    feed: "谢谢，我收下了。",
    play: "可以，一起试试看。",
    rest: "那就稍微休息一下。"
  }
};

function getInteractionLines(character) {
  if (!character) return interactionLines.default;
  if (interactionLines[character.id]) return interactionLines[character.id];
  if (character.name?.includes("爱音")) return interactionLines["chihaya-anon"];
  if (character.name?.includes("灯")) return interactionLines["takamatsu-tomori"];
  if (character.name?.includes("祥子")) return interactionLines["togawa-sakiko"];
  return interactionLines.default;
}

function loadSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    els.provider.value = settings.provider || "mock";
    els.baseUrl.value = settings.baseUrl || "";
    els.model.value = settings.model || "";
    els.apiKey.value = settings.apiKey || "";
  } catch {
    localStorage.removeItem(SETTINGS_KEY);
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    provider: els.provider.value,
    baseUrl: els.baseUrl.value.trim(),
    model: els.model.value.trim(),
    apiKey: els.apiKey.value.trim()
  }));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

function isGeneratedFallback(url) {
  return String(url || "").startsWith("data:image/svg+xml");
}

function imageFor(character) {
  if (character?.imageUrl && !isGeneratedFallback(character.imageUrl)) return character.imageUrl;
  return character?.petImageUrl || character?.avatarUrl || character?.imageUrl || fallbackPortrait(character?.name, character?.accent);
}

function avatarFor(character) {
  if (character?.avatarUrl) return character.avatarUrl;
  if (character?.imageUrl && !isGeneratedFallback(character.imageUrl)) return character.imageUrl;
  return fallbackPortrait(character?.name, character?.accent);
}

function petImageFor(character) {
  return character?.petImageUrl || "";
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CSS.escape(src)}"]`);
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }
    const script = existing || document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`加载失败：${src}`));
    if (!existing) document.head.appendChild(script);
  });
}

async function ensureLive2DLibs() {
  if (window.PIXI && window.PIXI.live2d?.Live2DModel) return true;
  for (const src of LIVE2D_SCRIPTS) await loadScript(src);
  return Boolean(window.PIXI && window.PIXI.live2d?.Live2DModel);
}

async function renderLive2D(character) {
  els.live2dStage.innerHTML = `<strong>Live2D</strong><span id="live2dStatus">正在加载模型...</span>`;
  els.live2dStatus = $("#live2dStatus");
  const modelUrl = String(character.live2dModelUrl || "").trim();
  if (!modelUrl) {
    els.live2dStatus.textContent = "需要填写 model3.json 地址";
    return;
  }

  try {
    const ok = await ensureLive2DLibs();
    if (!ok) throw new Error("Live2D 运行库不可用");

    const app = new PIXI.Application({
      width: Math.max(260, els.live2dStage.clientWidth),
      height: Math.max(360, els.live2dStage.clientHeight),
      transparent: true,
      autoDensity: true
    });
    els.live2dStage.innerHTML = "";
    els.live2dStage.appendChild(app.view);

    const model = await PIXI.live2d.Live2DModel.from(modelUrl);
    app.stage.addChild(model);
    const scale = Math.min(app.view.width / model.width, app.view.height / model.height) * 0.9;
    model.scale.set(scale);
    model.x = (app.view.width - model.width * scale) / 2;
    model.y = app.view.height - model.height * scale;
    state.live2d = { app, model };
  } catch (error) {
    els.live2dStage.innerHTML = `<strong>Live2D</strong><span id="live2dStatus">${escapeHtml(error.message)}，已保留模型绑定</span>`;
    els.live2dStatus = $("#live2dStatus");
    state.live2d = null;
  }
}

function applyCharacter(character) {
  if (!character) {
    clearCharacter();
    return;
  }

  state.current = character;
  state.messages = [];
  state.sessionId = null;
  state.pet.lastSpeech = "";
  state.pet.x = 0;
  state.pet.y = 0;

  const imageUrl = imageFor(character);
  const avatarUrl = avatarFor(character);
  const petImageUrl = petImageFor(character);

  document.documentElement.style.setProperty("--accent", character.accent || "#7aa8ff");
  $("#currentThumb").onerror = () => { $("#currentThumb").src = fallbackPortrait(character.name, character.accent); };
  $("#currentThumb").src = avatarUrl;
  els.activeAvatar.onerror = () => { els.activeAvatar.src = fallbackPortrait(character.name, character.accent); };
  els.activeAvatar.src = avatarUrl;
  $("#currentName").textContent = character.name;
  $("#currentWork").textContent = character.work || "自定义角色";
  $("#chatTitle").textContent = `与 ${character.name} 对话`;
  $("#sheetWork").textContent = character.work || "自定义角色";
  $("#sheetName").textContent = character.name;
  $("#sheetSubtitle").textContent = character.subtitle || "CSP 角色";
  $("#sourceLink").href = character.sourceUrl || "#";
  $("#sourceLink").style.display = character.sourceUrl ? "inline" : "none";
  $("#sheetTags").innerHTML = (character.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");

  els.petActor.style.setProperty("--pet-x", "0px");
  els.petActor.style.setProperty("--pet-y", "0px");
  els.live2dStage.style.setProperty("--pet-x", "0px");
  els.live2dStage.style.setProperty("--pet-y", "0px");
  els.petToolbar.hidden = true;
  els.petBubble.hidden = true;
  state.live2d?.app?.destroy?.(true);
  state.live2d = null;

  if (character.petStyle === "live2d") {
    els.petEmpty.hidden = true;
    els.petActor.hidden = true;
    els.live2dStage.hidden = false;
    renderLive2D(character);
  } else if (petImageUrl) {
    els.petEmpty.hidden = true;
    els.live2dStage.hidden = true;
    els.petActor.hidden = false;
    els.petActor.classList.toggle("chibi-pet", character.petStyle === "chibi");
    els.petAvatar.classList.toggle("opaque-pet", /\.(jpe?g|webp)(?:[?#].*)?$/i.test(petImageUrl));
    els.petAvatar.onerror = () => {
      els.petActor.hidden = true;
      els.petEmpty.hidden = false;
    };
    els.petAvatar.src = petImageUrl;
  } else {
    els.live2dStage.hidden = true;
    els.petActor.classList.remove("chibi-pet");
    els.petAvatar.classList.remove("opaque-pet");
    els.petActor.hidden = true;
    els.petEmpty.hidden = false;
  }

  renderMessages();
}

function clearCharacter() {
  state.current = null;
  state.messages = [];
  state.sessionId = null;
  state.pet.lastSpeech = "";
  $("#currentThumb").removeAttribute("src");
  els.activeAvatar.removeAttribute("src");
  $("#currentName").textContent = "选择角色";
  $("#currentWork").textContent = "新建或选择一个聊天对象";
  $("#chatTitle").textContent = "请选择聊天对象";
  $("#sheetWork").textContent = "";
  $("#sheetName").textContent = "未选择";
  $("#sheetSubtitle").textContent = "角色库为空，请新建角色开始。";
  $("#sheetTags").innerHTML = "";
  $("#sourceLink").style.display = "none";
  els.petEmpty.hidden = true;
  els.petActor.hidden = true;
  els.live2dStage.hidden = true;
  state.live2d?.app?.destroy?.(true);
  state.live2d = null;
  els.petBubble.hidden = true;
  els.petToolbar.hidden = true;
  renderMessages();
}

function renderCharacters() {
  const keyword = els.search.value.trim().toLowerCase();
  const items = state.characters.filter((item) => {
    const text = `${item.name} ${item.work} ${item.subtitle}`.toLowerCase();
    return !keyword || text.includes(keyword);
  });

  els.grid.innerHTML = items.map((item) => `
    <article class="character-card ${state.current?.id === item.id ? "active" : ""}" data-id="${escapeAttr(item.id)}">
      <button class="character-pick" type="button" data-action="pick" data-id="${escapeAttr(item.id)}">
        <img src="${escapeAttr(imageFor(item))}" alt="${escapeAttr(item.name)}" loading="lazy" />
      </button>
      <button class="delete-card" type="button" data-action="delete" data-id="${escapeAttr(item.id)}" aria-label="删除 ${escapeAttr(item.name)}">删除</button>
      <div class="character-card-copy">
        <b>${escapeHtml(item.name)}</b>
        <small>${escapeHtml(item.work || "自定义角色")}</small>
      </div>
    </article>
  `).join("");
}

function candidateKindLabel(kind) {
  return {
    avatar: "头像",
    standee: "立绘",
    chibi: "Q版"
  }[kind] || "候选";
}

function renderCandidateGrid(candidates) {
  if (!candidates.length) {
    els.candidateGrid.hidden = true;
    els.candidateGrid.innerHTML = "";
    return;
  }

  els.candidateGrid.hidden = false;
  els.candidateGrid.innerHTML = candidates.map((item, index) => `
    <article class="candidate-card">
      <img src="${escapeAttr(item.thumbUrl || item.url)}" alt="${escapeAttr(item.title)}" loading="lazy" />
      <div class="candidate-copy">
        <b>${candidateKindLabel(item.best)}</b>
        <small>${escapeHtml(item.width && item.height ? `${item.width}x${item.height}` : item.title)}</small>
      </div>
      <div class="candidate-actions">
        <button type="button" data-candidate="${index}" data-target-field="avatarUrl">头像</button>
        <button type="button" data-candidate="${index}" data-target-field="imageUrl">角色卡</button>
        <button type="button" data-candidate="${index}" data-target-field="petImageUrl">桌宠</button>
      </div>
    </article>
  `).join("");
}

async function fetchImageCandidates() {
  const name = els.createForm.elements.name.value.trim();
  if (!name) {
    els.candidateStatus.textContent = "先填写角色名";
    return;
  }
  if (state.candidateQuery === name && state.candidates.length) return;

  els.fetchCandidates.disabled = true;
  els.candidateStatus.textContent = "正在抓取候选图...";
  try {
    const result = await api(`/api/image-candidates?name=${encodeURIComponent(name)}`);
    if (els.createForm.elements.name.value.trim() !== name) return;
    state.candidates = result.candidates || [];
    state.candidateQuery = name;
    renderCandidateGrid(state.candidates);
    els.candidateStatus.textContent = state.candidates.length ? `已抓取 ${state.candidates.length} 张` : "没有找到候选图";
  } catch (error) {
    els.candidateStatus.textContent = `抓取失败：${error.message}`;
  } finally {
    els.fetchCandidates.disabled = false;
  }
}

let candidateTimer = null;
function scheduleCandidateFetch() {
  clearTimeout(candidateTimer);
  const name = els.createForm.elements.name.value.trim();
  if (name.length < 2) {
    els.candidateStatus.textContent = "";
    return;
  }
  if (state.candidateQuery === name) return;
  els.candidateStatus.textContent = "将自动抓取候选图...";
  candidateTimer = setTimeout(fetchImageCandidates, 900);
}

function renderMessages() {
  if (!state.messages.length) {
    els.messages.innerHTML = `<div class="empty-state">还没有对话。</div>`;
    return;
  }
  els.messages.innerHTML = state.messages.map((message) => (
    `<div class="bubble ${message.role}">${escapeHtml(message.content)}</div>`
  )).join("");
  els.messages.scrollTop = els.messages.scrollHeight;

  const latestAssistant = [...state.messages].reverse().find((message) => message.role === "assistant");
  if (latestAssistant?.content && latestAssistant.content !== "..." && latestAssistant.content !== state.pet.lastSpeech) {
    state.pet.lastSpeech = latestAssistant.content;
    petSpeak(latestAssistant.content, 7000);
  }
}

async function loadCharacters() {
  state.characters = await api("/api/characters");
  renderCharacters();
  applyCharacter(state.characters[0]);
}

async function deleteCharacter(id) {
  const character = state.characters.find((item) => item.id === id);
  if (!character) return;
  if (!confirm(`删除角色「${character.name}」？此操作会同时清理对应会话。`)) return;

  const result = await api(`/api/characters/${encodeURIComponent(id)}`, { method: "DELETE" });
  state.characters = result.characters || [];
  if (state.current?.id === id) applyCharacter(state.characters[0]);
  renderCharacters();
}

async function sendMessage(content) {
  if (!state.current) return;
  const userMessage = { role: "user", content };
  state.messages.push(userMessage);
  renderMessages();
  els.input.value = "";
  autosize();

  const pending = { role: "assistant", content: "..." };
  state.messages.push(pending);
  renderMessages();

  try {
    const result = await api("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        characterId: state.current.id,
        sessionId: state.sessionId,
        provider: els.provider.value,
        baseUrl: els.baseUrl.value.trim(),
        model: els.model.value.trim(),
        apiKey: els.apiKey.value.trim(),
        messages: state.messages.filter((item) => item.content !== "...").map(({ role, content }) => ({ role, content }))
      })
    });
    state.sessionId = result.sessionId;
    pending.content = result.reply;
  } catch (error) {
    pending.content = `调用失败：${error.message}`;
  }
  renderMessages();
}

function autosize() {
  els.input.style.height = "auto";
  els.input.style.height = `${Math.min(160, Math.max(48, els.input.scrollHeight))}px`;
}

function petSpeak(text, duration = 3600) {
  if (els.petActor.hidden && els.live2dStage.hidden) return;
  const content = String(text || "").trim();
  if (!content) return;
  els.petBubble.textContent = content.length > 90 ? `${content.slice(0, 90)}...` : content;
  els.petBubble.hidden = false;
  clearTimeout(petSpeak.timer);
  petSpeak.timer = setTimeout(() => {
    els.petBubble.hidden = true;
  }, duration);
}

function playPetMotion(name) {
  const target = els.petActor.hidden ? els.live2dStage : els.petActor;
  if (target.hidden) return;
  target.dataset.motion = name;
  clearTimeout(playPetMotion.timer);
  playPetMotion.timer = setTimeout(() => {
    delete target.dataset.motion;
  }, 900);
}

async function handlePetAction(action) {
  if (!state.current) return;
  const motion = {
    touch: "happy",
    feed: "feed",
    play: "jump",
    rest: "rest"
  }[action] || "happy";

  playPetMotion(motion);

  if (els.provider.value === "mock") {
    const idLines = getInteractionLines(state.current);
    petSpeak(idLines[action] || idLines.touch);
    return;
  }

  try {
    const result = await api("/api/pet-action", {
      method: "POST",
      body: JSON.stringify({
        characterId: state.current.id,
        action,
        provider: els.provider.value,
        baseUrl: els.baseUrl.value.trim(),
        model: els.model.value.trim(),
        apiKey: els.apiKey.value.trim()
      })
    });
    petSpeak(result.reply);
  } catch (error) {
    petSpeak(`互动失败：${error.message}`);
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function fallbackPortrait(name, accent = "#7aa8ff") {
  const initial = encodeURIComponent([...String(name || "C")][0] || "C");
  const color = encodeURIComponent(accent || "#7aa8ff");
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 900'><defs><radialGradient id='halo' cx='.5' cy='.22' r='.5'><stop stop-color='${color}' stop-opacity='.95'/><stop offset='.62' stop-color='${color}' stop-opacity='.32'/><stop offset='1' stop-color='${color}' stop-opacity='0'/></radialGradient><linearGradient id='body' x1='0' y1='0' x2='1' y2='1'><stop stop-color='%23ffffff' stop-opacity='.24'/><stop offset='1' stop-color='${color}' stop-opacity='.5'/></linearGradient></defs><ellipse cx='320' cy='815' rx='158' ry='32' fill='%23000000' fill-opacity='.28'/><path d='M166 820c22-276 70-434 154-434s132 158 154 434z' fill='url(%23body)'/><circle cx='320' cy='245' r='170' fill='url(%23halo)'/><text x='320' y='294' text-anchor='middle' font-size='92' font-family='Arial, sans-serif' font-weight='800' fill='white'>${initial}</text></svg>`;
}

$("#openCharacterModal").addEventListener("click", () => els.modal.showModal());
$("#closeCharacterModal").addEventListener("click", () => els.modal.close());
$("#showCreate").addEventListener("click", () => els.createForm.querySelector("input").focus());
els.search.addEventListener("input", renderCharacters);
els.createForm.elements.name.addEventListener("input", scheduleCandidateFetch);

[els.provider, els.baseUrl, els.model, els.apiKey].forEach((input) => {
  input.addEventListener("change", saveSettings);
  input.addEventListener("input", saveSettings);
});

els.petToolbar.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pet-action]");
  if (button) handlePetAction(button.dataset.petAction);
});

function handlePetClick(target) {
  if (state.pet.suppressClick) {
    state.pet.suppressClick = false;
    return;
  }
  if (!state.current || target.hidden) return;
  els.petToolbar.hidden = !els.petToolbar.hidden;
  playPetMotion("happy");
}

function handlePetKeydown(event, target) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    handlePetClick(target);
  }
}

let dragState = null;
function startPetDrag(event, target) {
  if (!state.current || target.hidden || event.button !== 0) return;
  dragState = {
    pointerId: event.pointerId,
    target,
    startX: event.clientX,
    startY: event.clientY,
    originX: state.pet.x,
    originY: state.pet.y,
    moved: false
  };
  target.setPointerCapture(event.pointerId);
  target.dataset.dragging = "true";
}

function movePetDrag(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  const dx = event.clientX - dragState.startX;
  const dy = event.clientY - dragState.startY;
  if (Math.abs(dx) + Math.abs(dy) > 6) dragState.moved = true;
  state.pet.x = dragState.originX + dx;
  state.pet.y = dragState.originY + dy;
  dragState.target.style.setProperty("--pet-x", `${state.pet.x}px`);
  dragState.target.style.setProperty("--pet-y", `${state.pet.y}px`);
}

function endPetDrag(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  dragState.target.releasePointerCapture(event.pointerId);
  delete dragState.target.dataset.dragging;
  if (dragState.moved) {
    event.preventDefault();
    state.pet.suppressClick = true;
    playPetMotion("land");
  }
  dragState = null;
}

function bindPetInteractions(target) {
  target.addEventListener("click", () => handlePetClick(target));
  target.addEventListener("keydown", (event) => handlePetKeydown(event, target));
  target.addEventListener("pointerdown", (event) => startPetDrag(event, target));
  target.addEventListener("pointermove", movePetDrag);
  target.addEventListener("pointerup", endPetDrag);
  target.addEventListener("pointercancel", endPetDrag);
}

bindPetInteractions(els.petActor);
bindPetInteractions(els.live2dStage);

els.grid.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  if (!action) return;
  const id = action.dataset.id;
  if (action.dataset.action === "delete") {
    deleteCharacter(id);
    return;
  }
  if (action.dataset.action === "pick") {
    const character = state.characters.find((item) => item.id === id);
    if (!character) return;
    applyCharacter(character);
    els.modal.close();
  }
});

els.composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const content = els.input.value.trim();
  if (content) sendMessage(content);
});

els.input.addEventListener("input", autosize);
els.input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    els.composer.requestSubmit();
  }
});

$("#resetChat").addEventListener("click", () => {
  state.messages = [];
  state.sessionId = null;
  renderMessages();
});

els.fetchCandidates.addEventListener("click", fetchImageCandidates);

els.candidateGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-candidate][data-target-field]");
  if (!button) return;
  const candidate = state.candidates[Number(button.dataset.candidate)];
  const field = els.createForm.elements[button.dataset.targetField];
  if (!candidate || !field) return;
  field.value = candidate.url;
  if (button.dataset.targetField === "petImageUrl") {
    const mode = candidate.best === "chibi" ? "chibi" : "standee";
    const modeInput = els.createForm.querySelector(`input[name="petStyle"][value="${mode}"]`);
    if (modeInput) modeInput.checked = true;
  }
  els.candidateStatus.textContent = `已设置${button.textContent}图`;
});

els.createForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(els.createForm);
  const payload = Object.fromEntries(form.entries());
  payload.useFetchedImage = form.get("useFetchedImage") === "on";
  payload.petStyle = form.get("petStyle") || "standee";
  payload.makePet = payload.petStyle !== "live2d";
  payload.useChibiPet = payload.petStyle === "chibi";
  payload.uploadedImageData = await readFileAsDataUrl(els.imageUpload.files?.[0]);
  payload.uploadedPetData = await readFileAsDataUrl(els.petUpload.files?.[0]);

  const submitButton = els.createForm.querySelector('button[type="submit"]');
  els.createStatus.textContent = "正在调用 CSP 生成角色卡...";
  submitButton.disabled = true;
  try {
    const character = await api("/api/characters", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    state.characters = [character, ...state.characters.filter((item) => item.id !== character.id)];
    renderCharacters();
    applyCharacter(character);
    els.createForm.reset();
    state.candidates = [];
    state.candidateQuery = "";
    renderCandidateGrid([]);
    els.candidateStatus.textContent = "";
    els.createStatus.textContent = "角色卡已生成。";
    setTimeout(() => els.modal.close(), 350);
  } catch (error) {
    els.createStatus.textContent = `生成失败：${error.message}`;
  } finally {
    submitButton.disabled = false;
  }
});

loadSettings();
loadCharacters().catch((error) => {
  els.messages.innerHTML = `<div class="empty-state">加载失败：${escapeHtml(error.message)}</div>`;
});
