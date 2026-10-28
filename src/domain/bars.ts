// Action bars mirror the default UI. Binding targets use WoW's binding names
// (ACTIONBUTTON1, MULTIACTIONBAR1BUTTON3, ...) so they map 1:1 to the game.

export type BarId = "MAIN" | "BOTTOMLEFT" | "BOTTOMRIGHT" | "RIGHT" | "RIGHT2";

/** `side` bars sit on the right edge of the screen in the default UI. */
export type Bar = { id: BarId; name: string; bindingPrefix: string; side?: boolean };

export const BARS: Bar[] = [
  { id: "MAIN", name: "Bar 1", bindingPrefix: "ACTIONBUTTON" },
  { id: "BOTTOMLEFT", name: "Bar 2", bindingPrefix: "MULTIACTIONBAR1BUTTON" },
  { id: "BOTTOMRIGHT", name: "Bar 3", bindingPrefix: "MULTIACTIONBAR2BUTTON" },
  { id: "RIGHT", name: "Bar 4", bindingPrefix: "MULTIACTIONBAR3BUTTON", side: true },
  { id: "RIGHT2", name: "Bar 5", bindingPrefix: "MULTIACTIONBAR4BUTTON", side: true },
];

export const SLOTS_PER_BAR = 12;

/** A Bar Page; `ability` names the stance/form whose icon represents it. */
export type BarPage = { id: string; name: string; ability?: string };

const DEFAULT_PAGE: BarPage = { id: "default", name: "Default" };

const CLASS_PAGES: Record<string, BarPage[]> = {
  Warrior: [
    { id: "battle", name: "Battle Stance", ability: "Battle Stance" },
    { id: "defensive", name: "Defensive Stance", ability: "Defensive Stance" },
    { id: "berserker", name: "Berserker Stance", ability: "Berserker Stance" },
  ],
  Druid: [
    { id: "default", name: "Caster" },
    { id: "bear", name: "Bear Form", ability: "Bear Form" },
    { id: "cat", name: "Cat Form", ability: "Cat Form" },
    { id: "prowl", name: "Cat Form (Prowl)", ability: "Prowl" },
  ],
  Rogue: [
    { id: "default", name: "Normal" },
    { id: "stealth", name: "Stealth", ability: "Stealth" },
  ],
};

/** Pages of the Main bar for a class; every other bar has a single default page. */
export function mainBarPages(classId: string): BarPage[] {
  return CLASS_PAGES[classId] ?? [DEFAULT_PAGE];
}

export function pagesFor(classId: string, bar: BarId): BarPage[] {
  return bar === "MAIN" ? mainBarPages(classId) : [DEFAULT_PAGE];
}

/** Where a slot item lives: bar + page + 0-based index. */
export type SlotKey = string;

export function slotKey(bar: BarId, page: string, index: number): SlotKey {
  return `${bar}:${page}:${index}`;
}

export function parseSlotKey(key: SlotKey): { bar: BarId; page: string; index: number } {
  const [bar, page, index] = key.split(":");
  return { bar: bar as BarId, page, index: Number(index) };
}

/** Binding target of an action slot; pages share it. */
export function slotTarget(bar: BarId, index: number): string {
  return `${BARS.find((b) => b.id === bar)!.bindingPrefix}${index + 1}`;
}

export function slotFromTarget(target: string): { bar: BarId; index: number } | null {
  for (const bar of BARS) {
    const m = new RegExp(`^${bar.bindingPrefix}(\\d+)$`).exec(target);
    if (m) return { bar: bar.id, index: Number(m[1]) - 1 };
  }
  return null;
}
