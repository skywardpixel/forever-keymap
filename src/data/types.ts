export type AbilityGroup = "baseline" | "talent" | "racial" | "general";

export type Ability = {
  /** Stable within a class: the spell name, or `racial:<race>:<name>`. */
  id: string;
  name: string;
  icon: string;
  group: AbilityGroup;
  /** Spellbook tab (baseline) or talent tree (talent). */
  tree?: string;
  race?: string;
  kind?: "shapeshift" | "summon";
  spellId?: number;
  rank?: number;
  level?: number;
  lines: string[];
  desc: string;
  /** Forms, stances or weapons the ability needs, e.g. ["Cat Form", "Prowl"]. */
  requires?: string[];
  /** false when the class trainer doesn't sell the top rank. */
  trainer?: false;
};

export type Race = {
  id: string;
  name: string;
  faction: "Horde" | "Alliance";
  icon: string;
  racials: string[];
};

export type ClassData = {
  id: string;
  name: string;
  icon: string;
  trees: string[];
  tabs: string[];
  races: Race[];
  abilities: Ability[];
  generated: string;
};
