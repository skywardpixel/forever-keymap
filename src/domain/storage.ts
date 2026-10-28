import { DEFAULT_BINDINGS, type Bindings } from "./bindings";
import type { Character, Macro, SlotItem } from "./character";

const KEY = "forever-keymap:v2";
const LEGACY_KEY = "forever-keymap:v1";

/** Everything this browser keeps: the characters and the account-wide keymap. */
export type Saved = { characters: Character[]; activeId: string | null; keymap: Bindings };

const empty = (): Saved => ({ characters: [], activeId: null, keymap: structuredClone(DEFAULT_BINDINGS) });

export function loadSaved(): Saved {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = { ...empty(), ...(JSON.parse(raw) as Saved) };
      if (!Array.isArray(saved.characters)) throw new Error("unrecognised save");
      return saved;
    }
    raw = localStorage.getItem(LEGACY_KEY);
    if (raw) return fromV1(JSON.parse(raw));
  } catch {
    // Unreadable save: keep a copy before starting fresh, since the next save
    // would otherwise overwrite it.
    if (raw) {
      try {
        localStorage.setItem(`${KEY}:unreadable:${Date.now()}`, raw);
      } catch {
        // Storage blocked; nothing more we can do.
      }
    }
  }
  return empty();
}

type V1Profile = Omit<Character, "macros"> & {
  bindings?: Bindings;
  macros?: Macro[];
  customItems?: Macro[];
};

/**
 * v1 kept bindings on each profile. Keybindings are account-wide now, so the
 * most recently edited profile's bindings become the keymap.
 */
export function fromV1(v1: { profiles?: V1Profile[]; activeId?: string | null }): Saved {
  const profiles = v1.profiles ?? [];
  const latest = [...profiles].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const characters: Character[] = profiles.map(({ bindings: _bindings, customItems, ...p }) => ({
    ...p,
    // Macros were briefly called custom items.
    macros: p.macros ?? customItems ?? [],
    slots: Object.fromEntries(
      Object.entries(p.slots).map(([k, item]) => [
        k,
        ((item.type as string) === "custom" ? { ...item, type: "macro" } : item) as SlotItem,
      ]),
    ),
  }));
  return {
    characters,
    activeId: v1.activeId ?? null,
    keymap: latest?.bindings ?? structuredClone(DEFAULT_BINDINGS),
  };
}

export function save(saved: Saved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Storage full or blocked; the session still works in memory.
  }
}
