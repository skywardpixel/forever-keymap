import { DEFAULT_BINDINGS, type Bindings } from "./bindings";
import type { SlotKey } from "./bars";

export type Macro = { id: string; name: string; icon: string };

export type SlotItem = { type: "ability"; id: string } | { type: "macro"; id: string };

export type Profile = {
  id: string;
  name: string;
  classId: string;
  raceId: string;
  slots: Record<SlotKey, SlotItem>;
  macros: Macro[];
  bindings: Bindings;
  updatedAt: number;
};

export function newId(): string {
  return crypto.randomUUID();
}

export function createProfile(classId: string, raceId: string, name = `${raceId} ${classId}`): Profile {
  return {
    id: newId(),
    name,
    classId,
    raceId,
    slots: {},
    macros: [],
    bindings: structuredClone(DEFAULT_BINDINGS),
    updatedAt: Date.now(),
  };
}

export function placeItem(profile: Profile, key: SlotKey, item: SlotItem): Profile {
  return { ...profile, slots: { ...profile.slots, [key]: item } };
}

export function clearSlot(profile: Profile, key: SlotKey): Profile {
  const slots = { ...profile.slots };
  delete slots[key];
  return { ...profile, slots };
}

/** Moving onto an occupied slot swaps the two items. */
export function moveItem(profile: Profile, from: SlotKey, to: SlotKey): Profile {
  if (from === to) return profile;
  const slots = { ...profile.slots };
  const a = slots[from];
  const b = slots[to];
  if (a) slots[to] = a;
  else delete slots[to];
  if (b) slots[from] = b;
  else delete slots[from];
  return { ...profile, slots };
}

/** Changing race drops the old race's racials from the bars. */
export function setRace(profile: Profile, raceId: string): Profile {
  const slots = Object.fromEntries(
    Object.entries(profile.slots).filter(
      ([, item]) => !(item.type === "ability" && item.id.startsWith("racial:") && !item.id.startsWith(`racial:${raceId}:`)),
    ),
  );
  return { ...profile, raceId, slots };
}

export function upsertMacro(profile: Profile, item: Macro): Profile {
  const others = profile.macros.filter((c) => c.id !== item.id);
  return { ...profile, macros: [...others, item] };
}

export function deleteMacro(profile: Profile, id: string): Profile {
  const slots = Object.fromEntries(Object.entries(profile.slots).filter(([, item]) => !(item.type === "macro" && item.id === id)));
  return { ...profile, slots, macros: profile.macros.filter((c) => c.id !== id) };
}
