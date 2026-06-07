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
  },
  voiceEnabled: false
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
  voiceProvider: $("#voiceProvider"),
  voiceBaseUrl: $("#voiceBaseUrl"),
  voiceModel: $("#voiceModel"),
  voiceId: $("#voiceId"),
  voiceSearch: $("#voiceSearch"),
  acgnVoiceResults: $("#acgnVoiceResults"),
  acgnVoiceSelect: $("#acgnVoiceSelect"),
  voiceAutoTranslate: $("#voiceAutoTranslate"),
  voiceProviderHint: $("#voiceProviderHint"),
  voiceKey: $("#voiceKey"),
  checkAcgnQuota: $("#checkAcgnQuota"),
  acgnQuotaStatus: $("#acgnQuotaStatus"),
  openOnboarding: $("#openOnboarding"),
  onboardingModal: $("#onboardingModal"),
  closeOnboarding: $("#closeOnboarding"),
  finishOnboarding: $("#finishOnboarding"),
  voiceToggle: $("#voiceToggle"),
  voiceToggleDock: $("#voiceToggleDock"),
  styleInputs: [...document.querySelectorAll('input[name="uiStyle"]')],
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
  live2dStatus: $("#live2dStatus"),
  createAvatarPreview: $("#createAvatarPreview"),
  createCardPreview: $("#createCardPreview"),
  createPetPreview: $("#createPetPreview")
};

const SETTINGS_KEY = "csp-visual-chat-settings";
const ACGN_DEVICE_KEY = "csp-visual-chat-acgn-device-id";
const ONBOARDING_KEY = "csp-visual-chat-onboarding-seen";
const AVATAR_PLACEHOLDER = "/assets/ui/avatar-placeholder.svg";
const PET_PLACEHOLDER = "/assets/ui/pet-placeholder.svg";
const UI_STYLES = new Set(["workbench", "galgame", "pet-console", "album"]);
const TTS_MODEL = "gpt-4o-mini-tts";
const TTS_VOICE = "marin";
const previewObjectUrls = {
  imageUpload: "",
  petUpload: ""
};
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
    els.voiceProvider.value = settings.voiceProvider || "openai-compatible";
    els.voiceBaseUrl.value = settings.voiceBaseUrl || "";
    els.voiceModel.value = settings.voiceModel || "";
    els.voiceId.value = settings.voiceId || "";
    els.voiceAutoTranslate.checked = settings.voiceAutoTranslate !== false;
    els.voiceKey.value = settings.voiceKey || "";
    state.voiceEnabled = Boolean(settings.voiceEnabled);
    syncVoiceProviderUi();
    syncVoiceUi();
    applyUiStyle(settings.uiStyle || "workbench");
  } catch {
    localStorage.removeItem(SETTINGS_KEY);
    syncVoiceProviderUi();
    syncVoiceUi();
    applyUiStyle("workbench");
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    provider: els.provider.value,
    baseUrl: els.baseUrl.value.trim(),
    model: els.model.value.trim(),
    apiKey: els.apiKey.value.trim(),
    voiceProvider: els.voiceProvider.value,
    voiceBaseUrl: els.voiceBaseUrl.value.trim(),
    voiceModel: els.voiceModel.value.trim(),
    voiceId: els.voiceId.value.trim(),
    voiceAutoTranslate: els.voiceAutoTranslate.checked,
    voiceKey: els.voiceKey.value.trim(),
    uiStyle: document.documentElement.dataset.uiStyle || "workbench",
    voiceEnabled: state.voiceEnabled
  }));
}

function getAcgnDeviceId() {
  let deviceId = localStorage.getItem(ACGN_DEVICE_KEY);
  if (!deviceId) {
    if (globalThis.crypto?.getRandomValues) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      deviceId = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    } else {
      deviceId = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.padEnd(32, "0").slice(0, 32);
    }
    localStorage.setItem(ACGN_DEVICE_KEY, deviceId);
  }
  return deviceId;
}

