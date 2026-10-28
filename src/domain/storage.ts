import type { Profile } from "./profile";

const KEY = "forever-keymap:v1";

export type Saved = { profiles: Profile[]; activeId: string | null };

export function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch {
    // Private mode or corrupt data: start fresh.
  }
  return { profiles: [], activeId: null };
}

// Profiles saved before "custom items" became macros.
function migrate(saved: Saved): Saved {
  const profiles = saved.profiles.map((p) => {
    const legacy = p as Profile & { customItems?: Profile["macros"] };
    const slots = Object.fromEntries(
      Object.entries(p.slots).map(([k, item]) => [k, (item.type as string) === "custom" ? { ...item, type: "macro" as const } : item]),
    );
    const { customItems, ...rest } = legacy;
    return { ...rest, slots, macros: p.macros ?? customItems ?? [] };
  });
  return { ...saved, profiles };
}

export function save(saved: Saved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Storage full or blocked; the session still works in memory.
  }
}
