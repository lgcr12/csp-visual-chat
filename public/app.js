const state = {
  characters: [],
  current: null,
  candidates: [],
  candidateQuery: "",
  libraryPane: "list",
  messages: [],
  sessionId: null,
  routeStates: {},
  pet: {
    x: 0,
    y: 0,
    lastSpeech: "",
    suppressClick: false,
    idleTimer: null
  },
  galgame: {
    typingKey: "",
    completedKey: "",
    typingText: "",
    displayedText: "",
    typingIndex: 0,
    typingTimer: null,
    dialogueHidden: false,
    background: "riverside",
    customBackground: "",
    routeChoices: {},
    logEvents: [],
    readMessageKeys: {},
    autoPlay: false,
    skipRead: false,
    autoScene: true,
    atmosphere: true,
    choiceFrequency: "normal",
    customBackgrounds: [],
    emotion: "calm",
    pendingAutoTimer: null
  },
  aiPetActions: true,
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
  aiPetActions: $("#aiPetActions"),
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
  userAlias: $("#userAlias"),
  checkAcgnQuota: $("#checkAcgnQuota"),
  acgnQuotaStatus: $("#acgnQuotaStatus"),
  openSettingsDrawer: $("#openSettingsDrawer"),
  settingsDrawer: $("#settingsDrawer"),
  closeSettingsDrawer: $("#closeSettingsDrawer"),
  settingsDrawerBody: $("#settingsDrawerBody"),
  chatApiPanel: $("#chatApiPanel"),
  voiceApiPanel: $("#voiceApiPanel"),
  openOnboarding: $("#openOnboarding"),
  onboardingModal: $("#onboardingModal"),
  closeOnboarding: $("#closeOnboarding"),
  finishOnboarding: $("#finishOnboarding"),
  styleDock: $("#styleDock"),
  voiceToggle: $("#voiceToggle"),
  voiceToggleDock: $("#voiceToggleDock"),
  galgameLogToggle: $("#galgameLogToggle"),
  galgameSkipText: $("#galgameSkipText"),
  galgameHideToggle: $("#galgameHideToggle"),
  galgameSave: $("#galgameSave"),
  galgameLoad: $("#galgameLoad"),
  galgameAuto: $("#galgameAuto"),
  galgameSkipRead: $("#galgameSkipRead"),
  galgameAutoScene: $("#galgameAutoScene"),
  galgameAtmosphere: $("#galgameAtmosphere"),
  galgameBranchEdit: $("#galgameBranchEdit"),
  galgameChoiceFrequency: $("#galgameChoiceFrequency"),
  galgameRouteStatus: $("#galgameRouteStatus"),
  galgameLog: $("#galgameLog"),
  galgameLogClose: $("#galgameLogClose"),
  galgameLogBody: $("#galgameLogBody"),
  galgameLogSearch: $("#galgameLogSearch"),
  galgameLogCount: $("#galgameLogCount"),
  galgameSaveDialog: $("#galgameSaveDialog"),
  galgameSaveDialogTitle: $("#galgameSaveDialogTitle"),
  galgameSaveDialogClose: $("#galgameSaveDialogClose"),
  galgameSaveSlots: $("#galgameSaveSlots"),
  galgameBgPicker: $("#galgameBgPicker"),
  galgameBgUpload: $("#galgameBgUpload"),
  galgameUserBgChoices: $("#galgameUserBgChoices"),
  routeEditor: $("#routeEditor"),
  routeEditorClose: $("#routeEditorClose"),
  routeEditorCancel: $("#routeEditorCancel"),
  routeEditorForm: $("#routeEditorForm"),
  routeEditorBody: $("#routeEditorBody"),
  routeEditorStatus: $("#routeEditorStatus"),
  styleInputs: [...document.querySelectorAll('input[name="uiStyle"]')],
  createForm: $("#createForm"),
  createStatus: $("#createStatus"),
  fetchCandidates: $("#fetchCandidates"),
  candidateStatus: $("#candidateStatus"),
  candidateGrid: $("#candidateGrid"),
  search: $("#characterSearch"),
  libraryCount: $("#libraryCount"),
  showCreate: $("#showCreate"),
  activeAvatar: $("#activeAvatar"),
  imageUpload: $("#imageUpload"),
  petUpload: $("#petUpload"),
  petEmpty: $("#petEmpty"),
  petActor: $("#petActor"),
  petAvatar: $("#petAvatar"),
  petBubble: $("#petBubble"),
  petToolbar: $("#petToolbar"),
  reprocessPetImage: $("#reprocessPetImage"),
  playStatus: $("#playStatus"),
  live2dStage: $("#live2dStage"),
  live2dStatus: $("#live2dStatus"),
  createAvatarPreview: $("#createAvatarPreview"),
  createCardPreview: $("#createCardPreview"),
  createPetPreview: $("#createPetPreview")
};

const SETTINGS_KEY = "csp-visual-chat-settings";
const CURRENT_CHARACTER_KEY = "csp-visual-chat-current-character-id";
const ROUTE_STATE_KEY = "csp-visual-chat-route-states";
const GALGAME_SAVE_KEY = "csp-visual-chat-galgame-saves";
const GALGAME_SAVE_SLOTS = ["quick", "slot-1", "slot-2", "slot-3", "slot-4", "slot-5"];
const GALGAME_SAVE_SLOT_LABELS = {
  quick: "快速槽",
  "slot-1": "存档 01",
  "slot-2": "存档 02",
  "slot-3": "存档 03",
  "slot-4": "存档 04",
  "slot-5": "存档 05"
};
const ACGN_DEVICE_KEY = "csp-visual-chat-acgn-device-id";
const ONBOARDING_KEY = "csp-visual-chat-onboarding-seen";
const TTS_CACHE_NAME = "csp-visual-chat-tts-v1";
const DEFAULT_INPUT_PLACEHOLDER = "输入消息，按 Enter 发送，Shift + Enter 换行";
const GALGAME_INPUT_PLACEHOLDER = "输入台词...";
const AVATAR_PLACEHOLDER = "/assets/ui/avatar-placeholder.svg";
const PET_PLACEHOLDER = "/assets/ui/pet-placeholder.svg";
const UI_STYLES = new Set(["workbench", "galgame", "pet-console", "album"]);
const GALGAME_BACKGROUNDS = {
  riverside: "/assets/ui/galgame-riverside-spring.png?v=1",
  classroom: "/assets/ui/galgame-classroom-sunset.png?v=1",
  street: "/assets/ui/galgame-rain-street.png?v=1",
  room: "/assets/ui/galgame-room-rain.png?v=1",
  sakura: "/assets/ui/galgame-sakura-bg.png?v=2",
  library: "/assets/ui/galgame-library-afternoon.png?v=2",
  seaside: "/assets/ui/galgame-seaside-station.png?v=2",
  shrine: "/assets/ui/galgame-shrine-dusk.png?v=2",
  cafe: "/assets/ui/galgame-cafe-window.png?v=2",
  rooftop: "/assets/ui/galgame-school-rooftop.png?v=2",
  nightRoom: "/assets/ui/galgame-night-apartment.png?v=2"
};
const TTS_MODEL = "gpt-4o-mini-tts";
const TTS_VOICE = "marin";
const previewObjectUrls = {
  imageUpload: "",
  petUpload: ""
};
const settingsPanelHomes = [els.chatApiPanel, els.voiceApiPanel].filter(Boolean).map((panel) => ({
  panel,
  parent: panel.parentNode,
  next: panel.nextSibling
}));
const voiceScriptCache = new Map();
const LIVE2D_SCRIPTS = [
  "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js",
  "https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js",
  "https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.js"
];
const PET_ACTION_MOTIONS = {
  idle: "",
  talk: "talk",
  speaking: "talk",
  touch: "happy",
  happy: "happy",
  feed: "feed",
  play: "jump",
  wave: "wave",
  praise: "happy",
  shy: "shy",
  spin: "spin",
  rest: "rest",
  photo: "happy",
  wake: "surprised",
  approach: "approach",
  closer: "approach",
  leave: "rest",
  sad: "rest",
  angry: "angry",
  surprise: "surprised",
  surprised: "surprised",
  "daily-care": "wave",
  praise: "happy",
  "rest-together": "rest",
  accept: "wave",
  tease: "shy",
  cautious: "rest",
  comfort: "happy",
  "silent-close": "shy",
  probe: "jump",
  apology: "rest",
  honest: "wave",
  action: "jump",
  sincere: "happy",
  intimate: "shy",
  answer: "wave",
  avoid: "rest",
  "direct-close": "shy",
  "follow-up": "wave",
  lighten: "happy",
  silence: "rest",
  soften: "shy",
  patient: "rest"
};
const PET_MOTION_DURATIONS = {
  talk: 1500,
  happy: 1650,
  feed: 1500,
  jump: 1650,
  rest: 1750,
  land: 650,
  wave: 1700,
  shy: 1750,
  spin: 1950,
  surprised: 1150,
  angry: 1350,
  approach: 1500
};
const PET_IDLE_MOTIONS = ["happy", "wave", "shy", "rest"];
const ROUTE_TEMPLATE_PRESETS = {
  warm: {
    label: "温柔陪伴",
    intro: "关系会从日常照顾和彼此体谅里慢慢升温。",
    routeHint: "优先生成日常、关心、陪伴型选项，避免突然冲突。"
  },
  tsundere: {
    label: "别扭靠近",
    intro: "好感常被玩笑、逞强和短暂退让藏起来。",
    routeHint: "选项可以有轻微试探，但不要无端制造严重争吵。"
  },
  mystery: {
    label: "秘密路线",
    intro: "信赖会逐步打开角色隐藏的心事和过去。",
    routeHint: "选项围绕信任、追问、保留距离展开。"
  },
  brave: {
    label: "并肩行动",
    intro: "关系会通过约定、行动和共同面对事件推进。",
    routeHint: "选项更偏行动承诺、一起出发、保护或支持。"
  },
  default: {
    label: "共同路线",
    intro: "从普通对话进入角色专属路线。",
    routeHint: "选项跟随上一句台词情绪，不要和上下文脱节。"
  }
};

const ROUTE_MILESTONES = [
  { id: "trust-8", field: "trust", at: 8, text: "她开始更认真地听你说话。", motion: "happy", emotion: "calm" },
  { id: "trust-16", field: "trust", at: 16, text: "她把一点真实想法交给了你。", motion: "wave", emotion: "happy" },
  { id: "affection-10", field: "affection", at: 10, text: "你们之间多了一点轻快的默契。", motion: "happy", emotion: "happy" },
  { id: "intimacy-10", field: "intimacy", at: 10, text: "距离被悄悄拉近了一点。", motion: "shy", emotion: "shy" },
  { id: "intimacy-18", field: "intimacy", at: 18, text: "她已经习惯把视线停在你身上。", motion: "shy", emotion: "shy" },
  { id: "distant", field: "affection", at: -8, below: true, text: "气氛稍微冷了下来。", motion: "rest", emotion: "sad" }
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
    state.aiPetActions = settings.aiPetActions !== false;
    if (els.aiPetActions) els.aiPetActions.checked = state.aiPetActions;
    els.baseUrl.value = settings.baseUrl || "";
    els.model.value = settings.model || "";
    els.apiKey.value = settings.apiKey || "";
    els.voiceProvider.value = settings.voiceProvider || "openai-compatible";
    els.voiceBaseUrl.value = settings.voiceBaseUrl || "";
    els.voiceModel.value = settings.voiceModel || "";
    els.voiceId.value = settings.voiceId || "";
    els.voiceAutoTranslate.checked = settings.voiceAutoTranslate !== false;
    els.voiceKey.value = settings.voiceKey || "";
    if (els.userAlias) els.userAlias.value = settings.userAlias || "";
    state.voiceEnabled = Boolean(settings.voiceEnabled);
    syncVoiceProviderUi();
    syncVoiceUi();
    state.galgame.customBackground = settings.customGalgameBackground || "";
    state.galgame.autoScene = settings.galgameAutoScene !== false;
    state.galgame.atmosphere = settings.galgameAtmosphere !== false;
    state.galgame.choiceFrequency = ["off", "low", "normal", "high"].includes(settings.galgameChoiceFrequency)
      ? settings.galgameChoiceFrequency
      : "normal";
    if (els.galgameChoiceFrequency) els.galgameChoiceFrequency.value = state.galgame.choiceFrequency;
    state.galgame.customBackgrounds = Array.isArray(settings.galgameCustomBackgrounds)
      ? settings.galgameCustomBackgrounds.filter((item) => item?.url).slice(-18)
      : [];
    renderCustomGalgameBackgrounds();
    applyGalgameBackground(settings.galgameBackground || "riverside");
    applyUiStyle(settings.uiStyle || "workbench");
  } catch {
    localStorage.removeItem(SETTINGS_KEY);
    state.aiPetActions = true;
    if (els.aiPetActions) els.aiPetActions.checked = true;
    if (els.userAlias) els.userAlias.value = "";
    syncVoiceProviderUi();
    syncVoiceUi();
    state.galgame.customBackground = "";
    state.galgame.autoScene = true;
    state.galgame.atmosphere = true;
    state.galgame.choiceFrequency = "normal";
    if (els.galgameChoiceFrequency) els.galgameChoiceFrequency.value = "normal";
    state.galgame.customBackgrounds = [];
    renderCustomGalgameBackgrounds();
    applyGalgameBackground("riverside");
    applyUiStyle("workbench");
  }
  syncGalgameToolButtons();
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    provider: els.provider.value,
    aiPetActions: state.aiPetActions,
    baseUrl: els.baseUrl.value.trim(),
    model: els.model.value.trim(),
    apiKey: els.apiKey.value.trim(),
    voiceProvider: els.voiceProvider.value,
    voiceBaseUrl: els.voiceBaseUrl.value.trim(),
    voiceModel: els.voiceModel.value.trim(),
    voiceId: els.voiceId.value.trim(),
    voiceAutoTranslate: els.voiceAutoTranslate.checked,
    voiceKey: els.voiceKey.value.trim(),
    userAlias: els.userAlias?.value.trim() || "",
    uiStyle: document.documentElement.dataset.uiStyle || "workbench",
    galgameBackground: state.galgame.background,
    customGalgameBackground: state.galgame.customBackground,
    galgameCustomBackgrounds: state.galgame.customBackgrounds,
    galgameAutoScene: state.galgame.autoScene,
    galgameAtmosphere: state.galgame.atmosphere,
    galgameChoiceFrequency: state.galgame.choiceFrequency,
    voiceEnabled: state.voiceEnabled
  }));
}