function isAcgnProvider(provider = els.voiceProvider.value) {
  return provider === "acgn-official" || provider === "acgn-ttson";
}

function syncVoiceProviderUi() {
  const provider = els.voiceProvider.value || "openai-compatible";
  document.documentElement.dataset.voiceProvider = provider;

  if (provider === "acgn-official") {
    els.voiceProviderHint.textContent = "官方 API 需要 token。Base URL 留空使用 https://api.ttson.cn，可查询剩余字符额度。";
    els.voiceBaseUrl.placeholder = "可不填，默认 https://api.ttson.cn";
    els.voiceModel.placeholder = "配音语言，默认 JP，可填 ZH / JP / EN / auto";
    els.voiceId.placeholder = "选择声线后自动填入 voice_id";
    els.voiceKey.placeholder = "ACGN 官方 token，或完整 www/acgn 链接";
    if (!/^(ZH|JP|EN|auto)$/i.test(els.voiceModel.value.trim())) els.voiceModel.value = "JP";
    return;
  }

  if (provider === "acgn-ttson") {
    els.voiceProviderHint.textContent = "网页兼容模式可不填 token。Base URL 留空使用网页接口，适合先测试。";
    els.voiceBaseUrl.placeholder = "可不填，默认使用网页接口";
    els.voiceModel.placeholder = "配音语言，默认 JP，可填 ZH / JP / EN / ko / yue / auto";
    els.voiceId.placeholder = "选择声线后自动填入 voice_id";
    els.voiceKey.placeholder = "ACGN token 或完整链接，可不填";
    if (!/^(ZH|JP|EN|ko|yue|auto)$/i.test(els.voiceModel.value.trim())) els.voiceModel.value = "JP";
    return;
  }

  if (provider === "elevenlabs") {
    els.voiceProviderHint.textContent = "ElevenLabs 需要 API Key 和 Voice ID。";
    els.voiceBaseUrl.placeholder = "Voice Base URL，可选";
    els.voiceModel.placeholder = "Voice Model，可选";
    els.voiceId.placeholder = "ElevenLabs Voice ID";
    els.voiceKey.placeholder = "ElevenLabs API Key";
    return;
  }

  if (provider === "browser") {
    els.voiceProviderHint.textContent = "浏览器语音不需要 API，但声线质量取决于系统。";
    els.voiceBaseUrl.placeholder = "浏览器语音无需填写";
    els.voiceModel.placeholder = "浏览器语音无需填写";
    els.voiceId.placeholder = "浏览器语音无需填写";
    els.voiceKey.placeholder = "浏览器语音无需填写";
    return;
  }

  els.voiceProviderHint.textContent = "OpenAI TTS 需要兼容的 API Key。";
  els.voiceBaseUrl.placeholder = "Voice Base URL，可选";
  els.voiceModel.placeholder = "Voice Model，可选";
  els.voiceId.placeholder = "OpenAI voice，例如 marin";
  els.voiceKey.placeholder = "Voice API Key，可选，仅保存在本机浏览器";
}

function syncVoiceUi() {
  [els.voiceToggle, els.voiceToggleDock].filter(Boolean).forEach((button) => {
    button.textContent = state.voiceEnabled ? "语音开" : "语音关";
    button.setAttribute("aria-pressed", String(state.voiceEnabled));
    button.dataset.active = state.voiceEnabled ? "true" : "false";
  });
}

function isAlbumStyle() {
  return (document.documentElement.dataset.uiStyle || "workbench") === "album";
}

function modalIsTopLayer() {
  try {
    return els.modal.matches(":modal");
  } catch {
    return false;
  }
}

function openCharacterLibrary() {
  if (els.modal.open) {
    if (isAlbumStyle() && modalIsTopLayer()) {
      els.modal.close();
    } else {
      return;
    }
  }

  if (isAlbumStyle()) {
    els.modal.show();
  } else {
    els.modal.showModal();
  }
}

