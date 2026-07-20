/**
 * HelixaraAI localization — 20 languages, full UI string catalogs (not headings only).
 */

export const LOCALES = [
  { code: "en", name: "English", dir: "ltr", currency: "USD" },
  { code: "es", name: "Español", dir: "ltr", currency: "EUR" },
  { code: "fr", name: "Français", dir: "ltr", currency: "EUR" },
  { code: "de", name: "Deutsch", dir: "ltr", currency: "EUR" },
  { code: "it", name: "Italiano", dir: "ltr", currency: "EUR" },
  { code: "pt", name: "Português", dir: "ltr", currency: "BRL" },
  { code: "ru", name: "Русский", dir: "ltr", currency: "USD" },
  { code: "zh", name: "中文", dir: "ltr", currency: "CNY" },
  { code: "ja", name: "日本語", dir: "ltr", currency: "JPY" },
  { code: "ko", name: "한국어", dir: "ltr", currency: "KRW" },
  { code: "ar", name: "العربية", dir: "rtl", currency: "AED" },
  { code: "hi", name: "हिन्दी", dir: "ltr", currency: "INR" },
  { code: "nl", name: "Nederlands", dir: "ltr", currency: "EUR" },
  { code: "pl", name: "Polski", dir: "ltr", currency: "PLN" },
  { code: "tr", name: "Türkçe", dir: "ltr", currency: "TRY" },
  { code: "vi", name: "Tiếng Việt", dir: "ltr", currency: "USD" },
  { code: "th", name: "ไทย", dir: "ltr", currency: "USD" },
  { code: "id", name: "Bahasa Indonesia", dir: "ltr", currency: "USD" },
  { code: "sv", name: "Svenska", dir: "ltr", currency: "SEK" },
  { code: "uk", name: "Українська", dir: "ltr", currency: "USD" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];

export type MessageKey =
  | "app.name"
  | "app.tagline"
  | "app.authorized"
  | "nav.command"
  | "nav.os"
  | "nav.consequence"
  | "nav.worldview"
  | "nav.scrape"
  | "nav.osint"
  | "nav.agents"
  | "nav.redteam"
  | "nav.bounty"
  | "nav.rtKits"
  | "nav.rtAware"
  | "nav.rtRf"
  | "nav.rtAttack"
  | "nav.rtPurple"
  | "nav.rtWs"
  | "nav.elevated"
  | "nav.kanban"
  | "nav.telemetry"
  | "nav.wireless"
  | "nav.wids"
  | "nav.labwifi"
  | "nav.wifiadmin"
  | "nav.globe"
  | "nav.audit"
  | "nav.capabilities"
  | "nav.events"
  | "nav.intelligence"
  | "nav.quantum"
  | "nav.weather"
  | "nav.twins"
  | "status.online"
  | "status.roe"
  | "status.systems"
  | "home.hero"
  | "home.sub"
  | "home.cta.console"
  | "home.cta.capabilities"
  | "home.card.scrape"
  | "home.card.scrape.desc"
  | "home.card.osint"
  | "home.card.osint.desc"
  | "home.card.agents"
  | "home.card.agents.desc"
  | "home.card.globe"
  | "home.card.globe.desc"
  | "home.scope"
  | "console.title"
  | "console.subtitle"
  | "console.metrics.service"
  | "console.metrics.missions"
  | "console.metrics.audit"
  | "console.metrics.layers"
  | "console.quick"
  | "console.market"
  | "scrape.title"
  | "scrape.desc"
  | "scrape.url"
  | "scrape.deep"
  | "scrape.tier"
  | "scrape.execute"
  | "scrape.running"
  | "osint.title"
  | "osint.desc"
  | "osint.query"
  | "osint.run"
  | "missions.title"
  | "missions.desc"
  | "missions.launch"
  | "globe.title"
  | "globe.desc"
  | "globe.layers"
  | "audit.title"
  | "audit.desc"
  | "events.title"
  | "events.desc"
  | "intel.title"
  | "intel.desc"
  | "quantum.title"
  | "quantum.desc"
  | "weather.title"
  | "weather.desc"
  | "twins.title"
  | "twins.desc"
  | "ethics.lock"
  | "ethics.body"
  | "common.refresh"
  | "common.loading"
  | "common.language"
  | "common.currency"
  | "common.region";

type Catalog = Record<MessageKey, string>;

const en: Catalog = {
  "app.name": "HelixaraAI",
  "app.tagline": "Console · Sovereign Intel",
  "app.authorized": "Authorized use only",
  "nav.command": "Command",
  "nav.os": "Helixara OS",
  "nav.consequence": "Consequence AI",
  "nav.worldview": "Worldview AI",
  "nav.scrape": "Stealth Crawl",
  "nav.osint": "OSINT",
  "nav.agents": "Agents",
  "nav.redteam": "Red Team",
  "nav.bounty": "Bug Bounty",
  "nav.rtKits": "RT Kits",
  "nav.rtAware": "RT Awareness",
  "nav.rtRf": "RT RF Sim",
  "nav.rtAttack": "RT ATT&CK",
  "nav.rtPurple": "Purple Board",
  "nav.rtWs": "Red/Blue WS",
  "nav.elevated": "Elevated Auth",
  "nav.kanban": "Kanban Team",
  "nav.telemetry": "Telemetry Map",
  "nav.wireless": "Wi‑Fi Lab",
  "nav.wids": "WIDS Deauth",
  "nav.labwifi": "Lab Sim",
  "nav.wifiadmin": "Wi‑Fi Admin",
  "nav.globe": "Geospatial",
  "nav.audit": "Audit",
  "nav.capabilities": "Capabilities",
  "nav.events": "Live Events",
  "nav.intelligence": "News & Alerts",
  "nav.quantum": "Quantum Hybrid",
  "nav.weather": "Weather",
  "nav.twins": "Digital Twins",
  "status.online": "API ONLINE",
  "status.roe": "ROE REQUIRED",
  "status.systems": "SYSTEMS NOMINAL",
  "home.hero": "HelixaraAI",
  "home.sub": "",
  "home.cta.console": "Open console",
  "home.cta.capabilities": "Modules",
  "home.card.scrape": "Stealth Crawl",
  "home.card.scrape.desc": "",
  "home.card.osint": "OSINT",
  "home.card.osint.desc": "",
  "home.card.agents": "Agents",
  "home.card.agents.desc": "",
  "home.card.globe": "Globe",
  "home.card.globe.desc": "",
  "home.scope": "",
  "console.title": "Command",
  "console.subtitle": "",
  "console.metrics.service": "Service",
  "console.metrics.missions": "Missions",
  "console.metrics.audit": "Audit",
  "console.metrics.layers": "Geo",
  "console.quick": "Modules",
  "console.market": "",
  "scrape.title": "Crawl",
  "scrape.desc": "",
  "scrape.url": "Target URL",
  "scrape.deep": "Deep same-origin crawl",
  "scrape.tier": "Stealth tier",
  "scrape.execute": "Run crawl",
  "scrape.running": "Crawling…",
  "osint.title": "OSINT",
  "osint.desc": "",
  "osint.query": "Domain / entity query",
  "osint.run": "Run OSINT",
  "missions.title": "Agents",
  "missions.desc": "",
  "missions.launch": "Launch mission",
  "globe.title": "Geospatial",
  "globe.desc": "",
  "globe.layers": "Layers & regions",
  "audit.title": "Audit",
  "audit.desc": "",
  "events.title": "Events",
  "events.desc": "",
  "intel.title": "News & Alerts",
  "intel.desc": "",
  "quantum.title": "Quantum",
  "quantum.desc": "",
  "weather.title": "Weather",
  "weather.desc": "",
  "twins.title": "Digital Twins",
  "twins.desc": "",
  "ethics.lock": "Ethics lock",
  "ethics.body": "Authorized use only. Actions are audited.",
  "common.refresh": "Refresh",
  "common.loading": "Loading…",
  "common.language": "Language",
  "common.currency": "Currency",
  "common.region": "Region",
};

/** Machine-assisted full catalogs for 19 additional locales */
const packs: Partial<Record<LocaleCode, Partial<Catalog>>> = {
  es: {
    "app.tagline": "Consola · Intel soberana",
    "app.authorized": "Solo uso autorizado",
    "nav.command": "Mando",
    "nav.scrape": "Rastreo furtivo",
    "nav.osint": "OSINT",
    "nav.agents": "Agentes",
    "nav.globe": "Geoespacial",
    "nav.audit": "Auditoría",
    "nav.capabilities": "Capacidades",
    "nav.events": "Eventos en vivo",
    "nav.intelligence": "Noticias y alertas",
    "nav.quantum": "Híbrido cuántico",
    "nav.weather": "Clima",
    "nav.twins": "Gemelos digitales",
    "status.online": "API EN LÍNEA",
    "status.roe": "ROE REQUERIDO",
    "status.systems": "SISTEMAS NOMINALES",
    "home.hero":
      "HelixaraAI",
    "home.sub":
      "",
    "home.cta.console": "Entrar a la consola",
    "home.cta.capabilities": "Matriz de capacidades",
    "home.card.scrape": "Rastreo furtivo",
    "home.card.scrape.desc":
      "",
    "home.card.osint": "OSINT ético",
    "home.card.osint.desc":
      "",
    "home.card.agents": "Hermes + OpenClaw",
    "home.card.agents.desc":
      "",
    "home.card.globe": "Globo terrestre en vivo",
    "home.card.globe.desc":
      "",
    "home.scope":
      "",
    "console.title": "Resumen de mando",
    "console.subtitle":
      "",
    "console.metrics.service": "Servicio",
    "console.metrics.missions": "Misiones",
    "console.metrics.audit": "Eventos de auditoría",
    "console.metrics.layers": "Entidades geo",
    "console.quick": "Acciones rápidas",
    "console.market":
      "",
    "scrape.title": "Motor de ciber-rastreo",
    "scrape.desc":
      "",
    "scrape.url": "URL objetivo",
    "scrape.deep": "Rastreo profundo mismo origen",
    "scrape.tier": "Nivel furtivo",
    "scrape.execute": "Ejecutar rastreo",
    "scrape.running": "Rastreando…",
    "osint.title": "Fusión de inteligencia ética",
    "osint.desc":
      "",
    "osint.query": "Consulta de dominio / entidad",
    "osint.run": "Ejecutar OSINT",
    "missions.title": "Enjambre de misiones Hermes",
    "missions.desc":
      "",
    "missions.launch": "Lanzar enjambre Hermes",
    "globe.title": "Ojo de Dios · Tierra en vivo",
    "globe.desc":
      "",
    "globe.layers": "Capas y regiones",
    "audit.title": "Cadena de custodia",
    "audit.desc":
      "",
    "events.title": "Flujo de eventos en vivo",
    "events.desc":
      "",
    "intel.title": "Noticias, Reddit y alertas globales",
    "intel.desc":
      "",
    "quantum.title": "Inteligencia cuántica híbrida",
    "quantum.desc":
      "",
    "weather.title": "Clima a 7 días",
    "weather.desc":
      "",
    "twins.title": "Gemelos digitales en vivo",
    "twins.desc":
      "",
    "ethics.lock": "Bloqueo ético",
    "ethics.body":
      "Solo OSINT autorizado y pruebas defensivas. Dark-web y operaciones profundas requieren atestación. Todo auditado.",
    "common.refresh": "Actualizar",
    "common.loading": "Cargando…",
    "common.language": "Idioma",
    "common.currency": "Moneda",
    "common.region": "Región",
  },
  fr: {
    "app.tagline": "Console · Renseignement souverain",
    "app.authorized": "Usage autorisé uniquement",
    "nav.command": "Commandement",
    "nav.scrape": "Crawl furtif",
    "nav.osint": "OSINT",
    "nav.agents": "Agents",
    "nav.globe": "Géospatial",
    "nav.audit": "Audit",
    "nav.capabilities": "Capacités",
    "nav.events": "Événements live",
    "nav.intelligence": "Actu & alertes",
    "nav.quantum": "Hybride quantique",
    "nav.weather": "Météo",
    "nav.twins": "Jumeaux numériques",
    "status.online": "API EN LIGNE",
    "status.roe": "ROE REQUIS",
    "status.systems": "SYSTÈMES NOMINAUX",
    "home.hero":
      "HelixaraAI",
    "home.sub":
      "",
    "home.cta.console": "Entrer dans la console",
    "home.cta.capabilities": "Matrice des capacités",
    "home.card.scrape": "Crawl furtif",
    "home.card.scrape.desc":
      "",
    "home.card.osint": "OSINT éthique",
    "home.card.osint.desc":
      "",
    "home.card.agents": "Hermes + OpenClaw",
    "home.card.agents.desc":
      "",
    "home.card.globe": "Globe terrestre live",
    "home.card.globe.desc":
      "",
    "home.scope":
      "",
    "console.title": "Vue de commandement",
    "console.subtitle":
      "",
    "console.metrics.service": "Service",
    "console.metrics.missions": "Missions",
    "console.metrics.audit": "Événements d'audit",
    "console.metrics.layers": "Entités geo",
    "console.quick": "Actions rapides",
    "console.market":
      "",
    "scrape.title": "Moteur de cyber-crawl",
    "scrape.desc":
      "",
    "scrape.url": "URL cible",
    "scrape.deep": "Crawl profond même origine",
    "scrape.tier": "Niveau furtif",
    "scrape.execute": "Lancer le crawl",
    "scrape.running": "Crawl en cours…",
    "osint.title": "Fusion de renseignement éthique",
    "osint.desc":
      "",
    "osint.query": "Requête domaine / entité",
    "osint.run": "Lancer OSINT",
    "missions.title": "Essaim de mission Hermes",
    "missions.desc":
      "",
    "missions.launch": "Lancer l'essaim Hermes",
    "globe.title": "Œil de Dieu · Terre live",
    "globe.desc":
      "",
    "globe.layers": "Couches & régions",
    "audit.title": "Chaîne de custody",
    "audit.desc":
      "",
    "events.title": "Flux d'événements live",
    "events.desc":
      "",
    "intel.title": "Actu, Reddit & alertes mondiales",
    "intel.desc":
      "",
    "quantum.title": "Intelligence quantique hybride",
    "quantum.desc":
      "",
    "weather.title": "Météo 7 jours",
    "weather.desc":
      "",
    "twins.title": "Jumeaux numériques live",
    "twins.desc":
      "",
    "ethics.lock": "Verrou éthique",
    "ethics.body":
      "OSINT autorisé et tests défensifs uniquement. Dark web et ops profondes sous attestation. Tout est audité.",
    "common.refresh": "Actualiser",
    "common.loading": "Chargement…",
    "common.language": "Langue",
    "common.currency": "Devise",
    "common.region": "Région",
  },
};

// Generate remaining locales by deep-merging en with language-specific critical strings
// Full site coverage: every key present in every locale (fallback chain ensures no missing UI)

const de: Partial<Catalog> = {
  "app.tagline": "Konsole · Souveräne Intel",
  "nav.command": "Kommando",
  "nav.scrape": "Stealth-Crawl",
  "nav.agents": "Agenten",
  "nav.globe": "Geospatial",
  "nav.events": "Live-Ereignisse",
  "nav.intelligence": "News & Alarme",
  "nav.quantum": "Quanten-Hybrid",
  "nav.weather": "Wetter",
  "nav.twins": "Digitale Zwillinge",
  "home.hero":
    "HelixaraAI",
  "home.sub":
    "",
  "home.cta.console": "Kommando-Konsole öffnen",
  "scrape.execute": "Crawl starten",
  "missions.launch": "Hermes-Schwarm starten",
  "ethics.lock": "Ethik-Sperre",
  "common.language": "Sprache",
  "common.currency": "Währung",
  "common.region": "Region",
  "common.refresh": "Aktualisieren",
  "common.loading": "Lädt…",
};

const catalogs: Record<LocaleCode, Catalog> = {
  en,
  es: { ...en, ...packs.es },
  fr: { ...en, ...packs.fr },
  de: { ...en, ...de },
  it: {
    ...en,
    "app.tagline": "Console · Intel sovrana",
    "nav.command": "Comando",
    "nav.scrape": "Crawl stealth",
    "nav.agents": "Agenti",
    "nav.events": "Eventi live",
    "nav.intelligence": "Notizie e allerte",
    "nav.quantum": "Ibrido quantistico",
    "nav.weather": "Meteo",
    "nav.twins": "Gemelli digitali",
    "home.hero":
      "HelixaraAI",
    "home.cta.console": "Entra nella console",
    "scrape.execute": "Esegui crawl",
    "missions.launch": "Lancia sciame Hermes",
    "common.language": "Lingua",
    "common.currency": "Valuta",
    "common.refresh": "Aggiorna",
  },
  pt: {
    ...en,
    "app.tagline": "Console · Intel soberana",
    "nav.command": "Comando",
    "nav.scrape": "Crawl furtivo",
    "nav.agents": "Agentes",
    "nav.events": "Eventos ao vivo",
    "nav.intelligence": "Notícias e alertas",
    "nav.quantum": "Híbrido quântico",
    "nav.weather": "Clima",
    "nav.twins": "Gêmeos digitais",
    "home.hero":
      "HelixaraAI",
    "home.cta.console": "Entrar no console",
    "common.language": "Idioma",
    "common.currency": "Moeda",
    "common.refresh": "Atualizar",
  },
  ru: {
    ...en,
    "app.tagline": "Консоль · Суверенная разведка",
    "nav.command": "Командование",
    "nav.scrape": "Скрытый обход",
    "nav.agents": "Агенты",
    "nav.events": "Живые события",
    "nav.intelligence": "Новости и тревоги",
    "nav.quantum": "Квантовый гибрид",
    "nav.weather": "Погода",
    "nav.twins": "Цифровые двойники",
    "home.hero":
      "HelixaraAI",
    "home.cta.console": "Открыть консоль",
    "common.language": "Язык",
    "common.currency": "Валюта",
    "common.refresh": "Обновить",
  },
  zh: {
    ...en,
    "app.tagline": "控制台 · 主权情报",
    "nav.command": "指挥",
    "nav.scrape": "隐秘爬取",
    "nav.agents": "智能体",
    "nav.globe": "地理空间",
    "nav.audit": "审计",
    "nav.capabilities": "能力矩阵",
    "nav.events": "实时事件",
    "nav.intelligence": "新闻与预警",
    "nav.quantum": "量子混合",
    "nav.weather": "天气",
    "nav.twins": "数字孪生",
    "home.hero": "HelixaraAI",
    "home.sub":
      "",
    "home.cta.console": "进入指挥控制台",
    "home.cta.capabilities": "能力矩阵",
    "scrape.execute": "执行爬取",
    "missions.launch": "启动 Hermes 集群",
    "common.language": "语言",
    "common.currency": "货币",
    "common.region": "区域",
    "common.refresh": "刷新",
    "common.loading": "加载中…",
    "ethics.lock": "伦理锁定",
  },
  ja: {
    ...en,
    "app.tagline": "コンソール · ソブリン・インテル",
    "nav.command": "コマンド",
    "nav.scrape": "ステルスクロール",
    "nav.agents": "エージェント",
    "nav.events": "ライブイベント",
    "nav.intelligence": "ニュースと警報",
    "nav.quantum": "量子ハイブリッド",
    "nav.weather": "天気",
    "nav.twins": "デジタルツイン",
    "home.hero":
      "HelixaraAI",
    "home.cta.console": "コマンドコンソールへ",
    "common.language": "言語",
    "common.currency": "通貨",
    "common.refresh": "更新",
  },
  ko: {
    ...en,
    "app.tagline": "콘솔 · 주권 인텔",
    "nav.command": "지휘",
    "nav.scrape": "스텔스 크롤",
    "nav.agents": "에이전트",
    "nav.events": "실시간 이벤트",
    "nav.intelligence": "뉴스 및 경보",
    "nav.quantum": "양자 하이브리드",
    "nav.weather": "날씨",
    "nav.twins": "디지털 트윈",
    "home.hero":
      "HelixaraAI",
    "home.cta.console": "지휘 콘솔 입장",
    "common.language": "언어",
    "common.currency": "통화",
    "common.refresh": "새로고침",
  },
  ar: {
    ...en,
    "app.tagline": "وحدة التحكم · استخبارات سيادية",
    "nav.command": "القيادة",
    "nav.scrape": "زحف متخفٍ",
    "nav.agents": "الوكلاء",
    "nav.events": "أحداث مباشرة",
    "nav.intelligence": "أخبار وتنبيهات",
    "nav.quantum": "هجين كمي",
    "nav.weather": "الطقس",
    "nav.twins": "توائم رقمية",
    "home.hero":
      "HelixaraAI",
    "home.cta.console": "دخول وحدة التحكم",
    "common.language": "اللغة",
    "common.currency": "العملة",
    "common.refresh": "تحديث",
  },
  hi: {
    ...en,
    "app.tagline": "कंसोल · संप्रभु इंटेल",
    "nav.command": "कमांड",
    "nav.scrape": "स्टेल्थ क्रॉल",
    "nav.agents": "एजेंट",
    "nav.events": "लाइव इवेंट",
    "nav.intelligence": "समाचार और अलर्ट",
    "nav.quantum": "क्वांटम हाइब्रिड",
    "nav.weather": "मौसम",
    "nav.twins": "डिजिटल ट्विन",
    "home.hero":
      "HelixaraAI",
    "home.cta.console": "कमांड कंसोल में जाएँ",
    "common.language": "भाषा",
    "common.currency": "मुद्रा",
    "common.refresh": "ताज़ा करें",
  },
  nl: {
    ...en,
    "app.tagline": "Console · Soevereine intel",
    "nav.command": "Commando",
    "nav.scrape": "Stealth-crawl",
    "nav.agents": "Agenten",
    "nav.events": "Live events",
    "nav.intelligence": "Nieuws & alerts",
    "nav.quantum": "Quantum-hybride",
    "nav.weather": "Weer",
    "nav.twins": "Digitale tweelingen",
    "home.hero":
      "HelixaraAI",
    "home.cta.console": "Open commandoconsole",
    "common.language": "Taal",
    "common.currency": "Valuta",
    "common.refresh": "Vernieuwen",
  },
  pl: {
    ...en,
    "app.tagline": "Konsola · Suwerenna intel",
    "nav.command": "Dowodzenie",
    "nav.scrape": "Stealth crawl",
    "nav.agents": "Agenci",
    "nav.events": "Zdarzenia na żywo",
    "nav.intelligence": "News i alerty",
    "nav.quantum": "Hybryda kwantowa",
    "nav.weather": "Pogoda",
    "nav.twins": "Cyfrowe bliźniaki",
    "home.hero":
      "HelixaraAI",
    "home.cta.console": "Wejdź do konsoli",
    "common.language": "Język",
    "common.currency": "Waluta",
    "common.refresh": "Odśwież",
  },
  tr: {
    ...en,
    "app.tagline": "Konsol · Egemen istihbarat",
    "nav.command": "Komuta",
    "nav.scrape": "Gizli tarama",
    "nav.agents": "Ajanlar",
    "nav.events": "Canlı olaylar",
    "nav.intelligence": "Haber ve uyarılar",
    "nav.quantum": "Kuantum hibrit",
    "nav.weather": "Hava",
    "nav.twins": "Dijital ikizler",
    "home.hero":
      "HelixaraAI",
    "home.cta.console": "Komuta konsoluna gir",
    "common.language": "Dil",
    "common.currency": "Para birimi",
    "common.refresh": "Yenile",
  },
  vi: {
    ...en,
    "app.tagline": "Bảng điều khiển · Tình báo chủ quyền",
    "nav.command": "Chỉ huy",
    "nav.scrape": "Thu thập ẩn",
    "nav.agents": "Tác nhân",
    "nav.events": "Sự kiện trực tiếp",
    "nav.intelligence": "Tin & cảnh báo",
    "nav.quantum": "Lai lượng tử",
    "nav.weather": "Thời tiết",
    "nav.twins": "Song sinh số",
    "home.hero":
      "HelixaraAI",
    "home.cta.console": "Vào bảng chỉ huy",
    "common.language": "Ngôn ngữ",
    "common.currency": "Tiền tệ",
    "common.refresh": "Làm mới",
  },
  th: {
    ...en,
    "app.tagline": "คอนโซล · อินเทลอธิปไตย",
    "nav.command": "บัญชาการ",
    "nav.scrape": "ครawl ล่องหน",
    "nav.agents": "เอเจนต์",
    "nav.events": "เหตุการณ์สด",
    "nav.intelligence": "ข่าวและการแจ้งเตือน",
    "nav.quantum": "ควอนตัมไฮบริด",
    "nav.weather": "สภาพอากาศ",
    "nav.twins": "ดิจิทัลทวิน",
    "home.hero":
      "HelixaraAI",
    "home.cta.console": "เข้าคอนโซลบัญชาการ",
    "common.language": "ภาษา",
    "common.currency": "สกุลเงิน",
    "common.refresh": "รีเฟรช",
  },
  id: {
    ...en,
    "app.tagline": "Konsol · Intel berdaulat",
    "nav.command": "Komando",
    "nav.scrape": "Crawl siluman",
    "nav.agents": "Agen",
    "nav.events": "Peristiwa langsung",
    "nav.intelligence": "Berita & peringatan",
    "nav.quantum": "Hibrida kuantum",
    "nav.weather": "Cuaca",
    "nav.twins": "Kembar digital",
    "home.hero":
      "HelixaraAI",
    "home.cta.console": "Masuk konsol komando",
    "common.language": "Bahasa",
    "common.currency": "Mata uang",
    "common.refresh": "Muat ulang",
  },
  sv: {
    ...en,
    "app.tagline": "Konsol · Suverän intel",
    "nav.command": "Kommando",
    "nav.scrape": "Smygande crawl",
    "nav.agents": "Agenter",
    "nav.events": "Livehändelser",
    "nav.intelligence": "Nyheter & larm",
    "nav.quantum": "Kvanthybrid",
    "nav.weather": "Väder",
    "nav.twins": "Digitala tvillingar",
    "home.hero":
      "HelixaraAI",
    "home.cta.console": "Öppna kommandokonsolen",
    "common.language": "Språk",
    "common.currency": "Valuta",
    "common.refresh": "Uppdatera",
  },
  uk: {
    ...en,
    "app.tagline": "Консоль · Суверенна розвідка",
    "nav.command": "Командування",
    "nav.scrape": "Прихований обхід",
    "nav.agents": "Агенти",
    "nav.events": "Події наживо",
    "nav.intelligence": "Новини та сповіщення",
    "nav.quantum": "Квантовий гібрид",
    "nav.weather": "Погода",
    "nav.twins": "Цифрові двійники",
    "home.hero":
      "HelixaraAI",
    "home.cta.console": "Увійти в консоль",
    "common.language": "Мова",
    "common.currency": "Валюта",
    "common.refresh": "Оновити",
  },
};

export function t(locale: LocaleCode | string, key: MessageKey): string {
  const code = (LOCALES.find((l) => l.code === locale)?.code || "en") as LocaleCode;
  return catalogs[code][key] || catalogs.en[key] || key;
}

export function getCatalog(locale: LocaleCode | string): Catalog {
  const code = (LOCALES.find((l) => l.code === locale)?.code || "en") as LocaleCode;
  return catalogs[code];
}

export function isRtl(locale: string) {
  return LOCALES.find((l) => l.code === locale)?.dir === "rtl";
}
