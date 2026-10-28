// Read-side helpers the components share: resolving slot items and naming targets.
import { BARS, slotFromTarget } from "../domain/bars";
import { GAME_BINDINGS_BY_ID } from "../domain/gameBindings";
import type { Macro, Character, SlotItem } from "../domain/character";
import type { Ability, ClassData } from "../data/types";

export type ResolvedItem = { name: string; icon: string; ability?: Ability; macro?: Macro };

export type Catalog = {
  abilities: Map<string, Ability>;
  macros: Map<string, Macro>;
};

export function makeCatalog(data: ClassData, character: Character): Catalog {
  return {
    abilities: new Map(data.abilities.map((a) => [a.id, a])),
    macros: new Map(character.macros.map((c) => [c.id, c])),
  };
}

export function resolveItem(catalog: Catalog, item: SlotItem | undefined): ResolvedItem | undefined {
  if (!item) return undefined;
  if (item.type === "ability") {
    // Older saves listed race-specific class spells as "racial:<race>:<name>"; they now use the spell name.
    const ability = catalog.abilities.get(item.id) ?? catalog.abilities.get(item.id.replace(/^racial:[^:]+:/, ""));
    return ability
      ? { name: ability.name, icon: ability.icon, ability }
      : { name: item.id.replace(/^racial:[^:]+:/, ""), icon: "inv_misc_questionmark" };
  }
  const macro = catalog.macros.get(item.id);
  return macro ? { name: macro.name, icon: macro.icon, macro } : undefined;
}

export function targetName(target: string): string {
  const slot = slotFromTarget(target);
  if (slot) return `${BARS.find((b) => b.id === slot.bar)!.name} slot ${slot.index + 1}`;
  return GAME_BINDINGS_BY_ID.get(target)?.label ?? target;
}

/** A few characters naming a target on a key cap. */
export function targetShort(target: string): string {
  const slot = slotFromTarget(target);
  if (slot) return `${BARS.findIndex((b) => b.id === slot.bar) + 1}·${slot.index + 1}`;
  return GAME_BINDINGS_BY_ID.get(target)?.short ?? target;
}