function userAliasValue() {
  const value = String(els.userAlias?.value || "").trim();
  return value || "你";
}

function explicitUserAlias() {
  return String(els.userAlias?.value || "").trim();
}

function moveSettingsPanelsToDrawer() {
  if (!els.settingsDrawerBody) return;
  settingsPanelHomes.forEach(({ panel }) => {
    els.settingsDrawerBody.append(panel);
  });
}

function restoreSettingsPanels() {
  settingsPanelHomes.forEach(({ panel, parent, next }) => {
    if (!parent || panel.parentNode === parent) return;
    parent.insertBefore(panel, next);
  });
}

function openSettingsDrawer() {
  if (!els.settingsDrawer) return;
  moveSettingsPanelsToDrawer();
  els.settingsDrawer.showModal();
}

function defaultRouteState() {
  return {
    affection: 0,
    trust: 0,
    intimacy: 0,
    turns: 0,
    route: "序章",
    template: "default",
    triggeredEvents: [],
    eventLog: [],
    unlockedMemories: [],
    mood: "calm",
    stress: 12,
    energy: 74,
    interactionCounts: {},
    lastInteraction: "",
    endings: [],
    lastChoice: "",
    lastTone: ""
  };
}

function loadRouteStates() {
  try {
    const stored = JSON.parse(localStorage.getItem(ROUTE_STATE_KEY) || "{}");
    state.routeStates = stored && typeof stored === "object" ? stored : {};
  } catch {
    state.routeStates = {};
    localStorage.removeItem(ROUTE_STATE_KEY);
  }
}

function saveRouteStates() {
  localStorage.setItem(ROUTE_STATE_KEY, JSON.stringify(state.routeStates));
}

