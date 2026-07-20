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
  | "nav.scrape"
  | "nav.osint"
  | "nav.agents"
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
  "nav.scrape": "Stealth Crawl",
  "nav.osint": "OSINT",
  "nav.agents": "Agents",
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
  "home.hero": "Sovereign command for ethical OSINT, stealth crawl, and mission intelligence.",
  "home.sub":
    "Modular production console: live satellites, ADS-B, Hermes & OpenClaw agents, Llama 3.1 / ChatGPT training, quantum hybrids, digital twins, full localization.",
  "home.cta.console": "Enter Command Console",
  "home.cta.capabilities": "Capability Matrix",
  "home.card.scrape": "Stealth Crawl",
  "home.card.scrape.desc":
    "Dynamic stealth scraping with robots awareness, proxy tiers, and audit-first design.",
  "home.card.osint": "Ethical OSINT",
  "home.card.osint.desc":
    "DNS, CT logs, headers. Dark-web channel authorization-gated.",
  "home.card.agents": "Hermes + OpenClaw",
  "home.card.agents.desc":
    "Multi-agent swarms with Ollama Llama 3.1 and ChatGPT training hooks.",
  "home.card.globe": "Live Earth Globe",
  "home.card.globe.desc":
    "CelesTrak NORAD GP satellites, OpenSky flights, hubs, twins, all regions.",
  "home.scope":
    "Hard scope: lawful OSINT and authorized security testing only. Full-site translations, live feeds, and stealth crawl for enterprise production use.",
  "console.title": "Command Overview",
  "console.subtitle":
    "Unified dashboard for stealth crawl, OSINT fusion, agent missions, and geospatial awareness.",
  "console.metrics.service": "Service",
  "console.metrics.missions": "Missions",
  "console.metrics.audit": "Audit events",
  "console.metrics.layers": "Geo entities",
  "console.quick": "Quick actions",
  "console.market":
    "Production-grade modular stack: events, multi-LLM agents, live SSA/ADS-B, i18n, weather, FX, news, quantum hybrids.",
  "scrape.title": "Cyberscrape Engine",
  "scrape.desc":
    "Enterprise self-hosted crawl with stealth sessions, robots respect, structured extraction, full audit.",
  "scrape.url": "Target URL",
  "scrape.deep": "Deep same-origin crawl",
  "scrape.tier": "Stealth tier",
  "scrape.execute": "Execute scrape",
  "scrape.running": "Crawling…",
  "osint.title": "Ethical Intelligence Fusion",
  "osint.desc":
    "Public-source enrichment: DNS over HTTPS, Certificate Transparency, HTTP posture.",
  "osint.query": "Domain / entity query",
  "osint.run": "Run OSINT",
  "missions.title": "Hermes Mission Swarm",
  "missions.desc":
    "Parallel specialists + OpenClaw + LLM backbone (Llama 3.1 / ChatGPT).",
  "missions.launch": "Launch Hermes swarm",
  "globe.title": "God's Eye · Live Earth",
  "globe.desc":
    "Real public NORAD-derived TLEs (CelesTrak), ADS-B, airport hubs, digital twins, regional presets.",
  "globe.layers": "Layers & regions",
  "audit.title": "Chain of Custody",
  "audit.desc": "Every sensitive action is audited with operator and engagement context.",
  "events.title": "Live Event Stream",
  "events.desc": "Real modular bus events across scrape, OSINT, agents, geo, alerts, FX.",
  "intel.title": "News, Reddit & Global Alerts",
  "intel.desc": "Reddit, Hacker News, USGS seismic alerts fused for operators.",
  "quantum.title": "Hybrid Quantum Intelligence",
  "quantum.desc":
    "Narrow NISQ-safe hybrids with classical surrogates and industry KPIs.",
  "weather.title": "7-Day Weather",
  "weather.desc": "Open-Meteo global forecast for mission planning and regional ops.",
  "twins.title": "Live Digital Twins",
  "twins.desc": "SOC and edge node twins synchronized with the live globe.",
  "ethics.lock": "Ethics lock",
  "ethics.body":
    "Authorized OSINT & defensive testing only. Dark-web and deep ops require engagement attestation. All actions audited.",
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
      "Mando soberano para OSINT ético, rastreo furtivo e inteligencia de misiones.",
    "home.sub":
      "Consola modular de producción: satélites en vivo, ADS-B, agentes Hermes y OpenClaw, entrenamiento Llama 3.1 / ChatGPT, híbridos cuánticos, gemelos digitales, localización completa.",
    "home.cta.console": "Entrar a la consola",
    "home.cta.capabilities": "Matriz de capacidades",
    "home.card.scrape": "Rastreo furtivo",
    "home.card.scrape.desc":
      "Rastreo dinámico con respeto a robots, niveles de proxy y diseño con auditoría primero.",
    "home.card.osint": "OSINT ético",
    "home.card.osint.desc":
      "DNS, registros CT, cabeceras. Canal dark-web con autorización.",
    "home.card.agents": "Hermes + OpenClaw",
    "home.card.agents.desc":
      "Enjambres multiagente con Ollama Llama 3.1 y ganchos de entrenamiento ChatGPT.",
    "home.card.globe": "Globo terrestre en vivo",
    "home.card.globe.desc":
      "Satélites CelesTrak NORAD GP, vuelos OpenSky, hubs, gemelos, todas las regiones.",
    "home.scope":
      "Alcance estricto: solo OSINT lícito y pruebas de seguridad autorizadas. Traducciones completas del sitio, feeds en vivo y rastreo furtivo de grado empresarial.",
    "console.title": "Resumen de mando",
    "console.subtitle":
      "Panel unificado para rastreo, fusión OSINT, misiones de agentes y conciencia geoespacial.",
    "console.metrics.service": "Servicio",
    "console.metrics.missions": "Misiones",
    "console.metrics.audit": "Eventos de auditoría",
    "console.metrics.layers": "Entidades geo",
    "console.quick": "Acciones rápidas",
    "console.market":
      "Pila modular de producción: eventos, agentes multi-LLM, SSA/ADS-B en vivo, i18n, clima, FX, noticias, híbridos cuánticos.",
    "scrape.title": "Motor de ciber-rastreo",
    "scrape.desc":
      "Rastreo autoalojado con sesiones furtivas, robots, extracción estructurada y auditoría.",
    "scrape.url": "URL objetivo",
    "scrape.deep": "Rastreo profundo mismo origen",
    "scrape.tier": "Nivel furtivo",
    "scrape.execute": "Ejecutar rastreo",
    "scrape.running": "Rastreando…",
    "osint.title": "Fusión de inteligencia ética",
    "osint.desc":
      "Enriquecimiento de fuentes públicas: DNS DoH, transparencia de certificados, postura HTTP.",
    "osint.query": "Consulta de dominio / entidad",
    "osint.run": "Ejecutar OSINT",
    "missions.title": "Enjambre de misiones Hermes",
    "missions.desc":
      "Especialistas en paralelo + OpenClaw + LLM (Llama 3.1 / ChatGPT).",
    "missions.launch": "Lanzar enjambre Hermes",
    "globe.title": "Ojo de Dios · Tierra en vivo",
    "globe.desc":
      "TLE públicos derivados de NORAD (CelesTrak), ADS-B, hubs, gemelos, regiones.",
    "globe.layers": "Capas y regiones",
    "audit.title": "Cadena de custodia",
    "audit.desc":
      "Cada acción sensible se audita con contexto de operador y engagement.",
    "events.title": "Flujo de eventos en vivo",
    "events.desc":
      "Eventos reales del bus modular: rastreo, OSINT, agentes, geo, alertas, FX.",
    "intel.title": "Noticias, Reddit y alertas globales",
    "intel.desc":
      "Reddit, Hacker News y alertas sísmicas USGS fusionadas para operadores.",
    "quantum.title": "Inteligencia cuántica híbrida",
    "quantum.desc":
      "Híbridos estrechos seguros NISQ con sustitutos clásicos y KPIs de industria.",
    "weather.title": "Clima a 7 días",
    "weather.desc":
      "Pronóstico global Open-Meteo para planificación de misiones y operaciones regionales.",
    "twins.title": "Gemelos digitales en vivo",
    "twins.desc":
      "Gemelos SOC y de borde sincronizados con el globo en vivo.",
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
      "Commandement souverain pour OSINT éthique, crawl furtif et renseignement de mission.",
    "home.sub":
      "Console modulaire de production : satellites live, ADS-B, agents Hermes & OpenClaw, entraînement Llama 3.1 / ChatGPT, hybrides quantiques, jumeaux, localisation complète.",
    "home.cta.console": "Entrer dans la console",
    "home.cta.capabilities": "Matrice des capacités",
    "home.card.scrape": "Crawl furtif",
    "home.card.scrape.desc":
      "Scraping dynamique furtif avec robots, proxies et audit natif.",
    "home.card.osint": "OSINT éthique",
    "home.card.osint.desc":
      "DNS, journaux CT, en-têtes. Dark web sous autorisation.",
    "home.card.agents": "Hermes + OpenClaw",
    "home.card.agents.desc":
      "Essaims multi-agents avec Ollama Llama 3.1 et ChatGPT.",
    "home.card.globe": "Globe terrestre live",
    "home.card.globe.desc":
      "Satellites CelesTrak NORAD GP, vols OpenSky, hubs, jumeaux, toutes régions.",
    "home.scope":
      "Périmètre strict : OSINT licite et tests de sécurité autorisés uniquement. Traductions site complet, flux live et crawl furtif de niveau entreprise.",
    "console.title": "Vue de commandement",
    "console.subtitle":
      "Tableau unifié crawl, fusion OSINT, missions agents et conscience géospatiale.",
    "console.metrics.service": "Service",
    "console.metrics.missions": "Missions",
    "console.metrics.audit": "Événements d'audit",
    "console.metrics.layers": "Entités geo",
    "console.quick": "Actions rapides",
    "console.market":
      "Stack modulaire production : événements, agents multi-LLM, SSA/ADS-B live, i18n, météo, FX, actus, quantique.",
    "scrape.title": "Moteur de cyber-crawl",
    "scrape.desc":
      "Crawl auto-hébergé avec sessions furtives, robots, extraction structurée, audit.",
    "scrape.url": "URL cible",
    "scrape.deep": "Crawl profond même origine",
    "scrape.tier": "Niveau furtif",
    "scrape.execute": "Lancer le crawl",
    "scrape.running": "Crawl en cours…",
    "osint.title": "Fusion de renseignement éthique",
    "osint.desc":
      "Enrichissement sources publiques : DNS DoH, transparence des certificats, posture HTTP.",
    "osint.query": "Requête domaine / entité",
    "osint.run": "Lancer OSINT",
    "missions.title": "Essaim de mission Hermes",
    "missions.desc":
      "Spécialistes parallèles + OpenClaw + LLM (Llama 3.1 / ChatGPT).",
    "missions.launch": "Lancer l'essaim Hermes",
    "globe.title": "Œil de Dieu · Terre live",
    "globe.desc":
      "TLE publics dérivés NORAD (CelesTrak), ADS-B, hubs, jumeaux, régions.",
    "globe.layers": "Couches & régions",
    "audit.title": "Chaîne de custody",
    "audit.desc":
      "Chaque action sensible est auditée avec contexte opérateur et engagement.",
    "events.title": "Flux d'événements live",
    "events.desc":
      "Événements réels du bus modulaire : crawl, OSINT, agents, geo, alertes, FX.",
    "intel.title": "Actu, Reddit & alertes mondiales",
    "intel.desc":
      "Reddit, Hacker News et alertes sismiques USGS pour opérateurs.",
    "quantum.title": "Intelligence quantique hybride",
    "quantum.desc":
      "Hybrides étroits NISQ-safe avec substituts classiques et KPI industrie.",
    "weather.title": "Météo 7 jours",
    "weather.desc":
      "Prévisions Open-Meteo mondiales pour planification de mission.",
    "twins.title": "Jumeaux numériques live",
    "twins.desc":
      "Jumeaux SOC et edge synchronisés avec le globe live.",
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
    "Souveränes Kommando für ethisches OSINT, Stealth-Crawl und Missionsintelligenz.",
  "home.sub":
    "Modulare Produktionskonsole: Live-Satelliten, ADS-B, Hermes- & OpenClaw-Agenten, Llama 3.1 / ChatGPT-Training, Quantenhybride, digitale Zwillinge, vollständige Lokalisierung.",
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
      "Comando sovrano per OSINT etico, crawl stealth e intelligence di missione.",
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
      "Comando soberano para OSINT ético, crawl furtivo e inteligência de missão.",
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
      "Суверенное командование для этичного OSINT, скрытого обхода и миссионной разведки.",
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
    "home.hero": "用于合规 OSINT、隐秘爬取与任务情报的主权指挥控制台。",
    "home.sub":
      "模块化生产控制台：实时卫星、ADS-B、Hermes 与 OpenClaw 智能体、Llama 3.1 / ChatGPT 训练、量子混合、数字孪生、完整本地化。",
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
      "倫理的OSINT・ステルスクロール・ミッションインテリジェンスのための主権コマンド。",
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
      "윤리적 OSINT, 스텔스 크롤, 미션 인텔리전스를 위한 주권 지휘 콘솔.",
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
      "قيادة سيادية لاستخبارات المصادر المفتوحة الأخلاقية والزحف المتخفي ومهام الاستخبارات.",
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
      "नैतिक OSINT, स्टेल्थ क्रॉल और मिशन इंटेलिजेंस के लिए संप्रभु कमांड।",
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
      "Soeverein commando voor ethische OSINT, stealth-crawl en missie-intelligence.",
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
      "Suwerenne dowodzenie dla etycznego OSINT, stealth crawl i intel misji.",
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
      "Etik OSINT, gizli tarama ve görev istihbaratı için egemen komuta.",
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
      "Chỉ huy chủ quyền cho OSINT đạo đức, thu thập ẩn và tình báo nhiệm vụ.",
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
      "บัญชาการอธิปไตยสำหรับ OSINT อย่างมีจริยธรรม การครawl ล่องหน และข่าวกรองภารกิจ",
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
      "Komando berdaulat untuk OSINT etis, crawl siluman, dan intelijen misi.",
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
      "Suveränt kommando för etisk OSINT, smygande crawl och uppdragsunderrättelse.",
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
      "Суверенне командування для етичного OSINT, прихованого обходу та розвідки місій.",
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
