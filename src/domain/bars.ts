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

/**
 * A Bar Page; `ability` names the stance/form that swaps it in. `addonOnly`
 * pages exist only with a bar addon (the default UI never swaps for them).
 */
export type BarPage = { id: string; name: string; ability?: string; addonOnly?: boolean };

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
    { id: "moonkin", name: "Moonkin Form", ability: "Moonkin Form", addonOnly: true },
  ],
  Rogue: [
    { id: "default", name: "Normal" },
    { id: "stealth", name: "Stealth", ability: "Stealth" },
  ],
  Priest: [
    { id: "default", name: "Normal" },
    { id: "shadowform", name: "Shadowform", ability: "Shadowform", addonOnly: true },
  ],
};

/** Every page a class could have, including addon-only ones. */
export function classPages(classId: string): BarPage[] {
  return CLASS_PAGES[classId] ?? [DEFAULT_PAGE];
}

/** The default UI pages only Bar 1, and only for stances/forms it supports. */
export function defaultUiPages(classId: string, bar: BarId): boolean {
  return bar === "MAIN" && classPages(classId).some((p) => p.ability && !p.addonOnly);
}

/**
 * Addon-only pages that must be switched on per character. A class whose only
 * pages are addon-only (Priest: Shadowform) gets them whenever a bar is paged;
 * a class that already pages in the default UI (Druid: Moonkin) opts in.
 */
export function optionalPages(classId: string): BarPage[] {
  const pages = classPages(classId);
  return pages.some((p) => p.ability && !p.addonOnly) ? pages.filter((p) => p.addonOnly) : [];
}

/** The pages paged bars actually cycle through for this character. */
export function activePages(classId: string, addonPages: string[] | undefined): BarPage[] {
  const optional = new Set(optionalPages(classId).map((p) => p.id));
  return classPages(classId).filter((p) => !optional.has(p.id) || !!addonPages?.includes(p.id));
}

/** Whether the class has any stance/form to page on. */
export function canPage(classId: string): boolean {
  return classPages(classId).length > 1;
}

/** Overrides of the default UI's paging, per bar. Absent means "as the default UI". */
export type BarPaging = Partial<Record<BarId, boolean>>;

export function isPaged(classId: string, paging: BarPaging | undefined, bar: BarId): boolean {
  return canPage(classId) && (paging?.[bar] ?? defaultUiPages(classId, bar));
}

/** The page a bar shows while the character is in `viewPage` (unpaged bars stay on default). */
export function pageOf(classId: string, paging: BarPaging | undefined, bar: BarId, viewPage: string): string {
  return isPaged(classId, paging, bar) ? viewPage : "default";
}

/** Addon-only pages in use: Shadowform once any bar pages, Moonkin once opted in. */
export function addonPagesInUse(classId: string, paging: BarPaging | undefined, addonPages: string[] | undefined): BarPage[] {
  if (!BARS.some((b) => isPaged(classId, paging, b.id))) return [];
  return activePages(classId, addonPages).filter((p) => p.addonOnly);
}

/** Bars whose paging the default UI can't do, so the layout needs a bar addon. */
export function barsNeedingAddon(classId: string, paging: BarPaging | undefined): BarId[] {
  return BARS.filter((b) => isPaged(classId, paging, b.id) !== defaultUiPages(classId, b.id)).map((b) => b.id);
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