function routeStateFor(character = state.current) {
  if (!character?.id) return defaultRouteState();
  const existing = state.routeStates[character.id] || {};
  const next = { ...defaultRouteState(), ...existing };
  if (!next.template || !ROUTE_TEMPLATE_PRESETS[next.template]) {
    next.template = inferRouteTemplate(character);
  }
  if (!Array.isArray(next.triggeredEvents)) next.triggeredEvents = [];
  if (!Array.isArray(next.eventLog)) next.eventLog = [];
  if (!Array.isArray(next.unlockedMemories)) next.unlockedMemories = [];
  if (!Array.isArray(next.endings)) next.endings = [];
  if (!next.interactionCounts || typeof next.interactionCounts !== "object") next.interactionCounts = {};
  next.stress = clampPercent(next.stress ?? 12);
  next.energy = clampPercent(next.energy ?? 74);
  next.mood = next.mood || routeMood(next);
  state.routeStates[character.id] = next;
  return next;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function inferRouteTemplate(character = state.current) {
  const text = `${character?.name || ""} ${character?.work || ""} ${character?.subtitle || ""} ${(character?.tags || []).join(" ")}`.toLowerCase();
  if (/傲娇|ツンデレ|tsundere|毒舌|嘴硬|素世|立希|祥子/.test(text)) return "tsundere";
  if (/秘密|神秘|悬疑|过去|面具|初华|睦|ave mujica|mystery/.test(text)) return "mystery";
  if (/骑士|战斗|行动|冒险|sao|asuna|亚丝娜|保护|brave/.test(text)) return "brave";
  if (/女仆|温柔|治愈|陪伴|妹妹|日常|rem|蕾姆|emilia|艾米莉亚|warm/.test(text)) return "warm";
  return "default";
}

function routeTemplateInfo(route = routeStateFor()) {
  return ROUTE_TEMPLATE_PRESETS[route.template] || ROUTE_TEMPLATE_PRESETS.default;
}

function clampRouteValue(value) {
  return Math.max(-20, Math.min(30, Number(value) || 0));
}

function routeName(route) {
  const affection = route.affection || 0;
  const trust = route.trust || 0;
  const intimacy = route.intimacy || 0;
  if (affection >= 18 && trust >= 14 && intimacy >= 14) return "恋人路线";
  if (trust >= 18 && intimacy >= 8) return "信赖路线";
  if (affection >= 14 && intimacy >= 10) return "暧昧路线";
  if (trust <= -6 || affection <= -8) return "疏离路线";
  if (route.turns >= 4) return "共同路线";
  return "序章";
}

function routeEventFor(previousRoute, route) {
  if (!route || previousRoute === route.route) return "";
  if (route.route === "共同路线") return "你们的相处开始变得自然。";
  if (route.route === "暧昧路线") return "空气里多了一点说不清的距离感。";
  if (route.route === "信赖路线") return "她似乎更愿意把真实想法交给你。";
  if (route.route === "恋人路线") return "她看你的眼神变得更柔软。";
  if (route.route === "疏离路线") return "她和你之间稍微拉开了距离。";
  return "";
}

function routeMood(route = routeStateFor()) {
  if (route.route === "疏离路线" || route.trust <= -5 || route.affection <= -6) return "distant";
  if (route.route === "恋人路线" || route.intimacy >= 16) return "intimate";
  if (route.route === "暧昧路线" || route.affection >= 12) return "warm";
  if (route.route === "信赖路线" || route.trust >= 14) return "trust";
  if (route.turns >= 4) return "common";
  return "intro";
}

function moodLabel(mood = "") {
  return {
    calm: "平静",
    happy: "开心",
    shy: "害羞",
    tired: "有点累",
    tense: "紧张",
    warm: "放松",
    trust: "信任",
    intimate: "亲近",
    distant: "疏离",
    sad: "低落",
    angry: "生气",
    intro: "观察中",
    common: "熟悉中"
  }[mood] || "平静";
}

function routeCompletion(route = routeStateFor()) {
  const relationship = Math.max(0, route.affection) + Math.max(0, route.trust) + Math.max(0, route.intimacy);
  const eventScore = Math.min(24, (route.unlockedMemories?.length || 0) * 4);
  const endingScore = Math.min(16, (route.endings?.length || 0) * 8);
  return Math.max(0, Math.min(100, Math.round(relationship * 1.15 + eventScore + endingScore + Math.min(18, route.turns * 2))));
}

function addGameplayMemory(text, kind = "event") {
  if (!state.current?.id || !text) return;
  const route = routeStateFor();
  const id = `${kind}-${String(text).slice(0, 24)}`;
  const entry = {
    id,
    kind,
    text,
    at: Date.now(),
    route: route.route
  };
  route.eventLog = [entry, ...(route.eventLog || []).filter((item) => item.id !== id)].slice(0, 30);
  if (!route.unlockedMemories.includes(id)) route.unlockedMemories.unshift(id);
  route.unlockedMemories = route.unlockedMemories.slice(0, 60);
  saveRouteStates();
  appendGalgameEvent(text, kind === "interaction" ? "route" : kind);
}

function maybeUnlockEnding(route = routeStateFor()) {
  const ending = route.route === "恋人路线"
    ? "恋人结局"
    : route.route === "信赖路线"
      ? "信赖结局"
      : route.route === "疏离路线"
        ? "疏离结局"
        : "";
  if (!ending || route.endings.includes(ending)) return;
  route.endings.unshift(ending);
  addGameplayMemory(`解锁：${ending}`, "ending");
  showRouteEvent(`解锁：${ending}`);
}

function interactionEffects(action = "") {
  return {
    touch: { affection: 1, intimacy: 1, stress: -4, energy: -1, mood: "shy", text: "摸头互动已记录。" },
    feed: { affection: 1, trust: 1, stress: -6, energy: 8, mood: "happy", text: "投喂让气氛变轻松了。" },
    play: { affection: 2, intimacy: 1, stress: -2, energy: -8, mood: "happy", text: "一起玩耍的回忆已解锁。" },
    wave: { affection: 1, stress: -1, energy: 0, mood: "calm", text: "她回应了你的招呼。" },
    praise: { affection: 2, trust: 1, stress: -5, energy: 2, mood: "happy", text: "一句夸奖让她明显放松了。" },
    approach: { intimacy: 2, stress: 2, energy: -1, mood: "shy", text: "你们之间的距离更近了。" },
    photo: { affection: 1, trust: 0, stress: 1, energy: -1, mood: "happy", text: "一张桌宠纪念照加入回忆。" },
    shy: { affection: 1, intimacy: 1, stress: 1, energy: -1, mood: "shy", text: "她有点不好意思。" },
    spin: { affection: 1, stress: -2, energy: -5, mood: "happy", text: "轻快的小动作加入回忆。" },
    rest: { trust: 1, stress: -10, energy: 14, mood: "calm", text: "休息让状态恢复了一些。" },
    wake: { trust: -1, stress: 5, energy: 5, mood: "tense", text: "她被叫醒了，稍微有点不满。" }
  }[action] || { affection: 1, stress: -1, mood: "calm", text: "互动已记录。" };
}

function applyGameplayDelta(delta = {}, source = "") {
  if (!state.current?.id) return routeStateFor();
  const route = routeStateFor();
  route.affection = clampRouteValue(route.affection + (Number(delta.affection) || 0));
  route.trust = clampRouteValue(route.trust + (Number(delta.trust) || 0));
  route.intimacy = clampRouteValue(route.intimacy + (Number(delta.intimacy) || 0));
  route.stress = clampPercent(route.stress + (Number(delta.stress) || 0));
  route.energy = clampPercent(route.energy + (Number(delta.energy) || 0));
  route.mood = delta.mood || (route.stress > 72 ? "tired" : routeMood(route));
  route.lastInteraction = source || route.lastInteraction;
  if (source === "chat") route.turns = Math.max(0, (Number(route.turns) || 0) + 1);
  if (source) {
    route.interactionCounts[source] = (Number(route.interactionCounts[source]) || 0) + 1;
  }
  route.route = routeName(route);
  maybeUnlockEnding(route);
  if (delta.text) addGameplayMemory(delta.text, source ? "interaction" : "event");
  saveRouteStates();
  updateRouteFeedback(route);
  renderPlayStatus();
  renderCharacters();
  return route;
}

function maybeTriggerDailyEvent(character = state.current) {
  if (!character?.id) return;
  const route = routeStateFor(character);
  const today = new Date().toISOString().slice(0, 10);
  if (route.lastDailyEvent === today) return;
  const hour = new Date().getHours();
  const text = hour < 11
    ? `${character.name}和你一起开始了今天。`
    : hour < 18
      ? `${character.name}陪你度过了一段午后时间。`
      : `${character.name}把今天的夜晚也留在了回忆里。`;
  route.lastDailyEvent = today;
  route.energy = clampPercent(route.energy + 4);
  saveRouteStates();
  addGameplayMemory(text, "daily");
  renderPlayStatus(route);
}

function conversationGameplayDelta(userText = "", replyText = "") {
  const text = `${userText}\n${replyText}`;
  if (/谢谢|辛苦|做得好|喜欢|可爱|陪|关心|休息|安心|ありがとう|好き/.test(text)) {
    return { affection: 1, trust: 1, stress: -3, energy: -1, mood: "warm", text: "一次温柔的日常对话被记录下来。" };
  }
  if (/对不起|抱歉|没事|别担心|我在|安慰|难过|害怕/.test(text)) {
    return { trust: 2, stress: -4, energy: -1, mood: "calm", text: "她似乎更愿意相信你一点。" };
  }
  if (/讨厌|生气|烦|别说|吵|滚|笨蛋|バカ|嫌い/.test(text)) {
    return { affection: -1, trust: -1, stress: 7, energy: -2, mood: "tense", text: "气氛变得有些紧绷。" };
  }
  return { trust: 1, stress: -1, energy: -1, mood: routeMood(routeStateFor()) };
}

function routeFeedbackText(route = routeStateFor()) {
  const template = routeTemplateInfo(route);
  const mood = {
    intro: "序章刚刚展开",
    common: "相处进入共同路线",
    warm: "气氛正在变得柔软",
    trust: "信赖正在累积",
    intimate: "距离已经很近",
    distant: "气氛有些疏离"
  }[routeMood(route)] || "路线推进中";
  return `${route.route || "序章"} · ${template.label} · ${mood}`;
}

function updateRouteFeedback(route = routeStateFor()) {
  document.documentElement.dataset.routeMood = routeMood(route);
  document.documentElement.dataset.routeTemplate = route.template || "default";
  if (els.galgameRouteStatus) {
    els.galgameRouteStatus.textContent = routeFeedbackText(route);
    els.galgameRouteStatus.hidden = !isGalgameStyle();
  }
  renderPlayStatus(route);
}

function renderStatBar(label, value, max = 30) {
  const normalized = Math.max(0, Math.min(100, Math.round((Number(value) || 0) / max * 100)));
  return `
    <div class="play-stat">
      <span>${label}</span>
      <strong>${Number(value) || 0}</strong>
      <i style="--stat: ${normalized}%"></i>
    </div>
  `;
}

function renderPlayStatus(route = routeStateFor()) {
  if (!els.playStatus) return;
  if (!state.current) {
    els.playStatus.hidden = true;
    els.playStatus.innerHTML = "";
    return;
  }
  const memories = (route.eventLog || []).slice(0, 3);
  els.playStatus.hidden = false;
  els.playStatus.innerHTML = `
    <div class="play-status-head">
      <b>${escapeHtml(route.route || "序章")}</b>
      <span>完成度 ${routeCompletion(route)}%</span>
    </div>
    <div class="play-meters">
      ${renderStatBar("好感", Math.max(0, route.affection))}
      ${renderStatBar("信赖", Math.max(0, route.trust))}
      ${renderStatBar("亲密", Math.max(0, route.intimacy))}
    </div>
    <div class="play-vitals">
      <span>心情：${escapeHtml(moodLabel(route.mood || routeMood(route)))}</span>
      <span>压力：${clampPercent(route.stress)}%</span>
      <span>精力：${clampPercent(route.energy)}%</span>
      <span>结局：${route.endings?.length || 0}</span>
    </div>
    <div class="memory-list">
      <strong>最近回忆</strong>
      ${memories.length
        ? memories.map((item) => `<span>${escapeHtml(item.text)}</span>`).join("")
        : "<span>还没有解锁回忆。</span>"}
    </div>
  `;
}

function appendGalgameEvent(text, kind = "route") {
  if (!text) return;
  state.galgame.logEvents.push({
    kind,
    text,
    at: Date.now()
  });
  state.galgame.logEvents = state.galgame.logEvents.slice(-80);
  renderGalgameLog();
}

function showRouteEvent(text) {
  if (!text || !isGalgameStyle()) return;
  appendGalgameEvent(text, "route");
  const notice = document.createElement("div");
  notice.className = "route-event-toast";
  notice.textContent = text;
  document.body.append(notice);
  clearTimeout(showRouteEvent.timer);
  showRouteEvent.timer = setTimeout(() => notice.remove(), 2400);
}

function routeMilestoneEvents(previous, route) {
  if (!route) return [];
  const triggered = new Set(route.triggeredEvents || []);
  const events = [];
  for (const milestone of ROUTE_MILESTONES) {
    if (triggered.has(milestone.id)) continue;
    const before = Number(previous?.[milestone.field]) || 0;
    const after = Number(route[milestone.field]) || 0;
    const crossed = milestone.below
      ? before > milestone.at && after <= milestone.at
      : before < milestone.at && after >= milestone.at;
    if (!crossed) continue;
    triggered.add(milestone.id);
    events.push(milestone);
  }
  route.triggeredEvents = [...triggered];
  return events;
}

function applyRouteEffects(effects = {}, choice = "") {
  if (!state.current?.id) return defaultRouteState();
  const route = routeStateFor();
  const previous = { ...route };
  const previousRoute = route.route;
  route.affection = clampRouteValue(route.affection + (Number(effects.affection) || 0));
  route.trust = clampRouteValue(route.trust + (Number(effects.trust) || 0));
  route.intimacy = clampRouteValue(route.intimacy + (Number(effects.intimacy) || 0));
  route.stress = clampPercent(route.stress + (Number(effects.stress) || 0) + (effects.tone === "avoid" ? 4 : -1));
  route.energy = clampPercent(route.energy + (Number(effects.energy) || 0) - 1);
  route.mood = voiceEmotionFor(effects.tone || "") || routeMood(route);
  route.turns = Math.max(0, (Number(route.turns) || 0) + 1);
  route.lastChoice = routeChoiceLabel(choice);
  route.lastTone = String(effects.tone || "");
  route.route = routeName(route);
  maybeUnlockEnding(route);
  const milestones = routeMilestoneEvents(previous, route);
  saveRouteStates();
  if (choice) addGameplayMemory(`选择：${routeChoiceLabel(choice)}`, "choice");
  showRouteEvent(routeEventFor(previousRoute, route));
  milestones.forEach((event) => {
    showRouteEvent(event.text);
    addGameplayMemory(event.text, "milestone");
    if (event.motion) playPetMotion(event.motion);
    if (event.emotion) setPetEmotion(event.emotion);
  });
  updateRouteFeedback(route);
  return route;
}

function routeContextForPrompt() {
  const route = routeStateFor();
  return {
    userAlias: userAliasValue(),
    route: route.route,
    affection: route.affection,
    trust: route.trust,
    intimacy: route.intimacy,
    stress: route.stress,
    energy: route.energy,
    mood: route.mood,
    unlockedMemories: route.unlockedMemories?.length || 0,
    endings: route.endings?.length || 0,
    turns: route.turns,
    template: route.template,
    templateLabel: routeTemplateInfo(route).label,
    templateHint: routeTemplateInfo(route).routeHint,
    lastChoice: route.lastChoice,
    lastTone: route.lastTone
  };
}

function loadGalgameSaves() {
  try {
    const saves = JSON.parse(localStorage.getItem(GALGAME_SAVE_KEY) || "{}");
    return saves && typeof saves === "object" ? saves : {};
  } catch {
    localStorage.removeItem(GALGAME_SAVE_KEY);
    return {};
  }
}

function saveGalgameSaves(saves) {
  localStorage.setItem(GALGAME_SAVE_KEY, JSON.stringify(saves));
}

function currentGalgameSave() {
  if (!state.current) return null;
  return {
    characterId: state.current.id,
    characterName: state.current.name,
    savedAt: new Date().toISOString(),
    messages: state.messages.filter((message) => message.content !== "..."),
    sessionId: state.sessionId,
    routeState: routeContextForPrompt(),
    background: state.galgame.background,
    customBackground: state.galgame.customBackground,
    logEvents: state.galgame.logEvents,
    readMessageKeys: state.galgame.readMessageKeys,
    uiStyle: document.documentElement.dataset.uiStyle || "galgame"
  };
}

function saveGalgameSlot(slot = "quick") {
  const save = currentGalgameSave();
  if (!save) {
    alert("先选择角色再存档");
    return;
  }
  const saves = loadGalgameSaves();
  saves[slot] = save;
  saveGalgameSaves(saves);
  renderGalgameSaveSlots(els.galgameSaveDialog?.dataset.mode || "save");
  showRouteEvent("已存档。");
}

function loadGalgameSlot(slot = "quick") {
  const save = loadGalgameSaves()[slot];
  if (!save) {
    alert("还没有可读取的存档");
    return;
  }
  const character = state.characters.find((item) => item.id === save.characterId);
  if (!character) {
    alert("存档里的角色已经不存在");
    return;
  }
  applyCharacter(character);
  state.messages = Array.isArray(save.messages) ? save.messages : [];
  state.sessionId = save.sessionId || null;
  state.routeStates[character.id] = { ...defaultRouteState(), ...(save.routeState || {}) };
  saveRouteStates();
  state.galgame.customBackground = save.customBackground || state.galgame.customBackground;
  state.galgame.logEvents = Array.isArray(save.logEvents) ? save.logEvents : [];
  state.galgame.readMessageKeys = save.readMessageKeys && typeof save.readMessageKeys === "object" ? save.readMessageKeys : {};
  applyGalgameBackground(save.background || "riverside");
  applyUiStyle(save.uiStyle || "galgame");
  resetGalgameTyping();
  renderMessages();
  renderGalgameLog();
  updateRouteFeedback();
  showRouteEvent("已读档。");
}

function formatSaveTime(value) {
  if (!value) return "空槽位";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function deleteGalgameSlot(slot) {
  const saves = loadGalgameSaves();
  if (!saves[slot]) return;
  delete saves[slot];
  saveGalgameSaves(saves);
  renderGalgameSaveSlots(els.galgameSaveDialog?.dataset.mode || "load");
  showRouteEvent("存档槽已清空。");
}

function renderGalgameSaveSlots(mode = "load") {
  if (!els.galgameSaveSlots) return;
  const saves = loadGalgameSaves();
  els.galgameSaveDialog.dataset.mode = mode;
  if (els.galgameSaveDialogTitle) {
    els.galgameSaveDialogTitle.textContent = mode === "save" ? "选择存档槽" : "读取存档";
  }
  els.galgameSaveSlots.innerHTML = GALGAME_SAVE_SLOTS.map((slot, index) => {
    const save = saves[slot];
    const route = save?.routeState || {};
    const messageCount = Array.isArray(save?.messages) ? save.messages.filter((item) => item.content && item.content !== "...").length : 0;
    return `
      <article class="save-slot-card${save ? "" : " empty"}" data-save-slot="${escapeAttr(slot)}">
        <div class="save-slot-index">${String(index + 1).padStart(2, "0")}</div>
        <div class="save-slot-copy">
          <b>${GALGAME_SAVE_SLOT_LABELS[slot] || slot}</b>
          <strong>${escapeHtml(save?.characterName || "空槽位")}</strong>
          <span>${escapeHtml(save ? `${formatSaveTime(save.savedAt)} · ${route.route || "序章"} · ${messageCount} 条对话` : "还没有保存剧情进度")}</span>
        </div>
        <div class="save-slot-actions">
          <button type="button" data-save-action="${mode}" data-save-slot="${escapeAttr(slot)}">${mode === "save" ? "保存" : "读取"}</button>
          <button type="button" data-save-action="delete" data-save-slot="${escapeAttr(slot)}" ${save ? "" : "disabled"}>清空</button>
        </div>
      </article>
    `;
  }).join("");
}

function openGalgameSaveDialog(mode = "load") {
  if (!els.galgameSaveDialog) return;
  renderGalgameSaveSlots(mode);
  els.galgameSaveDialog.showModal();
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

function setLibraryPane(pane = "list") {
  const next = pane === "create" ? "create" : "list";
  state.libraryPane = next;
  els.modal.dataset.libraryPane = next;
  els.showCreate.dataset.active = next === "create" ? "true" : "false";
  els.showCreate.textContent = next === "create" ? "继续创建" : "新建角色";
}

function focusCreateName() {
  setLibraryPane("create");
  els.createForm.scrollTop = 0;
  window.requestAnimationFrame(() => els.createForm.elements.name?.focus());
}

function openCharacterLibrary(options = {}) {
  if (options.pane) setLibraryPane(options.pane);
  const album = isAlbumStyle();
  if (els.modal.open) {
    const topLayer = modalIsTopLayer();
    if ((album && topLayer) || (!album && !topLayer)) {
      els.modal.close();
    } else {
      return;
    }
  }

  if (album) {
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

function cssImageUrl(url) {
  return `url("${String(url || "").replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}")`;
}

function customBackgroundLabel(item, index) {
  return item?.name || `本地 ${index + 1}`;
}

function renderCustomGalgameBackgrounds() {
  if (!els.galgameUserBgChoices) return;
  const items = state.galgame.customBackgrounds || [];
  if (!items.length) {
    els.galgameUserBgChoices.innerHTML = "";
    els.galgameUserBgChoices.hidden = true;
    return;
  }
  els.galgameUserBgChoices.hidden = false;
  els.galgameUserBgChoices.innerHTML = items.map((item, index) => `
    <button class="galgame-bg-choice galgame-custom-bg-choice" type="button" data-galgame-custom-bg="${index}" style="--bg-thumb: ${cssImageUrl(item.url)}" aria-label="本地背景：${escapeAttr(customBackgroundLabel(item, index))}">
      ${escapeHtml(customBackgroundLabel(item, index))}
    </button>
  `).join("");
}

function syncCustomBackgroundActive() {
  els.galgameUserBgChoices?.querySelectorAll("[data-galgame-custom-bg]").forEach((button) => {
    const item = state.galgame.customBackgrounds[Number(button.dataset.galgameCustomBg)];
    const active = state.galgame.background === "custom" && item?.url === state.galgame.customBackground;
    button.dataset.active = active ? "true" : "false";
    button.setAttribute("aria-pressed", String(active));
  });
}

function setGalgameAtmosphere(enabled) {
  state.galgame.atmosphere = Boolean(enabled);
  document.documentElement.dataset.galgameAtmosphere = state.galgame.atmosphere ? "on" : "off";
  if (els.galgameAtmosphere) {
    els.galgameAtmosphere.dataset.active = state.galgame.atmosphere ? "true" : "false";
    els.galgameAtmosphere.setAttribute("aria-pressed", String(state.galgame.atmosphere));
  }
}

function applyGalgameBackground(key) {
  const customReady = key === "custom" && state.galgame.customBackground;
  const nextKey = customReady ? "custom" : GALGAME_BACKGROUNDS[key] ? key : "riverside";
  const imageUrl = nextKey === "custom" ? state.galgame.customBackground : GALGAME_BACKGROUNDS[nextKey];
  const previousImage = getComputedStyle(document.documentElement).getPropertyValue("--galgame-bg-image").trim();
  if (previousImage && previousImage !== cssImageUrl(imageUrl)) {
    document.documentElement.style.setProperty("--galgame-bg-image-prev", previousImage);
    document.documentElement.dataset.bgTransition = "active";
    clearTimeout(applyGalgameBackground.transitionTimer);
    applyGalgameBackground.transitionTimer = setTimeout(() => {
      delete document.documentElement.dataset.bgTransition;
    }, 520);
  }
  state.galgame.background = nextKey;
  document.documentElement.dataset.galgameScene = nextKey;
  document.documentElement.style.setProperty("--galgame-bg-image", cssImageUrl(imageUrl));
  els.galgameBgPicker?.querySelectorAll("[data-galgame-bg]").forEach((button) => {
    const active = button.dataset.galgameBg === nextKey;
    button.dataset.active = active ? "true" : "false";
    button.setAttribute("aria-pressed", String(active));
  });
  const upload = els.galgameBgPicker?.querySelector(".galgame-bg-upload");
  if (upload) upload.dataset.active = nextKey === "custom" ? "true" : "false";
  syncCustomBackgroundActive();
}

function inferGalgameScene(...parts) {
  const text = parts.join(" ");
  if (/图书馆|书架|书店|阅读|书本|library|book/i.test(text)) return "library";
  if (/海|海边|车站|电车|站台|沙滩|seaside|station|train|beach/i.test(text)) return "seaside";
  if (/神社|鸟居|祭典|参拜|祈愿|shrine|festival/i.test(text)) return "shrine";
  if (/咖啡|茶|甜点|店|约会|cafe|coffee|dessert/i.test(text)) return "cafe";
  if (/天台|屋顶| rooftop|风很大|放学/i.test(text)) return "rooftop";
  if (/教室|课堂|学校|课后|校园|黑板|classroom|school/i.test(text)) return "classroom";
  if (/雨|夜|街|路灯|车站|巷|霓虹|rain|street|station|night/i.test(text)) return "street";
  if (/公寓|夜景|窗边|夜晚房间|night room|apartment/i.test(text)) return "nightRoom";
  if (/房间|卧室|家里|宅邸|女仆|料理|餐点|休息|room|home|maid/i.test(text)) return "room";
  if (/樱|花瓣|春|约会|公园|sakura|cherry/i.test(text)) return "sakura";
  if (/河|桥|散步|岸|黄昏|riverside|walk/i.test(text)) return "riverside";
  return "";
}

function maybeApplyAutoScene(...parts) {
  if (!isGalgameStyle() || !state.galgame.autoScene || state.galgame.background === "custom") return;
  const scene = inferGalgameScene(...parts);
  if (scene && scene !== state.galgame.background) {
    applyGalgameBackground(scene);
    saveSettings();
    appendGalgameEvent("场景切换。", "scene");
  }
}

function syncGalgameToolButtons() {
  if (els.galgameAuto) {
    els.galgameAuto.dataset.active = state.galgame.autoPlay ? "true" : "false";
    els.galgameAuto.setAttribute("aria-pressed", String(state.galgame.autoPlay));
  }
  if (els.galgameSkipRead) {
    els.galgameSkipRead.dataset.active = state.galgame.skipRead ? "true" : "false";
    els.galgameSkipRead.setAttribute("aria-pressed", String(state.galgame.skipRead));
  }
  if (els.galgameAutoScene) {
    els.galgameAutoScene.dataset.active = state.galgame.autoScene ? "true" : "false";
    els.galgameAutoScene.setAttribute("aria-pressed", String(state.galgame.autoScene));
  }
  if (els.galgameChoiceFrequency) {
    els.galgameChoiceFrequency.value = routeChoiceFrequency();
  }
  setGalgameAtmosphere(state.galgame.atmosphere);
  updateRouteFeedback();
}

function inferEmotion(...parts) {
  const text = parts.join(" ").toLowerCase();
  if (/害羞|脸红|不好意思|喜欢|心动|shy|照れ|恥ずか/.test(text)) return "shy";
  if (/生气|讨厌|烦|angry|怒|ばか|バカ/.test(text)) return "angry";
  if (/难过|寂寞|孤独|哭|抱歉|sad|泣|つら/.test(text)) return "sad";
  if (/惊|诶|欸|不会吧|surprise|えっ|びっくり/.test(text)) return "surprised";
  if (/开心|高兴|谢谢|太好了|笑|happy|嬉|楽しい/.test(text)) return "happy";
  return "calm";
}

function setPetEmotion(emotion = "calm") {
  const next = ["calm", "happy", "shy", "sad", "angry", "surprised"].includes(emotion) ? emotion : "calm";
  state.galgame.emotion = next;
  [els.petActor, els.live2dStage].filter(Boolean).forEach((target) => {
    target.dataset.emotion = next;
  });
}

function readImageAsCompressedDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("没有选择图片"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取背景图失败"));
    reader.onload = async () => {
      const source = String(reader.result || "");
      if (!source.startsWith("data:image/")) {
        reject(new Error("请选择图片文件"));
        return;
      }

      try {
        const image = new Image();
        image.onload = () => {
          const maxEdge = 1920;
          const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
          const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
          const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d", { alpha: false });
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = "high";
          context.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.9));
        };
        image.onerror = () => resolve(source);
        image.src = source;
      } catch {
        resolve(source);
      }
    };
    reader.readAsDataURL(file);
  });
}

async function saveGalgameBackgroundFile(file) {
  const dataUrl = await readImageAsCompressedDataUrl(file);
  const result = await api("/api/backgrounds", {
    method: "POST",
    body: JSON.stringify({
      name: file?.name || "uploaded-background",
      dataUrl
    })
  });
  return result.background;
}

function applyUiStyle(style) {
  const nextStyle = UI_STYLES.has(style) ? style : "workbench";
  document.documentElement.dataset.uiStyle = nextStyle;
  document.documentElement.dataset.galgameMenu = "closed";
  els.styleDock?.setAttribute("aria-expanded", "false");
  els.input.placeholder = nextStyle === "galgame" ? GALGAME_INPUT_PLACEHOLDER : DEFAULT_INPUT_PLACEHOLDER;
  els.styleInputs.forEach((input) => {
    input.checked = input.value === nextStyle;
  });
  syncStyleModeUi();
  syncGalgameToolButtons();
  if (state.current) renderMessages();
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

function saveCurrentCharacterId(id) {
  if (id) {
    localStorage.setItem(CURRENT_CHARACTER_KEY, id);
  } else {
    localStorage.removeItem(CURRENT_CHARACTER_KEY);
  }
}

function petImageFor(character) {
  return character?.petImageUrl || "";
}

function classifyPetBackdrop(image) {
  image.classList.remove("dark-backdrop-pet", "light-backdrop-pet", "unclean-pet");
  if (!image.naturalWidth || !image.naturalHeight) return;

  try {
    const size = 42;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    let count = 0;
    let opaque = 0;
    let brightness = 0;

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const edge = x < 3 || y < 3 || x >= size - 3 || y >= size - 3;
        if (!edge) continue;
        const index = (y * size + x) * 4;
        const alpha = data[index + 3];
        if (alpha <= 18) continue;
        count += 1;
        opaque += alpha / 255;
        brightness += (data[index] + data[index + 1] + data[index + 2]) / 3;
      }
    }

    if (!count) return;
    const opaqueRatio = opaque / count;
    const avgBrightness = brightness / count;
    if (opaqueRatio < 0.32) return;

    image.classList.add("unclean-pet");
    if (avgBrightness < 72) {
      image.classList.add("dark-backdrop-pet");
    } else if (avgBrightness > 184) {
      image.classList.add("light-backdrop-pet");
    }
  } catch {
    // Cross-origin images can taint canvas; fall back to extension-based styling.
  }
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
  const ranked = rankedCandidates(candidates).map((entry) => entry.item);
  return ranked.find((item) => kinds.includes(item.best)) || ranked[0];
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
  saveCurrentCharacterId(character.id);
  state.messages = [];
  state.sessionId = null;
  state.pet.lastSpeech = "";
  state.pet.x = 0;
  state.pet.y = 0;
  routeStateFor(character);
  updateRouteFeedback(routeStateFor(character));
  resetGalgameTyping();
  setGalgameDialogueHidden(false);
  if (els.galgameLog) els.galgameLog.hidden = true;

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
  maybeTriggerDailyEvent(character);
  renderPlayStatus(routeStateFor(character));
  if (els.reprocessPetImage) {
    els.reprocessPetImage.hidden = character.petStyle === "live2d";
    els.reprocessPetImage.disabled = !character.petImageUrl && !character.imageUrl;
  }
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
    els.petAvatar.classList.remove("opaque-pet", "dark-backdrop-pet", "light-backdrop-pet", "unclean-pet");
    els.petAvatar.classList.toggle("opaque-pet", /\.(jpe?g|webp)(?:[?#].*)?$/i.test(petImageUrl));
    els.petAvatar.onload = () => classifyPetBackdrop(els.petAvatar);
    els.petAvatar.onerror = () => {
      els.petActor.hidden = true;
      els.petEmpty.hidden = false;
    };
    els.petAvatar.src = petImageUrl;
  } else {
    els.live2dStage.hidden = true;
    els.petActor.classList.remove("chibi-pet");
    els.petAvatar.classList.remove("opaque-pet", "dark-backdrop-pet", "light-backdrop-pet", "unclean-pet");
    els.petActor.hidden = true;
    els.petEmpty.hidden = false;
  }
  setPetEmotion("calm");
  scheduleIdlePetMotion();

  syncStyleModeUi();
  renderMessages();
}

function clearCharacter() {
  state.current = null;
  if (els.reprocessPetImage) {
    els.reprocessPetImage.hidden = true;
    els.reprocessPetImage.disabled = true;
  }
  if (els.playStatus) {
    els.playStatus.hidden = true;
    els.playStatus.innerHTML = "";
  }
  saveCurrentCharacterId("");
  state.messages = [];
  state.sessionId = null;
  state.pet.lastSpeech = "";
  resetGalgameTyping();
  setGalgameDialogueHidden(false);
  if (els.galgameLog) els.galgameLog.hidden = true;
  $("#currentThumb").src = AVATAR_PLACEHOLDER;
  els.activeAvatar.src = AVATAR_PLACEHOLDER;
  $("#currentName").textContent = "选择角色";
  $("#currentWork").textContent = "新建或选择一个聊天对象";
  $("#chatTitle").textContent = "请选择聊天对象";
  document.documentElement.style.setProperty("--galgame-name", "\"角色\"");
  updateRouteFeedback(defaultRouteState());
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
  clearTimeout(state.pet.idleTimer);
  syncStyleModeUi();
  renderMessages();
}

function petStyleLabel(style) {
  return {
    chibi: "Q版桌宠",
    live2d: "Live2D",
    standee: "普通立绘"
  }[style] || "普通立绘";
}

function characterSearchText(item) {
  return [
    item.name,
    item.work,
    item.subtitle,
    item.prompt,
    item.voiceName,
    item.voiceId,
    petStyleLabel(item.petStyle),
    ...(item.tags || [])
  ].filter(Boolean).join(" ").toLowerCase();
}

function renderCharacterEmpty(keyword) {
  const title = state.characters.length ? `没有找到「${keyword}」` : "角色库还是空的";
  const hint = state.characters.length
    ? "换个关键词，或者直接新建一个角色卡。"
    : "输入角色名后可以自动抓图、生成角色卡，再选择桌宠模式。";
  const actions = state.characters.length
    ? `<button type="button" data-action="clear-search">清空搜索</button>`
      + `<button type="button" data-action="create">打开创建面板</button>`
    : `<button type="button" data-action="create">新建第一个角色</button>`;
  return `
    <div class="character-empty" role="status">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(hint)}</span>
      <div class="character-empty-actions">
        ${actions}
      </div>
    </div>
  `;
}

function renderCharacters() {
  const keyword = els.search.value.trim().toLowerCase();
  const items = state.characters.filter((item) => {
    return !keyword || characterSearchText(item).includes(keyword);
  });

  els.libraryCount.textContent = keyword
    ? `${items.length}/${state.characters.length} 个角色`
    : `${state.characters.length} 个角色`;

  if (!items.length) {
    els.grid.innerHTML = renderCharacterEmpty(keyword);
    return;
  }

  els.grid.innerHTML = items.map((item) => `
    <article class="character-card ${state.current?.id === item.id ? "active" : ""}" data-id="${escapeAttr(item.id)}" ${state.current?.id === item.id ? 'aria-current="true"' : ""}>
      <button class="character-pick" type="button" data-action="pick" data-id="${escapeAttr(item.id)}" aria-label="选择 ${escapeAttr(item.name)}">
        <img src="${escapeAttr(imageFor(item))}" alt="${escapeAttr(item.name)}" loading="lazy" />
      </button>
      <button class="delete-card" type="button" data-action="delete" data-id="${escapeAttr(item.id)}" aria-label="删除 ${escapeAttr(item.name)}">删除</button>
      <div class="character-card-copy">
        <div class="character-card-title">
          <b>${escapeHtml(item.name)}</b>
          ${state.current?.id === item.id ? "<span>使用中</span>" : ""}
        </div>
        <small>${escapeHtml(item.work || "自定义角色")}</small>
        ${item.subtitle ? `<p>${escapeHtml(item.subtitle)}</p>` : ""}
        <div class="character-card-meta" aria-label="角色素材状态">
          <span>${escapeHtml(petStyleLabel(item.petStyle))}</span>
          <span>路线 ${routeCompletion(routeStateFor(item))}%</span>
          ${item.voiceId || item.voiceName ? "<span>已配音</span>" : ""}
          ${item.sourceUrl ? "<span>有来源</span>" : ""}
        </div>
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

function scoreCandidateImage(item) {
  const width = Number(item.width) || 0;
  const height = Number(item.height) || 0;
  const title = `${item.title || ""} ${item.url || ""}`.toLowerCase();
  const ratio = width && height ? width / height : 1;
  let score = 58;
  const issues = [];

  if (width && height) {
    const shortSide = Math.min(width, height);
    const longSide = Math.max(width, height);
    if (shortSide < 280 || longSide < 520) {
      score -= 24;
      issues.push("尺寸偏小");
    } else if (shortSide >= 520 && longSide >= 900) {
      score += 16;
    }
    if (ratio > 1.72) {
      score -= 28;
      issues.push("像横幅");
    }
    if (ratio < 0.42) {
      score -= 10;
      issues.push("过窄");
    }
  } else {
    score -= 8;
    issues.push("缺少尺寸");
  }

  if (/screenshot|screen|截图|截屏|表情|meme|emoji|icon|logo|stamp|sticker|banner|横幅|壁纸|wallpaper|cosplay|商品|周边|抱枕|figure|手办/.test(title)) {
    score -= 26;
    issues.push("疑似非立绘");
  }
  if (/watermark|sample|预览|样张|preview|pixivision/.test(title)) {
    score -= 12;
    issues.push("可能有水印");
  }
  if (/立绘|全身|standing|standee|full.?body|official|公式|transparent|png/.test(title)) score += 18;
  if (/头像|face|icon|profile|avatar|head/.test(title)) score += item.best === "avatar" ? 14 : -4;
  if (/chibi|q版|sd|ねんどろ|nendoroid/.test(title)) score += item.best === "chibi" ? 16 : -2;
  if (item.best === "standee" && ratio < 0.86) score += 12;
  if (item.best === "avatar" && ratio > 0.72 && ratio < 1.34) score += 10;

  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: normalized,
    label: normalized >= 78 ? "优选" : normalized >= 58 ? "可用" : "慎用",
    issues: [...new Set(issues)].slice(0, 3)
  };
}

function rankedCandidates(candidates) {
  return candidates
    .map((item, originalIndex) => ({ item, originalIndex, quality: scoreCandidateImage(item) }))
    .sort((a, b) => b.quality.score - a.quality.score);
}

function renderCandidateGrid(candidates) {
  if (!candidates.length) {
    els.candidateGrid.hidden = true;
    els.candidateGrid.innerHTML = "";
    return;
  }

  els.candidateGrid.hidden = false;
  els.candidateGrid.innerHTML = rankedCandidates(candidates).map(({ item, originalIndex, quality }) => `
    <article class="candidate-card" data-quality="${escapeAttr(quality.label)}">
      <div class="candidate-thumb">
        <img src="${escapeAttr(item.thumbUrl || item.url)}" alt="${escapeAttr(item.title)}" loading="lazy" />
      </div>
      <div class="candidate-copy">
        <div class="candidate-meta">
          <div class="candidate-badges">
            <b>${candidateKindLabel(item.best)}</b>
            <span class="quality-badge">${quality.label} ${quality.score}</span>
          </div>
          <small>${escapeHtml(item.width && item.height ? `${item.width} x ${item.height}` : item.title)}</small>
          ${quality.issues.length ? `<em>${quality.issues.map(escapeHtml).join(" · ")}</em>` : ""}
        </div>
        <div class="candidate-actions">
          <button type="button" data-candidate="${originalIndex}" data-target-field="avatarUrl">头像</button>
          <button type="button" data-candidate="${originalIndex}" data-target-field="imageUrl">卡片</button>
          <button type="button" data-candidate="${originalIndex}" data-target-field="petImageUrl">桌宠</button>
        </div>
      </div>
    </article>
  `).join("");
}

async function fetchImageCandidates() {
  const name = els.createForm.elements.name.value.trim();
  const work = els.createForm.elements.work.value.trim();
  const queryKey = `${name}@@${work}`;
  if (!name) {
    els.candidateStatus.textContent = "先填写角色名";
    return;
  }
  if (state.candidateQuery === queryKey && state.candidates.length) return;

  els.fetchCandidates.disabled = true;
  els.candidateStatus.textContent = "正在抓取候选图...";
  try {
    const params = new URLSearchParams({ name });
    if (work) params.set("work", work);
    const result = await api(`/api/image-candidates?${params.toString()}`);
    if (els.createForm.elements.name.value.trim() !== name) return;
    state.candidates = result.candidates || [];
    state.candidateQuery = queryKey;
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
  const work = els.createForm.elements.work.value.trim();
  const queryKey = `${name}@@${work}`;
  if (name.length < 2) {
    els.candidateStatus.textContent = "";
    return;
  }
  if (state.candidateQuery === queryKey) return;
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
      ${choices.map((text) => `<button type="button" data-starter="${escapeAttr(text)}">${escapeHtml(String(text).replace(/^【选择】/, ""))}</button>`).join("")}
    </div>
  `;
}

function routeChoiceLabel(text) {
  const value = typeof text === "object" && text ? (text.label || text.text || "") : text;
  return String(value || "").replace(/^\u3010\u9009\u62e9\u3011/, "");
}

function routeChoicePrompt(text, effects = {}) {
  return {
    text: `【选择】${text}`,
    label: text,
    effects
  };
}

function routeChoicePayload(choice) {
  if (typeof choice === "object" && choice) return choice;
  const label = routeChoiceLabel(choice);
  return { text: String(choice || ""), label, effects: {} };
}

function routeChoiceFrequency() {
  const value = state.galgame.choiceFrequency || els.galgameChoiceFrequency?.value || "normal";
  return ["off", "low", "normal", "high"].includes(value) ? value : "normal";
}

function routeChoiceInterval() {
  return {
    high: 2,
    normal: 3,
    low: 5
  }[routeChoiceFrequency()] || 3;
}

function shouldShowRouteChoices(latestMessage, assistantTurns, invitesChoice) {
  const frequency = routeChoiceFrequency();
  if (!isGalgameStyle() || frequency === "off") return false;
  if (invitesChoice) return true;
  return assistantTurns > 0 && assistantTurns % routeChoiceInterval() === 0;
}

function renderRouteChoiceButtons(choices) {
  if (!choices.length) return "";
  return `
    <div class="galgame-choices" role="group" aria-label="路线选择">
      ${choices.map((choice) => {
        const payload = routeChoicePayload(choice);
        return `
        <button type="button" data-starter="${escapeAttr(payload.text)}" data-route-choice="true" data-route-effects="${escapeAttr(JSON.stringify(payload.effects || {}))}" aria-label="${escapeAttr(routeChoiceLabel(payload))}">
          <span>${escapeHtml(routeChoiceLabel(payload))}</span>
        </button>
      `;
      }).join("")}
    </div>
  `;
}

function latestAssistantChoiceKey() {
  for (let index = state.messages.length - 1; index >= 0; index -= 1) {
    const message = state.messages[index];
    if (message?.role === "assistant" && message.content && message.content !== "...") {
      return { message, index, key: messageKey(message, index) };
    }
  }
  return null;
}

function currentRouteChoices() {
  const latest = latestAssistantChoiceKey();
  if (!latest) return { latest: null, choices: [] };
  return {
    latest,
    choices: state.galgame.routeChoices[latest.key]?.length
      ? state.galgame.routeChoices[latest.key]
      : galgameRouteChoices(latest.message)
  };
}

function openRouteEditor() {
  if (!els.routeEditor || !els.routeEditorBody) return;
  const { latest, choices } = currentRouteChoices();
  if (!latest || !choices.length) {
    if (els.routeEditorStatus) els.routeEditorStatus.textContent = "当前没有可编辑的分支。";
    showRouteEvent("当前没有可编辑的分支。");
    return;
  }
  els.routeEditor.dataset.choiceKey = latest.key;
  els.routeEditorBody.innerHTML = choices.slice(0, 4).map((choice, index) => {
    const payload = routeChoicePayload(choice);
    const effects = payload.effects || {};
    return `
      <fieldset class="route-editor-row">
        <label>分支台词
          <input name="label-${index}" value="${escapeAttr(routeChoiceLabel(payload))}" />
        </label>
        <div class="route-editor-effects">
          <label>好感 <input name="affection-${index}" type="number" min="-5" max="5" value="${Number(effects.affection) || 0}" /></label>
          <label>信赖 <input name="trust-${index}" type="number" min="-5" max="5" value="${Number(effects.trust) || 0}" /></label>
          <label>亲密 <input name="intimacy-${index}" type="number" min="-5" max="5" value="${Number(effects.intimacy) || 0}" /></label>
          <label>语气 <input name="tone-${index}" value="${escapeAttr(effects.tone || "")}" /></label>
        </div>
      </fieldset>
    `;
  }).join("");
  if (els.routeEditorStatus) els.routeEditorStatus.textContent = routeFeedbackText();
  els.routeEditor.showModal();
}

function saveRouteEditor() {
  if (!els.routeEditor || !els.routeEditorForm) return;
  const key = els.routeEditor.dataset.choiceKey;
  if (!key) return;
  const form = new FormData(els.routeEditorForm);
  const choices = [];
  for (let index = 0; index < 4; index += 1) {
    const label = String(form.get(`label-${index}`) || "").trim();
    if (!label) continue;
    choices.push(routeChoicePrompt(label, {
      affection: Number(form.get(`affection-${index}`)) || 0,
      trust: Number(form.get(`trust-${index}`)) || 0,
      intimacy: Number(form.get(`intimacy-${index}`)) || 0,
      tone: String(form.get(`tone-${index}`) || "").trim()
    }));
  }
  if (!choices.length) return;
  state.galgame.routeChoices[key] = choices;
  appendGalgameEvent("分支已调整。", "route");
  els.routeEditor.close();
  renderMessages({ skipGalgameTypingStart: true });
}

function galgameRouteChoices(latestMessage) {
  if (!state.current || !latestMessage || latestMessage.role !== "assistant") return [];
  if (latestMessage.content === "..." || state.galgame.typingKey) return [];
  const key = messageKey(latestMessage, state.messages.indexOf(latestMessage));

  const assistantTurns = state.messages.filter((message) => message.role === "assistant" && message.content !== "...").length;
  const content = String(latestMessage.content || "");
  const choicePhrases = ["怎么办", "要不要", "可以吗", "愿意", "想不想", "怎么", "如何", "哪里", "哪边", "选择", "决定", "一起", "陪我", "跟我", "去吗", "どう", "かな", "どちら", "一緒", "行く", "来て", "選"];
  const hasQuestion = /[？?]/.test(content);
  const invitesChoice = hasQuestion || choicePhrases.some((phrase) => content.includes(phrase));
  if (!shouldShowRouteChoices(latestMessage, assistantTurns, invitesChoice)) return [];
  if (state.galgame.routeChoices[key]?.length) return state.galgame.routeChoices[key];

  const name = state.current.name;
  const template = routeStateFor().template || "default";
  const isInvitation = /一起|陪|跟我|去|来|留下|走|看看|约|一緒|行く|来て/.test(content);
  const isVulnerable = /害怕|担心|不安|难过|孤独|寂寞|痛|哭|迷茫|不知|怖|寂|泣/.test(content);
  const isConflict = /讨厌|生气|别过来|别说|别碰|烦死|吵死|笨蛋|滚|怒|嫌い|バカ/.test(content);
  const isWarm = /喜欢|可爱|谢谢|高兴|开心|楽しい|好き|ありがとう/.test(content);
  const isDaily = /日常|工作|家务|打扫|餐点|准备|忙|偷懒|期待|陪伴|主人|说话|今日|生活/.test(content);
  let choices;

  if (isDaily) {
    choices = [
      routeChoicePrompt(`问问${name}今天最累的事`, { affection: 0, trust: 2, intimacy: 0, tone: "daily-care" }),
      routeChoicePrompt("夸她已经做得很好了", { affection: 2, trust: 1, intimacy: 1, tone: "praise" }),
      routeChoicePrompt("邀请她先休息一会儿", { affection: 1, trust: 1, intimacy: 2, tone: "rest-together" })
    ];
  } else if (isInvitation) {
    choices = [
      routeChoicePrompt(`答应${name}，立刻一起出发`, { affection: 2, trust: 1, intimacy: 2, tone: "accept" }),
      routeChoicePrompt(`故意逗${name}一下再答应`, { affection: 2, trust: 0, intimacy: 1, tone: "tease" }),
      routeChoicePrompt("先停在原地，问清真正的理由", { affection: 0, trust: 2, intimacy: -1, tone: "cautious" })
    ];
  } else if (isVulnerable) {
    choices = [
      routeChoicePrompt(`认真安慰${name}`, { affection: 1, trust: 2, intimacy: 1, tone: "comfort" }),
      routeChoicePrompt("什么都不说，只是靠近一点", { affection: 2, trust: 1, intimacy: 2, tone: "silent-close" }),
      routeChoicePrompt(`追问${name}藏起来的真实想法`, { affection: -1, trust: 2, intimacy: 0, tone: "probe" })
    ];
  } else if (isConflict) {
    choices = [
      routeChoicePrompt("先低头道歉，让气氛缓下来", { affection: 1, trust: 1, intimacy: 0, tone: "apology" }),
      routeChoicePrompt("不退让，但把语气放轻", { affection: -1, trust: 2, intimacy: 0, tone: "honest" }),
      routeChoicePrompt(`换个行动证明给${name}看`, { affection: 0, trust: 2, intimacy: 1, tone: "action" })
    ];
  } else if (isWarm) {
    choices = [
      routeChoicePrompt("坦率接住这份好意", { affection: 2, trust: 1, intimacy: 1, tone: "sincere" }),
      routeChoicePrompt(`轻轻调侃${name}的反应`, { affection: 2, trust: 0, intimacy: 1, tone: "tease" }),
      routeChoicePrompt("把话题转到更私人的地方", { affection: 1, trust: 0, intimacy: 2, tone: "intimate" })
    ];
  } else if (invitesChoice) {
    choices = [
      routeChoicePrompt(`认真回答${name}的问题`, { affection: 0, trust: 2, intimacy: 0, tone: "answer" }),
      routeChoicePrompt(`先避开重点，观察${name}的反应`, { affection: -1, trust: -1, intimacy: 0, tone: "avoid" }),
      routeChoicePrompt("靠近一点，把话题说得更坦率", { affection: 2, trust: 1, intimacy: 2, tone: "direct-close" })
    ];
  } else {
    const fallbackByTemplate = {
      warm: [
        routeChoicePrompt(`陪${name}把今天慢慢说完`, { affection: 1, trust: 2, intimacy: 1, tone: "daily-care" }),
        routeChoicePrompt("把话题转到让人安心的小事", { affection: 2, trust: 0, intimacy: 1, tone: "lighten" }),
        routeChoicePrompt("安静待在她身边", { affection: 1, trust: 1, intimacy: 2, tone: "silent-close" })
      ],
      tsundere: [
        routeChoicePrompt(`故意轻轻逗${name}一下`, { affection: 2, trust: 0, intimacy: 1, tone: "tease" }),
        routeChoicePrompt("认真把话说清楚", { affection: 0, trust: 2, intimacy: 0, tone: "honest" }),
        routeChoicePrompt("先退一步，给她一点余地", { affection: 1, trust: 1, intimacy: 0, tone: "soften" })
      ],
      mystery: [
        routeChoicePrompt(`追问${name}话里藏着的部分`, { affection: -1, trust: 2, intimacy: 0, tone: "probe" }),
        routeChoicePrompt("暂时不拆穿，只陪她继续说", { affection: 1, trust: 1, intimacy: 1, tone: "patient" }),
        routeChoicePrompt("把自己的真实想法先说出来", { affection: 1, trust: 2, intimacy: 1, tone: "sincere" })
      ],
      brave: [
        routeChoicePrompt(`答应和${name}一起行动`, { affection: 2, trust: 1, intimacy: 1, tone: "accept" }),
        routeChoicePrompt("先确认她真正想要什么", { affection: 0, trust: 2, intimacy: 0, tone: "answer" }),
        routeChoicePrompt("用行动证明你站在她这边", { affection: 1, trust: 2, intimacy: 1, tone: "action" })
      ]
    };
    choices = fallbackByTemplate[template] || [
      routeChoicePrompt(`继续追问${name}刚才的想法`, { affection: 0, trust: 2, intimacy: 0, tone: "follow-up" }),
      routeChoicePrompt("换一个轻松的话题缓和气氛", { affection: 1, trust: 0, intimacy: 0, tone: "lighten" }),
      routeChoicePrompt(`选择沉默片刻，看${name}怎么回应`, { affection: 0, trust: 0, intimacy: 1, tone: "silence" })
    ];
  }

  return choices;
}

function isGalgameStyle() {
  return document.documentElement.dataset.uiStyle === "galgame";
}

function messageKey(message, index) {
  return `${index}:${message.role}:${message.content}`;
}

function resetGalgameTyping() {
  clearTimeout(state.galgame.typingTimer);
  clearTimeout(state.galgame.pendingAutoTimer);
  state.galgame.typingTimer = null;
  state.galgame.pendingAutoTimer = null;
  state.galgame.typingKey = "";
  state.galgame.completedKey = "";
  state.galgame.typingText = "";
  state.galgame.displayedText = "";
  state.galgame.typingIndex = 0;
}

function markGalgameRead(key) {
  if (!key) return;
  state.galgame.readMessageKeys[key] = true;
}

function startGalgameTyping(key, text) {
  clearTimeout(state.galgame.typingTimer);
  state.galgame.typingKey = key;
  state.galgame.completedKey = "";
  state.galgame.typingText = String(text || "");
  state.galgame.displayedText = "";
  state.galgame.typingIndex = 0;
  tickGalgameTyping();
}

function tickGalgameTyping() {
  if (!state.galgame.typingKey) return;
  const text = state.galgame.typingText;
  state.galgame.typingIndex = Math.min(text.length, state.galgame.typingIndex + 2);
  state.galgame.displayedText = text.slice(0, state.galgame.typingIndex);
  if (state.galgame.typingIndex >= text.length) {
    state.galgame.completedKey = state.galgame.typingKey;
    markGalgameRead(state.galgame.typingKey);
    state.galgame.typingKey = "";
    state.galgame.typingTimer = null;
    renderMessages({ skipGalgameTypingStart: true });
    return;
  }
  renderMessages({ skipGalgameTypingStart: true });
  state.galgame.typingTimer = setTimeout(tickGalgameTyping, 24);
}

function completeGalgameTyping() {
  if (!state.galgame.typingKey) return false;
  clearTimeout(state.galgame.typingTimer);
  state.galgame.displayedText = state.galgame.typingText;
  state.galgame.completedKey = state.galgame.typingKey;
  markGalgameRead(state.galgame.typingKey);
  state.galgame.typingKey = "";
  state.galgame.typingTimer = null;
  renderMessages({ skipGalgameTypingStart: true });
  return true;
}

function syncGalgameTyping(visibleMessages, offset, options = {}) {
  if (!isGalgameStyle() || options.skipGalgameTypingStart) return;
  const latest = visibleMessages.at(-1);
  if (!latest || latest.role !== "assistant" || latest.content === "...") return;
  const key = messageKey(latest, offset + visibleMessages.length - 1);
  if (state.galgame.typingKey === key || state.galgame.completedKey === key) return;
  if (state.galgame.skipRead && state.galgame.readMessageKeys[key]) {
    state.galgame.completedKey = key;
    state.galgame.displayedText = latest.content;
    return;
  }
  startGalgameTyping(key, latest.content);
}

function autoPlayPrompt() {
  if (!state.current) return "";
  return `继续听${state.current.name}说下去`;
}

function scheduleGalgameAutoPlay(latestVisible, choices) {
  clearTimeout(state.galgame.pendingAutoTimer);
  state.galgame.pendingAutoTimer = null;
  if (!isGalgameStyle() || !state.galgame.autoPlay || !latestVisible || latestVisible.role !== "assistant") return;
  if (state.galgame.typingKey || choices.length || latestVisible.content === "...") return;
  state.galgame.pendingAutoTimer = setTimeout(() => {
    if (!state.galgame.autoPlay || state.galgame.typingKey) return;
    const currentLatest = state.messages.at(-1);
    if (currentLatest !== latestVisible) return;
    sendMessage(autoPlayPrompt());
  }, 2200);
}

function displayMessageContent(message, index) {
  const key = messageKey(message, index);
  if (state.galgame.typingKey === key) return state.galgame.displayedText || " ";
  if (message.role === "user") return routeChoiceLabel(message.content);
  return message.content;
}

function renderGalgameLog() {
  if (!els.galgameLogBody) return;
  const query = String(els.galgameLogSearch?.value || "").trim().toLowerCase();
  const messageItems = state.messages
    .map((message, index) => ({ message, index }))
    .filter(({ message }) => message.content && message.content !== "...")
    .map(({ message, index }) => ({
      type: "message",
      at: message.at || index,
      index,
      message
    }));
  const eventItems = state.galgame.logEvents.map((event) => ({
    type: "event",
    at: event.at || 0,
    event
  }));
  const items = [...messageItems, ...eventItems]
    .sort((a, b) => Number(a.at) - Number(b.at))
    .filter((item) => {
      if (!query) return true;
      const text = item.type === "event"
        ? `${item.event.kind || ""} ${item.event.text || ""}`
        : `${item.message.role || ""} ${routeChoiceLabel(item.message.content || "")}`;
      return text.toLowerCase().includes(query);
    });
  if (els.galgameLogCount) els.galgameLogCount.textContent = `${items.length} 条`;
  if (!items.length) {
    els.galgameLogBody.innerHTML = `<p class="galgame-log-empty">${query ? "没有匹配的履历。" : "还没有对话。"}</p>`;
    return;
  }
  els.galgameLogBody.innerHTML = items.map((item) => {
    if (item.type === "event") {
      return `
        <article class="route-event">
          <b>${item.event.kind === "scene" ? "场景" : "路线"}</b>
          <p>${escapeHtml(item.event.text)}</p>
        </article>
      `;
    }
    const message = item.message;
    const isChoice = message.role === "user" && String(message.content || "").startsWith("【选择】");
    const label = message.role === "user" ? routeChoiceLabel(message.content) : message.content;
    return `
      <article class="${message.role}${isChoice ? " choice" : ""}" data-log-message="${item.index}">
        <div class="galgame-log-item-head">
          <b>${message.role === "user" ? (isChoice ? "选择" : escapeHtml(userAliasValue())) : escapeHtml(state.current?.name || "角色")}</b>
          <span>
            <button type="button" data-log-action="copy" data-log-message="${item.index}">复制</button>
            ${message.role === "assistant" ? `<button type="button" data-log-action="replay" data-log-message="${item.index}">重播</button>` : ""}
          </span>
        </div>
        <p>${escapeHtml(label)}</p>
      </article>
    `;
  }).join("");
  els.galgameLogBody.scrollTop = els.galgameLogBody.scrollHeight;
}

function setGalgameDialogueHidden(hidden) {
  state.galgame.dialogueHidden = Boolean(hidden);
  document.documentElement.dataset.galgameDialogue = state.galgame.dialogueHidden ? "hidden" : "visible";
  els.galgameHideToggle?.setAttribute("aria-pressed", String(state.galgame.dialogueHidden));
  if (els.galgameHideToggle) els.galgameHideToggle.textContent = state.galgame.dialogueHidden ? "显示" : "隐藏";
}

function renderMessages(options = {}) {
  if (!state.messages.length) {
    const starters = state.current ? [
      `今天想和${state.current.name}聊点日常`,
      `请用${state.current.name}的语气介绍自己`,
      "现在是什么心情？"
    ] : [];
    const isGalgame = isGalgameStyle();
    const emptyTitle = state.current
      ? (isGalgame ? `${state.current.name} 正在等你开口` : `准备和 ${state.current.name} 打个招呼`)
      : "先选择一个角色";
    const emptyHint = state.current
      ? (isGalgame ? "第一句话会决定这段路线的开场气氛。" : "输入第一句话，右侧桌宠会跟着回应你的互动。")
      : "创建或选择角色后，就能开始聊天和桌宠互动。";
    els.messages.innerHTML = `
      <div class="empty-state">
        <strong>${escapeHtml(emptyTitle)}</strong>
        <span>${escapeHtml(emptyHint)}</span>
        ${renderChoiceButtons(starters)}
      </div>
    `;
    updateRouteFeedback();
    return;
  }
  const isGalgame = isGalgameStyle();
  const visibleMessages = isGalgame ? state.messages.slice(-1) : state.messages;
  const offset = isGalgame ? state.messages.length - visibleMessages.length : 0;
  syncGalgameTyping(visibleMessages, offset, options);
  const latestVisible = visibleMessages.at(-1);
  const choiceBar = isGalgame ? renderRouteChoiceButtons(galgameRouteChoices(latestVisible)) : "";
  els.messages.innerHTML = visibleMessages.map((message, index) => (
    `<div class="bubble ${message.role}">${escapeHtml(displayMessageContent(message, offset + index))}</div>`
  )).join("") + choiceBar;
  els.messages.scrollTop = els.messages.scrollHeight;
  if (isGalgame) {
    renderGalgameLog();
    updateRouteFeedback();
    scheduleGalgameAutoPlay(latestVisible, galgameRouteChoices(latestVisible));
  }

  const latestAssistant = [...state.messages].reverse().find((message) => message.role === "assistant");
  if (latestAssistant?.content && latestAssistant.content !== "..." && latestAssistant.content !== state.pet.lastSpeech) {
    state.pet.lastSpeech = latestAssistant.content;
    petSpeak(latestAssistant.content, 7000);
    speakAssistant(latestAssistant.content);
  }
}

async function loadCharacters() {
  state.characters = await api("/api/characters");
  const savedId = localStorage.getItem(CURRENT_CHARACTER_KEY);
  const nextCharacter = state.characters.find((item) => item.id === savedId)
    || state.characters.find((item) => item.id === state.current?.id)
    || state.characters[0];
  if (nextCharacter) {
    applyCharacter(nextCharacter);
  } else {
    clearCharacter();
  }
  renderCharacters();
}

async function deleteCharacter(id) {
  const character = state.characters.find((item) => item.id === id);
  if (!character) return;
  if (!confirm(`删除角色「${character.name}」？此操作会同时清理对应会话。`)) return;

  const deletedIndex = state.characters.findIndex((item) => item.id === id);
  const result = await api(`/api/characters/${encodeURIComponent(id)}`, { method: "DELETE" });
  state.characters = result.characters || [];
  if (state.current?.id === id) {
    const nextCharacter = state.characters[deletedIndex] || state.characters[deletedIndex - 1] || state.characters[0];
    if (nextCharacter) {
      applyCharacter(nextCharacter);
    } else {
      clearCharacter();
      setLibraryPane("create");
    }
  } else if (state.current) {
    const refreshedCurrent = state.characters.find((item) => item.id === state.current.id);
    if (refreshedCurrent) state.current = refreshedCurrent;
  }
  renderCharacters();
}

async function sendMessage(content) {
  if (!state.current) return;
  const userMessage = { role: "user", content, at: Date.now() };
  state.messages.push(userMessage);
  renderMessages();
  els.input.value = "";
  autosize();

  const pending = { role: "assistant", content: "...", at: Date.now() + 1 };
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
        userAlias: userAliasValue(),
        enablePetAction: state.aiPetActions,
        requestRouteChoices: isGalgameStyle() && routeChoiceFrequency() !== "off",
        routeState: routeContextForPrompt(),
        messages: state.messages
          .filter((item) => item.content !== "...")
          .map(({ role, content }) => ({ role, content: role === "user" ? routeChoiceLabel(content) : content }))
      })
    });
    state.sessionId = result.sessionId;
    pending.content = result.reply;
    pending.at = Date.now();
    if (Array.isArray(result.routeChoices) && result.routeChoices.length) {
      pending.routeChoices = result.routeChoices.map((choice) => routeChoicePrompt(choice.text || choice.label, choice.effects || choice));
      state.galgame.routeChoices[messageKey(pending, state.messages.indexOf(pending))] = pending.routeChoices;
    }
    maybeApplyAutoScene(content, result.reply, routeContextForPrompt().lastTone);
    setPetEmotion(inferEmotion(content, result.reply, routeContextForPrompt().lastTone));
    applyGameplayDelta(conversationGameplayDelta(content, result.reply), "chat");
    playAiPetAction(result.petAction, content, result.reply);
  } catch (error) {
    pending.content = `调用失败：${error.message}`;
    pending.at = Date.now();
  }
  renderMessages();
}

