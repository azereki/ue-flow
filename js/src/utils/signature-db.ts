/**
 * Lazy-loaded UE function signature database.
 *
 * Fetches a static JSON file of curated function signatures (pins, types,
 * defaults) and provides synchronous lookups after initial load.
 * Falls back gracefully when unavailable (IIFE embeds, offline).
 */
import type { SignatureData, FunctionSig } from '../types/signature-db';
import type { UEGraphJSON } from '../types/ue-graph';

let cached: SignatureData | null = null;
let loading: Promise<SignatureData | null> | null = null;

const LEARNED_KEY = 'uf-learned-signatures';
const MAX_LEARNED = 500;

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/** Lazy-load the signature DB (fetches JSON on first call, caches in memory). */
export async function loadSignatureDB(url = '/data/ue-signatures.json'): Promise<SignatureData | null> {
  if (cached) return cached;
  if (loading) return loading;
  loading = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      cached = (await res.json()) as SignatureData;
      return cached;
    } catch {
      return null;
    }
  })();
  return loading;
}

/** Synchronous accessor — returns cached DB or null if not yet loaded. */
export function getSignatureDB(): SignatureData | null {
  return cached;
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

/**
 * Normalize a UE member name for lookup.
 * The DB uses Python-style names (AddFloatFloat, DestroyActor) while
 * UE T3D uses underscore-separated names (Add_FloatFloat, K2_DestroyActor).
 */
function normalizeMemberName(name: string): string {
  // Strip K2_ prefix
  let n = name.replace(/^K2_/, '');
  // Remove underscores (Add_FloatFloat → AddFloatFloat)
  n = n.replace(/_/g, '');
  return n;
}

/** Look up a function by memberName, optionally disambiguate by memberParent. */
export function lookupFunction(
  memberName: string,
  memberParent?: string,
): FunctionSig | undefined {
  // Try static DB first
  const result = lookupInDB(memberName, memberParent);
  if (result) return result;

  // Fall back to localStorage learned entries
  return lookupLearned(memberName, memberParent);
}

function lookupInDB(
  memberName: string,
  memberParent?: string,
): FunctionSig | undefined {
  if (!cached) return undefined;

  // Direct match
  let entries = cached.functions[memberName];
  if (!entries) {
    // Try normalized name
    const normalized = normalizeMemberName(memberName);
    entries = cached.functions[normalized];
  }
  if (!entries) {
    // Brute force: try matching normalized against all keys
    const normalized = normalizeMemberName(memberName).toLowerCase();
    for (const key of Object.keys(cached.functions)) {
      if (key.toLowerCase() === normalized) {
        entries = cached.functions[key];
        break;
      }
    }
  }
  if (!entries || entries.length === 0) return undefined;

  // Disambiguate by memberParent if provided
  if (memberParent) {
    const match = entries.find((e) => e.memberParent === memberParent);
    if (match) return match;
  }

  return entries[0];
}

function lookupLearned(
  memberName: string,
  memberParent?: string,
): FunctionSig | undefined {
  const learned = getLearnedEntries();
  const normalized = normalizeMemberName(memberName).toLowerCase();

  for (const entry of learned) {
    const entryNorm = normalizeMemberName(entry.memberName).toLowerCase();
    if (entryNorm === normalized || entry.memberName === memberName) {
      if (memberParent && entry.memberParent !== memberParent) continue;
      return entry;
    }
  }
  return undefined;
}

/** Search functions by substring match on memberName. */
export function searchFunctions(query: string, limit = 20): FunctionSig[] {
  if (!cached) return [];
  const lower = query.toLowerCase();
  const results: FunctionSig[] = [];

  for (const [key, entries] of Object.entries(cached.functions)) {
    if (key.toLowerCase().includes(lower)) {
      results.push(entries[0]);
      if (results.length >= limit) break;
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Paste learning
// ---------------------------------------------------------------------------

function getLearnedEntries(): FunctionSig[] {
  try {
    const raw = localStorage.getItem(LEARNED_KEY);
    return raw ? (JSON.parse(raw) as FunctionSig[]) : [];
  } catch {
    return [];
  }
}

function saveLearnedEntries(entries: FunctionSig[]): void {
  try {
    // LRU eviction: keep newest entries at end, trim from front
    const trimmed = entries.length > MAX_LEARNED
      ? entries.slice(entries.length - MAX_LEARNED)
      : entries;
    localStorage.setItem(LEARNED_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Learn new function signatures from a parsed graph.
 * Extracts memberName + memberParent + pins from nodes and stores
 * functions NOT already in the static DB into localStorage.
 * Returns the number of newly learned functions.
 */
export function learnFromGraph(graph: UEGraphJSON): number {
  let learned = 0;
  const entries = getLearnedEntries();
  const existingNames = new Set(entries.map((e) => e.memberName));

  for (const node of graph.nodes) {
    const props = node.properties;
    let memberName: string | undefined;
    let memberParent: string | undefined;

    // Extract from FunctionReference or EventReference
    const refStr = String(props['FunctionReference'] ?? props['EventReference'] ?? '');
    const nameMatch = refStr.match(/MemberName="([^"]+)"/);
    const parentMatch = refStr.match(/MemberParent="([^"]+)"/);
    if (nameMatch) memberName = nameMatch[1];
    if (parentMatch) memberParent = parentMatch[1];

    if (!memberName || !memberParent) continue;

    // Skip if already in static DB
    if (lookupInDB(memberName, memberParent)) continue;
    // Skip if already learned
    if (existingNames.has(memberName)) continue;

    const isPure = node.pins.every((p) => p.category !== 'exec');
    const pins = node.pins
      .filter((p) => !p.hidden)
      .map((p) => ({
        name: p.friendlyName || p.name,
        direction: p.direction,
        category: p.category as string,
        ...(p.subCategory ? { subCategory: p.subCategory } : {}),
        ...(p.subCategoryObject ? { subCategoryObject: p.subCategoryObject } : {}),
        ...(p.defaultValue ? { defaultValue: p.defaultValue } : {}),
      }));

    entries.push({
      memberParent,
      memberName,
      isPure,
      pins,
    });
    existingNames.add(memberName);
    learned++;
  }

  if (learned > 0) {
    saveLearnedEntries(entries);
  }
  return learned;
}

// ---------------------------------------------------------------------------
// Reset (for testing)
// ---------------------------------------------------------------------------

/** @internal Reset cached state — for tests only. */
export function _resetForTesting(): void {
  cached = null;
  loading = null;
}

/** @internal Inject data directly — for tests only. */
export function _injectForTesting(data: SignatureData): void {
  cached = data;
  loading = null;
}
