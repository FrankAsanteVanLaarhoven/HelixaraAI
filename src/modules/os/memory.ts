/**
 * Local memory system — goals, personas, skills, documents, notes.
 * Persists under data/os/ for ownership / offline use.
 */

import { promises as fs } from "fs";
import path from "path";
import { uid } from "@/lib/utils";

export interface MemoryNote {
  id: string;
  ts: string;
  title: string;
  body: string;
  tags: string[];
  vault: boolean;
}

export interface Goal {
  id: string;
  title: string;
  status: "active" | "paused" | "done";
  progress: number;
  notes: string;
  updatedAt: string;
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  skills: string[];
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  kind: "osint" | "scrape" | "report" | "custom";
  prompt: string;
}

export interface DocRef {
  id: string;
  title: string;
  path: string;
  summary: string;
  updatedAt: string;
}

export interface OsState {
  notes: MemoryNote[];
  goals: Goal[];
  personas: Persona[];
  skills: Skill[];
  docs: DocRef[];
  suggestions: string[];
}

const DEFAULT: OsState = {
  notes: [],
  goals: [
    {
      id: "goal_default",
      title: "Own the intelligence stack",
      status: "active",
      progress: 40,
      notes: "Run local Ollama + Helixara OS vault for regulated work",
      updatedAt: new Date().toISOString(),
    },
  ],
  personas: [
    {
      id: "persona_recon",
      name: "Recon Lead",
      role: "Authorized surface recon",
      systemPrompt:
        "You are HelixaraAI recon lead. Defensive, ROE-bound. No malware or phishing.",
      skills: ["osint", "scrape"],
    },
    {
      id: "persona_analyst",
      name: "Intel Analyst",
      role: "Correlate findings into risk narrative",
      systemPrompt:
        "You are HelixaraAI analyst. Summarize IOCs, risks, next authorized steps.",
      skills: ["report"],
    },
  ],
  skills: [
    {
      id: "skill_osint",
      name: "Public OSINT enrich",
      description: "DNS / CT / headers for a domain under ROE",
      kind: "osint",
      prompt: "Run public OSINT enrichment for the given domain.",
    },
    {
      id: "skill_report",
      name: "Executive report draft",
      description: "Turn artifacts into exec + technical report",
      kind: "report",
      prompt: "Draft an authorized engagement report from provided findings.",
    },
  ],
  docs: [],
  suggestions: [
    "Pull a local model via Ollama (e.g. llama3.1 or qwen2.5) for vault mode",
    "Set HELIXARA_PRIVACY_MODE=vault for client/IP sensitive sessions",
    "Use hybrid for day-to-day; vault for SOC2/GDPR-sensitive data",
    "Wire Telegram operator for mobile control of Kanban missions",
  ],
};

function dataDir() {
  return path.join(process.cwd(), "data", "os");
}

function stateFile() {
  return path.join(dataDir(), "state.json");
}

let cache: OsState | null = null;

async function load(): Promise<OsState> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(stateFile(), "utf8");
    cache = { ...DEFAULT, ...JSON.parse(raw) } as OsState;
    return cache;
  } catch {
    cache = structuredClone(DEFAULT);
    await save(cache);
    return cache;
  }
}

async function save(state: OsState) {
  cache = state;
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(stateFile(), JSON.stringify(state, null, 2), "utf8");
}

export async function getOsState(): Promise<OsState> {
  return load();
}

export async function addNote(input: {
  title: string;
  body: string;
  tags?: string[];
  vault?: boolean;
}) {
  const state = await load();
  const note: MemoryNote = {
    id: uid("mem"),
    ts: new Date().toISOString(),
    title: input.title,
    body: input.body,
    tags: input.tags || [],
    vault: Boolean(input.vault),
  };
  state.notes.unshift(note);
  state.notes = state.notes.slice(0, 200);
  await save(state);
  return note;
}

export async function upsertGoal(input: {
  id?: string;
  title: string;
  status?: Goal["status"];
  progress?: number;
  notes?: string;
}) {
  const state = await load();
  if (input.id) {
    const g = state.goals.find((x) => x.id === input.id);
    if (g) {
      g.title = input.title;
      if (input.status) g.status = input.status;
      if (input.progress != null) g.progress = input.progress;
      if (input.notes != null) g.notes = input.notes;
      g.updatedAt = new Date().toISOString();
      await save(state);
      return g;
    }
  }
  const goal: Goal = {
    id: uid("goal"),
    title: input.title,
    status: input.status || "active",
    progress: input.progress ?? 0,
    notes: input.notes || "",
    updatedAt: new Date().toISOString(),
  };
  state.goals.unshift(goal);
  await save(state);
  return goal;
}

export async function upsertPersona(input: Omit<Persona, "id"> & { id?: string }) {
  const state = await load();
  if (input.id) {
    const p = state.personas.find((x) => x.id === input.id);
    if (p) {
      Object.assign(p, input);
      await save(state);
      return p;
    }
  }
  const persona: Persona = {
    id: uid("per"),
    name: input.name,
    role: input.role,
    systemPrompt: input.systemPrompt,
    skills: input.skills || [],
  };
  state.personas.push(persona);
  await save(state);
  return persona;
}

export async function upsertSkill(input: Omit<Skill, "id"> & { id?: string }) {
  const state = await load();
  if (input.id) {
    const s = state.skills.find((x) => x.id === input.id);
    if (s) {
      Object.assign(s, input);
      await save(state);
      return s;
    }
  }
  const skill: Skill = {
    id: uid("sk"),
    name: input.name,
    description: input.description,
    kind: input.kind,
    prompt: input.prompt,
  };
  state.skills.push(skill);
  await save(state);
  return skill;
}

export async function addDoc(input: {
  title: string;
  path: string;
  summary?: string;
}) {
  const state = await load();
  const doc: DocRef = {
    id: uid("doc"),
    title: input.title,
    path: input.path,
    summary: input.summary || "",
    updatedAt: new Date().toISOString(),
  };
  state.docs.unshift(doc);
  await save(state);
  return doc;
}

/** Proactive suggestions from recent notes / goals */
export async function refreshSuggestions() {
  const state = await load();
  const tips = [...state.suggestions];
  if (state.notes.some((n) => n.vault)) {
    tips.unshift("Vault notes present — keep privacy mode on vault for those threads");
  }
  if (!state.goals.some((g) => g.status === "active")) {
    tips.unshift("No active goals — add one so the OS can prioritize agent work");
  }
  state.suggestions = Array.from(new Set(tips)).slice(0, 12);
  await save(state);
  return state.suggestions;
}