function autosize() {
  els.input.style.height = "auto";
  els.input.style.height = `${Math.min(160, Math.max(48, els.input.scrollHeight))}px`;
}

function petSpeak(text, duration = 3600) {
  const target = visiblePetTarget();
  if (!target) return;
  const content = String(text || "").trim();
  if (!content) return;
  els.petBubble.textContent = content.length > 90 ? `${content.slice(0, 90)}...` : content;
  els.petBubble.hidden = false;
  target.dataset.speaking = "true";
  clearTimeout(petSpeak.timer);
  petSpeak.timer = setTimeout(() => {
    els.petBubble.hidden = true;
    delete target.dataset.speaking;
  }, duration);
}

function stripVoiceStageDirections(text) {
  return String(text || "")
    .replace(/（[^（）]{1,140}）/g, "")
    .replace(/\([^()]{1,140}\)/g, "")
    .replace(/【[^【】]{1,80}】/g, "")
    .replace(/［[^［］]{1,80}］/g, "")
    .replace(/\[[^\[\]]{1,80}\]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([。！？!?、，,.；;])\s*/g, "$1")
    .trim();
}

function hasChineseText(text) {
  return /[\u4e00-\u9fff]/.test(String(text || ""));
}

function shouldUseCharacterVoiceScript(provider, language, text) {
  if (provider === "browser") return false;
  if (!els.voiceAutoTranslate.checked) return false;
  if (!hasChineseText(text)) return false;
  if (isAcgnProvider(provider)) return /^(JP|JA|JAPANESE|AUTO)?$/i.test(String(language || "JP").trim());
  return true;
}