function closeCharacterLibrary() {
  if (els.modal.open) els.modal.close();
}

function openOnboarding(force = false) {
  if (!force && localStorage.getItem(ONBOARDING_KEY) === "true") return;
  if (!els.onboardingModal.open) els.onboardingModal.showModal();
}

function closeOnboarding(markSeen = true) {
  if (markSeen) localStorage.setItem(ONBOARDING_KEY, "true");
  if (els.onboardingModal.open) els.onboardingModal.close();
}

function applyUiStyle(style) {
  const nextStyle = UI_STYLES.has(style) ? style : "workbench";
  document.documentElement.dataset.uiStyle = nextStyle;
  els.styleInputs.forEach((input) => {
    input.checked = input.value === nextStyle;
  });
  syncStyleModeUi();
}

function syncStyleModeUi() {
  const style = document.documentElement.dataset.uiStyle || "workbench";
  if (style === "pet-console" && state.current && (!els.petActor.hidden || !els.live2dStage.hidden)) {
    els.petToolbar.hidden = false;
  } else if (style !== "pet-console") {
    els.petToolbar.hidden = true;
  }

  if (style === "album") {
    openCharacterLibrary();
  } else if (els.modal.open && !modalIsTopLayer()) {
    closeCharacterLibrary();
  }
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

let voiceSearchTimer = null;
async function searchAcgnVoices(query) {
  const text = String(query || "").trim();
  if (!text) return [];
  const params = new URLSearchParams({
    query: text,
    limit: "12",
    deviceId: getAcgnDeviceId()
  });
  const result = await api(`/api/acgn-voices?${params.toString()}`);
  return result.voices || [];
}

function renderAcgnVoiceOptions(voices) {
  els.acgnVoiceResults.hidden = !voices.length;
  els.acgnVoiceResults.innerHTML = voices.map((voice) => (
    `<button type="button" data-voice-id="${escapeAttr(voice.voice_id)}" data-voice-label="${escapeAttr(`${voice.voice_id} | ${voice.name}`)}">
      <b>${escapeHtml(voice.voice_id)}</b>
      <span>${escapeHtml(voice.name)}</span>
    </button>`
  )).join("");
  els.acgnVoiceSelect.innerHTML = [
    `<option value="">${voices.length ? "从候选声线中选择" : "没有候选声线"}</option>`,
    ...voices.map((voice) => (
      `<option value="${escapeAttr(String(voice.voice_id))}">${escapeHtml(`${voice.voice_id} | ${voice.name}`)}</option>`
    ))
  ].join("");
}

function applyAcgnVoice(voiceId, label = "") {
  if (!voiceId) return;
  if (!isAcgnProvider()) els.voiceProvider.value = "acgn-official";
  els.voiceId.value = voiceId;
  if (label) els.voiceSearch.value = label;
  if (!els.voiceModel.value.trim()) els.voiceModel.value = "JP";
  syncVoiceProviderUi();
  saveSettings();
}

function pickAcgnVoiceFromInput() {
  const match = els.voiceSearch.value.match(/^\s*(\d+)\s*\|/);
  if (!match) return;
  applyAcgnVoice(match[1], els.voiceSearch.value);
}

function scheduleAcgnVoiceSearch() {
  clearTimeout(voiceSearchTimer);
  const query = els.voiceSearch.value.trim();
  if (query.length < 2 || /^\d+\s*\|/.test(query)) {
    if (query.length < 2) renderAcgnVoiceOptions([]);
    return;
  }
  voiceSearchTimer = setTimeout(async () => {
    try {
      const voices = await searchAcgnVoices(query);
      renderAcgnVoiceOptions(voices);
    } catch (error) {
      console.warn("ACGN voice search failed:", error);
    }
  }, 500);
}

async function checkAcgnQuota() {
  const token = els.voiceKey.value.trim();
  if (!token) {
    els.acgnQuotaStatus.textContent = "先填写 ACGN token";
    return;
  }

  els.acgnQuotaStatus.textContent = "查询中...";
  els.checkAcgnQuota.disabled = true;
  try {
    const params = new URLSearchParams({ token });
    if (els.voiceBaseUrl.value.trim()) params.set("baseUrl", els.voiceBaseUrl.value.trim());
    const data = await api(`/api/acgn-quota?${params.toString()}`);
    els.acgnQuotaStatus.textContent = Number.isFinite(Number(data.remaining))
      ? `剩余 ${Number(data.remaining).toLocaleString()} 字符`
      : "已查询，但返回中没有 remaining";
  } catch (error) {
    els.acgnQuotaStatus.textContent = `查询失败：${error.message}`;
  } finally {
    els.checkAcgnQuota.disabled = false;
  }
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

function setPreviewImage(image, url, placeholder) {
  image.onerror = () => {
    image.onerror = null;
    image.src = placeholder;
  };
  image.src = url || placeholder;
}

function updateCreatePreviews() {
  const form = els.createForm.elements;
  const avatarUrl = form.avatarUrl.value.trim();
  const cardUrl = previewObjectUrls.imageUpload || form.imageUrl.value.trim();
  const petUrl = previewObjectUrls.petUpload || form.petImageUrl.value.trim();
  setPreviewImage(els.createAvatarPreview, avatarUrl || cardUrl, AVATAR_PLACEHOLDER);
  setPreviewImage(els.createCardPreview, cardUrl || petUrl, PET_PLACEHOLDER);
  setPreviewImage(els.createPetPreview, petUrl || cardUrl, PET_PLACEHOLDER);
}

function setUploadPreview(key, file) {
  if (previewObjectUrls[key]) {
    URL.revokeObjectURL(previewObjectUrls[key]);
    previewObjectUrls[key] = "";
  }
  if (file) previewObjectUrls[key] = URL.createObjectURL(file);
  updateCreatePreviews();
}

function resetCreatePreviews() {
  Object.keys(previewObjectUrls).forEach((key) => {
    if (previewObjectUrls[key]) URL.revokeObjectURL(previewObjectUrls[key]);
    previewObjectUrls[key] = "";
  });
  updateCreatePreviews();
}

function candidateFor(kinds, candidates) {
  return candidates.find((item) => kinds.includes(item.best)) || candidates[0];
}

function selectCandidateButton(fieldName, candidate) {
  els.candidateGrid
    .querySelectorAll(`[data-target-field="${fieldName}"]`)
    .forEach((button) => {
      const item = state.candidates[Number(button.dataset.candidate)];
      if (item?.url === candidate?.url) {
        button.dataset.selected = "true";
      } else {
        button.removeAttribute("data-selected");
      }
    });
}

function autofillCandidateFields(candidates) {
  const fields = els.createForm.elements;
  const targets = [
    ["avatarUrl", candidateFor(["avatar"], candidates)],
    ["imageUrl", candidateFor(["standee"], candidates)],
    ["petImageUrl", candidateFor(["chibi", "standee"], candidates)]
  ];
  let filled = 0;

  targets.forEach(([fieldName, candidate]) => {
    if (!candidate || fields[fieldName].value.trim()) return;
    fields[fieldName].value = candidate.url;
    selectCandidateButton(fieldName, candidate);
    filled += 1;
  });

  const petCandidate = targets.find(([fieldName]) => fieldName === "petImageUrl")?.[1];
  if (petCandidate?.best === "chibi") {
    const chibiInput = els.createForm.querySelector('input[name="petStyle"][value="chibi"]');
    if (chibiInput) chibiInput.checked = true;
  }
  if (filled) updateCreatePreviews();
  return filled;
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
  document.documentElement.style.setProperty("--galgame-name", `"${character.name}"`);
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
  if (character.voiceProvider || character.voiceId) {
    els.voiceProvider.value = character.voiceProvider || "acgn-ttson";
    els.voiceId.value = character.voiceId || "";
    els.voiceSearch.value = character.voiceName || "";
    if (character.voiceId && character.voiceName) {
      els.acgnVoiceSelect.innerHTML = `<option value="${escapeAttr(character.voiceId)}">${escapeHtml(`${character.voiceId} | ${character.voiceName}`)}</option>`;
      els.acgnVoiceSelect.value = character.voiceId;
    }
    els.voiceModel.value = character.voiceLanguage || els.voiceModel.value || "JP";
    els.voiceAutoTranslate.checked = character.voiceAutoTranslate !== false;
    syncVoiceProviderUi();
    saveSettings();
  }

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

  syncStyleModeUi();
  renderMessages();
}

function clearCharacter() {
  state.current = null;
  state.messages = [];
  state.sessionId = null;
  state.pet.lastSpeech = "";
  $("#currentThumb").src = AVATAR_PLACEHOLDER;
  els.activeAvatar.src = AVATAR_PLACEHOLDER;
  $("#currentName").textContent = "选择角色";
  $("#currentWork").textContent = "新建或选择一个聊天对象";
  $("#chatTitle").textContent = "请选择聊天对象";
  document.documentElement.style.setProperty("--galgame-name", "\"角色\"");
  $("#sheetWork").textContent = "";
  $("#sheetName").textContent = "未选择";
  $("#sheetSubtitle").textContent = "角色库为空，请新建角色开始。";
  $("#sheetTags").innerHTML = "";
  $("#sourceLink").style.display = "none";
  els.petEmpty.hidden = true;
  els.petActor.hidden = true;
  els.live2dStage.hidden = true;
  els.petAvatar.src = PET_PLACEHOLDER;
  state.live2d?.app?.destroy?.(true);
  state.live2d = null;
  els.petBubble.hidden = true;
  els.petToolbar.hidden = true;
  syncStyleModeUi();
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
      <div class="candidate-thumb">
        <img src="${escapeAttr(item.thumbUrl || item.url)}" alt="${escapeAttr(item.title)}" loading="lazy" />
      </div>
      <div class="candidate-copy">
        <div class="candidate-meta">
          <b>${candidateKindLabel(item.best)}</b>
          <small>${escapeHtml(item.width && item.height ? `${item.width} x ${item.height}` : item.title)}</small>
        </div>
        <div class="candidate-actions">
          <button type="button" data-candidate="${index}" data-target-field="avatarUrl">头像</button>
          <button type="button" data-candidate="${index}" data-target-field="imageUrl">卡片</button>
          <button type="button" data-candidate="${index}" data-target-field="petImageUrl">桌宠</button>
        </div>
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
    const filled = autofillCandidateFields(state.candidates);
    els.candidateStatus.textContent = state.candidates.length
      ? `已抓取 ${state.candidates.length} 张${filled ? `，自动放入 ${filled} 项` : ""}`
      : "没有找到候选图";
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

function galgameChoices() {
  if (!state.current) return [];
  return [
    `继续追问${state.current.name}刚才的话`,
    "换个轻松的话题",
    "问问现在的心情"
  ];
}

function renderChoiceButtons(choices, className = "starter-actions") {
  if (!choices.length) return "";
  return `
    <div class="${className}">
      ${choices.map((text) => `<button type="button" data-starter="${escapeAttr(text)}">${escapeHtml(text)}</button>`).join("")}
    </div>
  `;
}

function renderMessages() {
  if (!state.messages.length) {
    const starters = state.current ? [
      `今天想和${state.current.name}聊点日常`,
      `请用${state.current.name}的语气介绍自己`,
      "现在是什么心情？"
    ] : [];
    els.messages.innerHTML = `
      <div class="empty-state">
        <strong>${state.current ? `准备和 ${escapeHtml(state.current.name)} 打个招呼` : "先选择一个角色"}</strong>
        <span>${state.current ? "输入第一句话，右侧桌宠会跟着回应你的互动。" : "创建或选择角色后，就能开始聊天和桌宠互动。"}</span>
        ${renderChoiceButtons(starters)}
      </div>
    `;
    return;
  }
  const isGalgame = document.documentElement.dataset.uiStyle === "galgame";
  const visibleMessages = isGalgame ? state.messages.slice(-1) : state.messages;
  const choiceBar = isGalgame ? renderChoiceButtons(galgameChoices(), "galgame-choices") : "";
  els.messages.innerHTML = visibleMessages.map((message) => (
    `<div class="bubble ${message.role}">${escapeHtml(message.content)}</div>`
  )).join("") + choiceBar;
  els.messages.scrollTop = els.messages.scrollHeight;

  const latestAssistant = [...state.messages].reverse().find((message) => message.role === "assistant");
  if (latestAssistant?.content && latestAssistant.content !== "..." && latestAssistant.content !== state.pet.lastSpeech) {
    state.pet.lastSpeech = latestAssistant.content;
    petSpeak(latestAssistant.content, 7000);
    speakAssistant(latestAssistant.content);
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

async function speakAssistant(text) {
  if (!state.voiceEnabled) return;
  const content = String(text || "").replace(/\s+/g, " ").trim();
  if (!content || content === "...") return;

  const voiceProvider = els.voiceProvider.value || "openai-compatible";
  const voiceApiKey = els.voiceKey.value.trim() || (voiceProvider === "openai-compatible" ? els.apiKey.value.trim() : "");
  const voiceBaseUrl = els.voiceBaseUrl.value.trim() || (voiceProvider === "openai-compatible" ? els.baseUrl.value.trim() : "");
  const voiceModel = els.voiceModel.value.trim() || (isAcgnProvider(voiceProvider) ? "JP" : voiceProvider === "elevenlabs" ? "eleven_multilingual_v2" : TTS_MODEL);
  const voiceId = els.voiceId.value.trim() || state.current?.voiceId || (voiceProvider === "openai-compatible" ? TTS_VOICE : "");
  const canUseRemoteTts = voiceProvider === "acgn-official"
    ? Boolean(voiceApiKey)
    : voiceProvider !== "browser" && (voiceApiKey || voiceProvider === "acgn-ttson");

  if (canUseRemoteTts) {
    try {
      const requestAudio = (segment) => fetchTtsAudio({
        provider: voiceProvider,
        baseUrl: voiceBaseUrl,
        apiKey: voiceApiKey,
        model: voiceModel,
        voice: voiceId,
        language: isAcgnProvider(voiceProvider) ? voiceModel : undefined,
        autoTranslate: voiceProvider === "acgn-ttson" ? els.voiceAutoTranslate.checked : undefined,
        deviceId: voiceProvider === "acgn-ttson" ? getAcgnDeviceId() : undefined,
        text: segment
      });

      if (isAcgnProvider(voiceProvider)) {
        await playTtsSegments(splitTtsSegments(content), requestAudio);
      } else {
        await playTtsSegments([content], requestAudio);
      }
      return;
    } catch (error) {
      console.warn("Remote TTS failed, falling back to browser voice:", error);
    }
  }

  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(content.slice(0, 260));
  utterance.lang = "ja-JP";
  utterance.rate = 1;
  utterance.pitch = 1.08;
  const voices = window.speechSynthesis.getVoices?.() || [];
  const jpVoice = voices.find((voice) => /ja|Japanese|Japan/i.test(`${voice.lang} ${voice.name}`));
  if (jpVoice) utterance.voice = jpVoice;
  window.speechSynthesis.speak(utterance);
}

async function fetchTtsAudio(payload) {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `TTS failed: ${response.status}`);
  }
  return response.blob();
}

function splitTtsSegments(text) {
  const chunks = (String(text || "").match(/[^。！？!?；;]+[。！？!?；;]?/g) || [String(text || "")])
    .map((item) => item.trim())
    .filter(Boolean);
  if (chunks.length <= 1) return [String(text || "").slice(0, 900)];

  const segments = [];
  let current = "";
  for (const chunk of chunks) {
    if ((current + chunk).length > 90 && current) {
      segments.push(current);
      current = chunk;
    } else {
      current = current ? `${current} ${chunk}` : chunk;
    }
  }
  if (current) segments.push(current);
  return segments.slice(0, 6);
}

async function playTtsSegments(segments, requestAudio) {
  speakAssistant.abort?.abort();
  speakAssistant.abort = new AbortController();
  const signal = speakAssistant.abort.signal;
  if (speakAssistant.audio) speakAssistant.audio.pause();

  let nextBlob = requestAudio(segments[0]);
  for (let index = 0; index < segments.length; index += 1) {
    if (signal.aborted) return;
    const blob = await nextBlob;
    nextBlob = index + 1 < segments.length ? requestAudio(segments[index + 1]) : null;
    if (signal.aborted) return;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    speakAssistant.audio = audio;
    await new Promise((resolve, reject) => {
      audio.addEventListener("ended", resolve, { once: true });
      audio.addEventListener("error", reject, { once: true });
      audio.play().catch(reject);
    }).finally(() => URL.revokeObjectURL(url));
  }
}

function playPetMotion(name) {
  const target = els.petActor.hidden ? els.live2dStage : els.petActor;
  if (target.hidden) return;
  target.dataset.motion = name;
  clearTimeout(playPetMotion.timer);
  playPetMotion.timer = setTimeout(() => {
    delete target.dataset.motion;
  }, name === "spin" ? 1200 : 900);
}

async function handlePetAction(action) {
  if (!state.current) return;
  const motion = {
    touch: "happy",
    feed: "feed",
    play: "jump",
    wave: "wave",
    shy: "shy",
    spin: "spin",
    rest: "rest"
  }[action] || "happy";

  playPetMotion(motion);

  if (els.provider.value === "mock") {
    const idLines = getInteractionLines(state.current);
    const fallbackLines = {
      wave: `${state.current.name}向你挥了挥手。`,
      shy: `${state.current.name}稍微移开视线，像是有点不好意思。`,
      spin: `${state.current.name}轻快地转了一圈。`
    };
    petSpeak(idLines[action] || fallbackLines[action] || idLines.touch);
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

$("#openCharacterModal").addEventListener("click", openCharacterLibrary);
$("#closeCharacterModal").addEventListener("click", closeCharacterLibrary);
els.openOnboarding.addEventListener("click", () => openOnboarding(true));
els.closeOnboarding.addEventListener("click", () => closeOnboarding(true));
els.finishOnboarding.addEventListener("click", () => closeOnboarding(true));
$("#showCreate").addEventListener("click", () => els.createForm.querySelector("input").focus());
els.search.addEventListener("input", renderCharacters);
els.createForm.elements.name.addEventListener("input", scheduleCandidateFetch);

[els.provider, els.baseUrl, els.model, els.apiKey, els.voiceProvider, els.voiceBaseUrl, els.voiceModel, els.voiceId, els.voiceKey, els.voiceAutoTranslate].forEach((input) => {
  input.addEventListener("change", saveSettings);
  input.addEventListener("input", saveSettings);
});

els.voiceProvider.addEventListener("change", () => {
  syncVoiceProviderUi();
  saveSettings();
});
els.checkAcgnQuota.addEventListener("click", checkAcgnQuota);

els.voiceSearch.addEventListener("input", () => {
  pickAcgnVoiceFromInput();
  scheduleAcgnVoiceSearch();
});
els.voiceSearch.addEventListener("change", pickAcgnVoiceFromInput);
els.acgnVoiceResults.addEventListener("click", (event) => {
  const button = event.target.closest("[data-voice-id]");
  if (!button) return;
  applyAcgnVoice(button.dataset.voiceId, button.dataset.voiceLabel || button.textContent.trim());
  els.acgnVoiceResults.hidden = true;
});
els.acgnVoiceSelect.addEventListener("change", () => {
  const option = els.acgnVoiceSelect.selectedOptions[0];
  applyAcgnVoice(els.acgnVoiceSelect.value, option?.textContent || "");
});

els.styleInputs.forEach((input) => {
  input.addEventListener("change", () => {
    applyUiStyle(input.value);
    saveSettings();
  });
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
    if (!isAlbumStyle()) closeCharacterLibrary();
  }
});

els.composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const content = els.input.value.trim();
  if (content) sendMessage(content);
});

els.messages.addEventListener("click", (event) => {
  const button = event.target.closest("[data-starter]");
  if (!button || !state.current) return;
  sendMessage(button.dataset.starter);
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

[els.voiceToggle, els.voiceToggleDock].filter(Boolean).forEach((button) => button.addEventListener("click", () => {
  state.voiceEnabled = !state.voiceEnabled;
  if (!state.voiceEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
  syncVoiceUi();
  saveSettings();
}));

els.fetchCandidates.addEventListener("click", fetchImageCandidates);

els.candidateGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-candidate][data-target-field]");
  if (!button) return;
  const candidate = state.candidates[Number(button.dataset.candidate)];
  const field = els.createForm.elements[button.dataset.targetField];
  if (!candidate || !field) return;
  field.value = candidate.url;
  els.candidateGrid
    .querySelectorAll(`[data-target-field="${button.dataset.targetField}"]`)
    .forEach((item) => item.removeAttribute("data-selected"));
  button.dataset.selected = "true";
  if (button.dataset.targetField === "petImageUrl") {
    const mode = candidate.best === "chibi" ? "chibi" : "standee";
    const modeInput = els.createForm.querySelector(`input[name="petStyle"][value="${mode}"]`);
    if (modeInput) modeInput.checked = true;
  }
  updateCreatePreviews();
  els.candidateStatus.textContent = `已设置${button.textContent}图`;
});

["avatarUrl", "imageUrl", "petImageUrl"].forEach((name) => {
  els.createForm.elements[name].addEventListener("input", updateCreatePreviews);
});

els.imageUpload.addEventListener("change", () => {
  setUploadPreview("imageUpload", els.imageUpload.files?.[0]);
});

els.petUpload.addEventListener("change", () => {
  setUploadPreview("petUpload", els.petUpload.files?.[0]);
});

els.createForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(els.createForm);
  const payload = Object.fromEntries(form.entries());
  payload.useFetchedImage = form.get("useFetchedImage") === "on";
  payload.petStyle = form.get("petStyle") || "standee";
  payload.makePet = payload.petStyle !== "live2d";
  payload.useChibiPet = payload.petStyle === "chibi";
  payload.voiceLanguage = payload.voiceLanguage || "JP";
  payload.voiceAutoTranslate = form.get("voiceAutoTranslate") === "on";
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
    resetCreatePreviews();
    state.candidates = [];
    state.candidateQuery = "";
    renderCandidateGrid([]);
    els.candidateStatus.textContent = "";
    els.createStatus.textContent = "角色卡已生成。";
    if (!isAlbumStyle()) setTimeout(closeCharacterLibrary, 350);
  } catch (error) {
    els.createStatus.textContent = `生成失败：${error.message}`;
  } finally {
    submitButton.disabled = false;
  }
});

loadSettings();
setTimeout(() => openOnboarding(false), 350);
loadCharacters().catch((error) => {
  els.messages.innerHTML = `<div class="empty-state">加载失败：${escapeHtml(error.message)}</div>`;
});
