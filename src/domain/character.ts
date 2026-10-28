import type { SlotKey } from "./bars";

export type Macro = { id: string; name: string; icon: string };

export type SlotItem = { type: "ability"; id: string } | { type: "macro"; id: string };

/** One character's action bars and macros. Keybindings are account-wide (see Saved.keymap). */
export type Character = {
  id: string;
  name: string;
  classId: string;
  raceId: string;
  slots: Record<SlotKey, SlotItem>;
  macros: Macro[];
  updatedAt: number;
};

export function newId(): string {
  return crypto.randomUUID();
}

export function createCharacter(classId: string, raceId: string, name = `${raceId} ${classId}`): Character {
  return {
    id: newId(),
    name,
    classId,
    raceId,
    slots: {},
    macros: [],
    updatedAt: Date.now(),
  };
}

export function placeItem(character: Character, key: SlotKey, item: SlotItem): Character {
  return { ...character, slots: { ...character.slots, [key]: item } };
}

export function clearSlot(character: Character, key: SlotKey): Character {
  const slots = { ...character.slots };
  delete slots[key];
  return { ...character, slots };
}

/** Moving onto an occupied slot swaps the two items. */
export function moveItem(character: Character, from: SlotKey, to: SlotKey): Character {
  if (from === to) return character;
  const slots = { ...character.slots };
  const a = slots[from];
  const b = slots[to];
  if (a) slots[to] = a;
  else delete slots[to];
  if (b) slots[from] = b;
  else delete slots[from];
  return { ...character, slots };
}

/**
 * Changing race drops abilities the new race doesn't have (racials and
 * race-specific class spells) from the bars. `available` answers per ability id.
 */
export function setRace(character: Character, raceId: string, available: (abilityId: string) => boolean): Character {
  const slots = Object.fromEntries(
    Object.entries(character.slots).filter(([, item]) => item.type !== "ability" || available(item.id)),
  );
  return { ...character, raceId, slots };
}

export function upsertMacro(character: Character, item: Macro): Character {
  const others = character.macros.filter((c) => c.id !== item.id);
  return { ...character, macros: [...others, item] };
}

export function deleteMacro(character: Character, id: string): Character {
  const slots = Object.fromEntries(Object.entries(character.slots).filter(([, item]) => !(item.type === "macro" && item.id === id)));
  return { ...character, slots, macros: character.macros.filter((c) => c.id !== id) };
}