async function characterVoiceScript(text, emotion) {
  const content = stripVoiceStageDirections(text);
  if (!content) return "";
  const route = routeContextForPrompt();
  const key = JSON.stringify({
    characterId: state.current?.id || "",
    model: els.model.value.trim(),
    route: route.route,
    tone: route.lastTone,
    emotion,
    content
  });
  if (voiceScriptCache.has(key)) return voiceScriptCache.get(key);
  if (els.provider.value === "mock") return content;

  try {
    const result = await api("/api/voice-script", {
      method: "POST",
      body: JSON.stringify({
        characterId: state.current?.id,
        provider: els.provider.value,
        baseUrl: els.baseUrl.value.trim(),
        model: els.model.value.trim(),
        apiKey: els.apiKey.value.trim(),
        userAlias: userAliasValue(),
        routeState: route,
        emotion,
        targetLanguage: "JP",
        text: content
      })
    });
    const script = stripVoiceStageDirections(result.text || content);
    if (script) {
      voiceScriptCache.set(key, script);
      if (voiceScriptCache.size > 80) voiceScriptCache.delete(voiceScriptCache.keys().next().value);
      return script;
    }
  } catch (error) {
    console.warn("Voice script generation failed:", error);
  }
  return content;
}

async function speakAssistant(text) {
  if (!state.voiceEnabled) return;
  const originalContent = String(text || "").replace(/\s+/g, " ").trim();
  const content = stripVoiceStageDirections(originalContent);
  if (!content || content === "...") return;

  const route = routeStateFor();
  const voiceEmotion = voiceEmotionFor(route.lastTone || state.galgame.emotion || inferEmotion(content));
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
      const ttsContent = shouldUseCharacterVoiceScript(voiceProvider, voiceModel, content)
        ? await characterVoiceScript(content, voiceEmotion)
        : content;
      const requestAudio = (segment) => fetchTtsAudio({
        provider: voiceProvider,
        baseUrl: voiceBaseUrl,
        apiKey: voiceApiKey,
        model: voiceModel,
        voice: voiceId,
        language: isAcgnProvider(voiceProvider) ? voiceModel : undefined,
        autoTranslate: voiceProvider === "acgn-ttson" ? (ttsContent === content && els.voiceAutoTranslate.checked) : undefined,
        deviceId: voiceProvider === "acgn-ttson" ? getAcgnDeviceId() : undefined,
        emotion: voiceEmotion,
        text: segment
      });

      if (isAcgnProvider(voiceProvider)) {
        await playTtsSegments(splitTtsSegments(ttsContent), requestAudio);
      } else {
        await playTtsSegments([ttsContent], requestAudio);
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
  const browserVoice = browserVoiceStyle(voiceEmotion);
  utterance.rate = browserVoice.rate;
  utterance.pitch = browserVoice.pitch;
  const voices = window.speechSynthesis.getVoices?.() || [];
  const jpVoice = voices.find((voice) => /ja|Japanese|Japan/i.test(`${voice.lang} ${voice.name}`));
  if (jpVoice) utterance.voice = jpVoice;
  window.speechSynthesis.speak(utterance);
}

async function fetchTtsAudio(payload) {
  const cached = await getCachedTtsAudio(payload);
  if (cached) return cached;
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `TTS failed: ${response.status}`);
  }
  const blob = await response.blob();
  setCachedTtsAudio(payload, blob.clone ? blob.clone() : blob).catch(() => {});
  return blob;
}

