import type { Ability, ClassData } from "./types";

export const CLASS_IDS = ["Warrior", "Paladin", "Hunter", "Rogue", "Priest", "Shaman", "Mage", "Warlock", "Druid"];

export const CLASS_COLORS: Record<string, string> = {
  Warrior: "#C69B6D",
  Paladin: "#F48CBA",
  Hunter: "#AAD372",
  Rogue: "#FFF468",
  Priest: "#FFFFFF",
  Shaman: "#0070DD",
  Mage: "#3FC7EB",
  Warlock: "#8788EE",
  Druid: "#FF7C0A",
};

export const CLASS_ICONS: Record<string, string> = Object.fromEntries(CLASS_IDS.map((c) => [c, `class_${c.toLowerCase()}`]));

const loaders = import.meta.glob<ClassData>("./classes/*.json", { import: "default" });

const cache = new Map<string, Promise<ClassData>>();

export function loadClass(classId: string): Promise<ClassData> {
  if (!cache.has(classId)) {
    const loader = loaders[`./classes/${classId.toLowerCase()}.json`];
    if (!loader) return Promise.reject(new Error(`Unknown class ${classId}`));
    cache.set(classId, loader());
  }
  return cache.get(classId)!;
}

/** Whether a character of this race has the ability (racials and race-specific class spells). */
export function availableToRace(ability: Ability, raceId: string): boolean {
  if (ability.group === "racial") return ability.race === raceId;
  return !ability.races || ability.races.includes(raceId);
}

/** Racials and race-specific class spells both count as racial for display and filtering. */
export function isRacial(ability: Ability): boolean {
  return ability.group === "racial" || !!ability.races;
}

export function iconUrl(icon: string): string {
  return `/icons/${icon}.jpg`;
}