function voiceEmotionFor(tone = "") {
  const value = String(tone || "").toLowerCase();
  if (/shy|intimate|silent-close|rest-together|direct-close/.test(value)) return "shy";
  if (/sad|apology|comfort|patient/.test(value)) return "soft";
  if (/angry|honest|probe|cautious/.test(value)) return "serious";
  if (/tease|happy|praise|accept|action|daily-care|lighten/.test(value)) return "happy";
  return inferEmotion(value);
}

function browserVoiceStyle(emotion) {
  return {
    happy: { rate: 1.05, pitch: 1.14 },
    shy: { rate: 0.94, pitch: 1.1 },
    soft: { rate: 0.9, pitch: 0.98 },
    serious: { rate: 0.96, pitch: 0.94 },
    sad: { rate: 0.88, pitch: 0.9 },
    angry: { rate: 1.04, pitch: 0.96 },
    surprised: { rate: 1.08, pitch: 1.16 }
  }[emotion] || { rate: 1, pitch: 1.08 };
}

async function ttsCacheKey(payload) {
  const stablePayload = JSON.stringify({
    provider: payload.provider,
    baseUrl: payload.baseUrl,
    model: payload.model,
    voice: payload.voice,
    language: payload.language,
    autoTranslate: payload.autoTranslate,
    emotion: payload.emotion,
    text: payload.text
  });
  if (crypto?.subtle) {
    const bytes = new TextEncoder().encode(stablePayload);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return btoa(unescape(encodeURIComponent(stablePayload))).replace(/[+/=]/g, "").slice(0, 120);
}

const memoryTtsCache = new Map();

async function getCachedTtsAudio(payload) {
  const key = await ttsCacheKey(payload);
  if (memoryTtsCache.has(key)) return memoryTtsCache.get(key).slice(0);
  if (!("caches" in window)) return null;
  const cache = await caches.open(TTS_CACHE_NAME);
  const response = await cache.match(`/__tts-cache/${key}`);
  if (!response) return null;
  const blob = await response.blob();
  memoryTtsCache.set(key, blob);
  return blob.slice(0);
}

async function setCachedTtsAudio(payload, blob) {
  const key = await ttsCacheKey(payload);
  memoryTtsCache.set(key, blob);
  if (memoryTtsCache.size > 60) {
    const firstKey = memoryTtsCache.keys().next().value;
    memoryTtsCache.delete(firstKey);
  }
  if (!("caches" in window)) return;
  const cache = await caches.open(TTS_CACHE_NAME);
  await cache.put(`/__tts-cache/${key}`, new Response(blob, { headers: { "content-type": blob.type || "audio/mpeg" } }));
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

function visiblePetTarget() {
  if (els.petActor && !els.petActor.hidden) return els.petActor;
  if (els.live2dStage && !els.live2dStage.hidden) return els.live2dStage;
  return null;
}

function scheduleIdlePetMotion() {
  clearTimeout(state.pet.idleTimer);
  const target = visiblePetTarget();
  if (!state.current || !target) return;
  state.pet.idleTimer = setTimeout(() => {
    if (!state.current || target.hidden || target.dataset.dragging === "true" || target.dataset.speaking === "true") {
      scheduleIdlePetMotion();
      return;
    }
    const index = Math.floor(Math.random() * PET_IDLE_MOTIONS.length);
    playPetMotion(PET_IDLE_MOTIONS[index]);
  }, 9000 + Math.random() * 7000);
}

function playPetMotion(name) {
  const target = visiblePetTarget();
  if (!target || !name) return;
  delete target.dataset.motion;
  void target.offsetWidth;
  target.dataset.motion = name;
  clearTimeout(playPetMotion.timer);
  playPetMotion.timer = setTimeout(() => {
    delete target.dataset.motion;
    scheduleIdlePetMotion();
  }, PET_MOTION_DURATIONS[name] || 1700);
}

function motionForPetAction(action) {
  return PET_ACTION_MOTIONS[String(action || "").trim().toLowerCase()] || "";
}

function inferClientPetAction(...parts) {
  const content = parts.join(" ").toLowerCase();
  if (/靠近|过来|近一点|come closer|near/.test(content)) return "approach";
  if (/夸|称赞|做得好|praise/.test(content)) return "praise";
  if (/拍照|合影|照片|photo|picture/.test(content)) return "photo";
  if (/叫醒|醒醒|wake/.test(content)) return "wake";
  if (/说|告诉|回答|解释|talk|speak/.test(content)) return "talk";
  if (/摸|pat|touch|抱|hug|头/.test(content)) return "touch";
  if (/吃|投喂|feed|饭|甜点|零食/.test(content)) return "feed";
  if (/玩|play|游戏|一起/.test(content)) return "play";
  if (/挥手|再见|hello|hi|你好|早|晚/.test(content)) return "wave";
  if (/害羞|脸红|shy|喜欢|可爱/.test(content)) return "shy";
  if (/休息|累|睡|困|rest/.test(content)) return "rest";
  if (/惊|surprise|吓/.test(content)) return "surprised";
  if (/生气|angry|讨厌/.test(content)) return "angry";
  if (/难过|伤心|sad|哭/.test(content)) return "sad";
  if (/开心|高兴|happy|发现我|终于/.test(content)) return "happy";
  return "happy";
}

function playAiPetAction(action, userText = "", replyText = "") {
  if (!state.aiPetActions) return;
  const normalized = String(action || "").trim().toLowerCase();
  const visibleAction = !normalized || normalized === "idle"
    ? inferClientPetAction(userText, replyText)
    : normalized;
  setPetEmotion(inferEmotion(visibleAction, userText, replyText));
  const motion = motionForPetAction(visibleAction) || motionForPetAction(inferClientPetAction(userText, replyText));
  if (!motion) return;
  playPetMotion(motion);
}

function playRouteChoiceMotion(tone = "", text = "") {
  const action = String(tone || "").trim().toLowerCase() || inferClientPetAction(text);
  const motion = motionForPetAction(action) || motionForPetAction(inferClientPetAction(text, tone)) || "happy";
  playPetMotion(motion);
}

async function handlePetAction(action) {
  if (!state.current) return;
  const motion = motionForPetAction(action) || "happy";

  playPetMotion(motion);
  const delta = interactionEffects(action);
  applyGameplayDelta(delta, action);

  if (els.provider.value === "mock") {
    const idLines = getInteractionLines(state.current);
    const fallbackLines = {
      wave: `${state.current.name}向你挥了挥手。`,
      praise: `${state.current.name}听到夸奖后，表情明显柔和了一点。`,
      approach: `${state.current.name}稍微靠近了一些。`,
      photo: `咔嚓。你为${state.current.name}留下了一张纪念照。`,
      shy: `${state.current.name}稍微移开视线，像是有点不好意思。`,
      spin: `${state.current.name}轻快地转了一圈。`,
      wake: `${state.current.name}被叫醒了，眨了眨眼看向你。`
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
els.openSettingsDrawer?.addEventListener("click", openSettingsDrawer);
els.closeSettingsDrawer?.addEventListener("click", () => els.settingsDrawer?.close());
els.openOnboarding.addEventListener("click", () => openOnboarding(true));
els.closeOnboarding.addEventListener("click", () => closeOnboarding(true));
els.finishOnboarding.addEventListener("click", () => closeOnboarding(true));
els.showCreate.addEventListener("click", focusCreateName);
els.search.addEventListener("input", renderCharacters);
els.createForm.elements.name.addEventListener("input", scheduleCandidateFetch);
els.createForm.elements.work.addEventListener("input", scheduleCandidateFetch);

[els.provider, els.aiPetActions, els.baseUrl, els.model, els.apiKey, els.userAlias, els.voiceProvider, els.voiceBaseUrl, els.voiceModel, els.voiceId, els.voiceKey, els.voiceAutoTranslate].filter(Boolean).forEach((input) => {
  input.addEventListener("change", saveSettings);
  input.addEventListener("input", saveSettings);
});

els.userAlias?.addEventListener("input", () => {
  renderGalgameLog();
});

els.aiPetActions?.addEventListener("change", () => {
  state.aiPetActions = els.aiPetActions.checked;
  saveSettings();
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

els.galgameBgPicker?.addEventListener("click", (event) => {
  const customButton = event.target.closest("[data-galgame-custom-bg]");
  if (customButton) {
    const item = state.galgame.customBackgrounds[Number(customButton.dataset.galgameCustomBg)];
    if (!item?.url) return;
    state.galgame.customBackground = item.url;
    applyGalgameBackground("custom");
    saveSettings();
    return;
  }

  const button = event.target.closest("[data-galgame-bg]");
  if (!button) return;
  applyGalgameBackground(button.dataset.galgameBg);
  saveSettings();
});

els.galgameBgUpload?.addEventListener("change", async () => {
  const file = els.galgameBgUpload.files?.[0];
  if (!file) return;
  try {
    const background = await saveGalgameBackgroundFile(file);
    state.galgame.customBackground = background.url;
    state.galgame.customBackgrounds = [
      ...(state.galgame.customBackgrounds || []).filter((item) => item.url !== background.url),
      background
    ].slice(-18);
    renderCustomGalgameBackgrounds();
  } catch (error) {
    alert(error.message);
    els.galgameBgUpload.value = "";
    return;
  }

  applyGalgameBackground("custom");
  try {
    saveSettings();
    showRouteEvent("本地背景已加入图库。");
  } catch (error) {
    alert(`背景已临时应用，但没有保存到本地：${error.message}`);
  } finally {
    els.galgameBgUpload.value = "";
  }
});

els.galgameAtmosphere?.addEventListener("click", () => {
  setGalgameAtmosphere(!state.galgame.atmosphere);
  saveSettings();
});

els.galgameLogToggle?.addEventListener("click", () => {
  renderGalgameLog();
  els.galgameLog.hidden = !els.galgameLog.hidden;
});

els.galgameLogSearch?.addEventListener("input", renderGalgameLog);

els.galgameLogBody?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-log-action][data-log-message]");
  if (!button) return;
  const message = state.messages[Number(button.dataset.logMessage)];
  if (!message?.content) return;
  if (button.dataset.logAction === "copy") {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(routeChoiceLabel(message.content)).catch(() => {});
    }
    button.textContent = "已复制";
    setTimeout(() => {
      button.textContent = "复制";
    }, 900);
    return;
  }
  if (button.dataset.logAction === "replay") {
    const wasVoiceEnabled = state.voiceEnabled;
    state.voiceEnabled = true;
    syncVoiceUi();
    await speakAssistant(message.content);
    state.voiceEnabled = wasVoiceEnabled;
    syncVoiceUi();
  }
});

els.galgameLogClose?.addEventListener("click", () => {
  els.galgameLog.hidden = true;
});

els.galgameSkipText?.addEventListener("click", () => {
  completeGalgameTyping();
});

els.galgameHideToggle?.addEventListener("click", () => {
  setGalgameDialogueHidden(!state.galgame.dialogueHidden);
});

els.galgameSave?.addEventListener("click", () => {
  openGalgameSaveDialog("save");
});

els.galgameLoad?.addEventListener("click", () => {
  openGalgameSaveDialog("load");
});

els.galgameSaveDialogClose?.addEventListener("click", () => {
  els.galgameSaveDialog?.close();
});

els.galgameSaveSlots?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-save-action][data-save-slot]");
  if (!button) return;
  const slot = button.dataset.saveSlot;
  if (button.dataset.saveAction === "save") {
    saveGalgameSlot(slot);
    return;
  }
  if (button.dataset.saveAction === "load") {
    loadGalgameSlot(slot);
    els.galgameSaveDialog?.close();
    return;
  }
  if (button.dataset.saveAction === "delete") {
    deleteGalgameSlot(slot);
  }
});

els.galgameAuto?.addEventListener("click", () => {
  state.galgame.autoPlay = !state.galgame.autoPlay;
  syncGalgameToolButtons();
  renderMessages({ skipGalgameTypingStart: true });
});

els.galgameSkipRead?.addEventListener("click", () => {
  state.galgame.skipRead = !state.galgame.skipRead;
  syncGalgameToolButtons();
  renderMessages({ skipGalgameTypingStart: true });
});

els.galgameAutoScene?.addEventListener("click", () => {
  state.galgame.autoScene = !state.galgame.autoScene;
  syncGalgameToolButtons();
  saveSettings();
});

els.galgameChoiceFrequency?.addEventListener("change", () => {
  state.galgame.choiceFrequency = routeChoiceFrequency();
  saveSettings();
  renderMessages({ skipGalgameTypingStart: true });
});

els.galgameBranchEdit?.addEventListener("click", openRouteEditor);

els.routeEditorClose?.addEventListener("click", () => {
  els.routeEditor.close();
});

els.routeEditorCancel?.addEventListener("click", () => {
  els.routeEditor.close();
});

els.routeEditorForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveRouteEditor();
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
  handlePetAction("touch");
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
  clearTimeout(state.pet.idleTimer);
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
  } else {
    scheduleIdlePetMotion();
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
  if (action.dataset.action === "create") {
    focusCreateName();
    return;
  }
  if (action.dataset.action === "clear-search") {
    els.search.value = "";
    setLibraryPane("list");
    renderCharacters();
    els.search.focus();
    return;
  }
  if (action.dataset.action === "delete") {
    deleteCharacter(id);
    return;
  }
  if (action.dataset.action === "pick") {
    const character = state.characters.find((item) => item.id === id);
    if (!character) return;
    applyCharacter(character);
    renderCharacters();
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
  if (!button) {
    if (isGalgameStyle()) completeGalgameTyping();
    return;
  }
  if (!state.current) return;
  if (button.dataset.routeChoice === "true") {
    const group = button.closest(".galgame-choices");
    if (group?.dataset.selecting === "true") return;
    group?.setAttribute("data-selecting", "true");
    button.dataset.selected = "true";
    try {
      const effects = JSON.parse(button.dataset.routeEffects || "{}");
      applyRouteEffects(effects, button.dataset.starter);
      maybeApplyAutoScene(button.dataset.starter, effects.tone || "");
      setPetEmotion(inferEmotion(button.dataset.starter, effects.tone || ""));
      playRouteChoiceMotion(effects.tone || "", button.dataset.starter);
    } catch {
      applyRouteEffects({}, button.dataset.starter);
    }
  } else if (isGalgameStyle() && completeGalgameTyping()) {
    return;
  }
  sendMessage(button.dataset.starter);
});

els.styleDock?.addEventListener("click", (event) => {
  if (!isGalgameStyle()) return;
  if (event.target !== els.styleDock) return;
  const nextOpen = document.documentElement.dataset.galgameMenu !== "open";
  document.documentElement.dataset.galgameMenu = nextOpen ? "open" : "closed";
  els.styleDock.setAttribute("aria-expanded", String(nextOpen));
});

document.addEventListener("pointerdown", (event) => {
  if (!isGalgameStyle() || document.documentElement.dataset.galgameMenu !== "open") return;
  if (els.styleDock?.contains(event.target)) return;
  document.documentElement.dataset.galgameMenu = "closed";
  els.styleDock?.setAttribute("aria-expanded", "false");
});

document.addEventListener("keydown", (event) => {
  if (!isGalgameStyle()) return;
  if (event.key === "Escape" && document.documentElement.dataset.galgameMenu === "open") {
    document.documentElement.dataset.galgameMenu = "closed";
    els.styleDock?.setAttribute("aria-expanded", "false");
    return;
  }
  if (event.key === "Escape" && els.galgameLog && !els.galgameLog.hidden) {
    els.galgameLog.hidden = true;
    return;
  }
  if (event.key === " " && document.activeElement !== els.input && completeGalgameTyping()) {
    event.preventDefault();
    return;
  }
  if (/^[1-3]$/.test(event.key) && document.activeElement !== els.input) {
    const buttons = [...els.messages.querySelectorAll(".galgame-choices [data-route-choice]")];
    const button = buttons[Number(event.key) - 1];
    if (!button) return;
    event.preventDefault();
    button.click();
  }
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
  if (state.current?.id) {
    state.routeStates[state.current.id] = defaultRouteState();
    saveRouteStates();
  }
  state.galgame.logEvents = [];
  state.galgame.readMessageKeys = {};
  resetGalgameTyping();
  updateRouteFeedback();
  renderMessages();
  renderGalgameLog();
});

[els.voiceToggle, els.voiceToggleDock].filter(Boolean).forEach((button) => button.addEventListener("click", () => {
  state.voiceEnabled = !state.voiceEnabled;
  if (!state.voiceEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
  syncVoiceUi();
  saveSettings();
}));

els.reprocessPetImage?.addEventListener("click", async () => {
  if (!state.current) return;
  const button = els.reprocessPetImage;
  button.disabled = true;
  const previousText = button.textContent;
  button.textContent = "正在重新处理...";
  try {
    const character = await api(`/api/characters/${encodeURIComponent(state.current.id)}/reprocess-pet`, {
      method: "POST"
    });
    state.characters = state.characters.map((item) => item.id === character.id ? character : item);
    applyCharacter(character);
    renderCharacters();
    showRouteEvent("桌宠图已重新处理。");
  } catch (error) {
    alert(`重新处理失败：${error.message}`);
  } finally {
    button.textContent = previousText;
    button.disabled = !state.current?.petImageUrl && !state.current?.imageUrl;
  }
});

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
    applyCharacter(character);
    els.search.value = "";
    setLibraryPane("list");
    renderCharacters();
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

moveSettingsPanelsToDrawer();
loadSettings();
loadRouteStates();
setTimeout(() => openOnboarding(false), 350);
loadCharacters().catch((error) => {
  els.messages.innerHTML = `<div class="empty-state">加载失败：${escapeHtml(error.message)}</div>`;
});
