// Fetches the talentsforever.com per-class exports (CC BY 4.0) and writes the
// slimmed ability data the site uses, plus the icons it references.
//
//   node scripts/build-data.mjs            # fetch fresh exports
//   node scripts/build-data.mjs --cached   # reuse .data-cache/ (no network for JSON)

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = join(ROOT, ".data-cache");
const OUT_DIR = join(ROOT, "src", "data", "classes");
const ICON_DIR = join(ROOT, "public", "icons");
const SOURCE = "https://talentsforever.com";

const CLASSES = ["Warrior", "Paladin", "Hunter", "Rogue", "Priest", "Shaman", "Mage", "Warlock", "Druid"];
const useCache = process.argv.includes("--cached");

// Generic icons offered for Custom Items (macros, consumables, mounts).
const EXTRA_ICONS = [
  "inv_potion_54", "inv_potion_76", "inv_stone_04", "inv_misc_bandage_15", "inv_misc_rune_01",
  "ability_mount_ridinghorse", "inv_misc_food_15", "inv_drink_07", "inv_misc_bomb_08",
  "trade_engineering", "inv_misc_note_01", "inv_misc_gear_01", "ability_hunter_pet_wolf",
];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadExport(className) {
  const slug = className.toLowerCase();
  const cachePath = join(CACHE_DIR, `${slug}.json`);
  if (!useCache || !(await exists(cachePath))) {
    const res = await fetch(`${SOURCE}/export/${slug}.json`);
    if (!res.ok) throw new Error(`${slug}.json: HTTP ${res.status}`);
    await writeFile(cachePath, await res.text());
  }
  return JSON.parse(await readFile(cachePath, "utf8"));
}

const rankNumber = (rank) => Number(/^Rank (\d+)$/.exec(rank)?.[1] ?? 0);

// Racials have no passive flag; active ones lead their text with cast info.
const RACIAL_ACTIVE = /^(\d+(-\d+)? yd range, )?(Instant|Channeled|[\d.]+ sec cast)/;

// Spellbook tabs holding pet abilities; those live on the pet bar, not the player's bars.
const PET_TABS = new Set(["Pets", "Demons"]);

function tooltipLines(desc) {
  if (!desc) return [];
  return desc.l.map(([left, right]) => [left, right].filter(Boolean).join("  ·  ")).filter(Boolean);
}

// "Requires Cat Form, Bear Form" lines → ["Cat Form", "Bear Form"] (forms, stances, weapons).
// Prowl-only openers say "Must be prowling" in their text instead.
function requirements(desc) {
  if (!desc) return undefined;
  const out = desc.l
    .flat()
    .flatMap((cell) => /^Requires (.+)$/.exec(cell)?.[1].split(/,\s*/) ?? []);
  if (/Must be prowling/.test(desc.d ?? "")) out.push("Prowl");
  return out.length ? out : undefined;
}

function isPassiveDesc(desc) {
  return !!desc && desc.l.some((line) => line.some((cell) => /\bPassive\b/.test(cell)));
}

function buildClass(data) {
  const cls = data.class;
  const book = data.spellbook;
  const descs = data.spell_desc;
  const gone = new Set(book.gone ?? []);
  const fromTalent = new Set(book.talents ?? []);

  const talentInfo = new Map();
  for (const tree of data.talents.trees) {
    for (const t of tree.talents) talentInfo.set(t.name, { tree: tree.name, passive: !!t.passive });
  }

  // Race-specific class spells (e.g. Priest's Starshards) live in the spellbook tabs;
  // tag them with the races that get them instead of listing them twice.
  const classRacialRaces = new Map();
  for (const [race, spells] of Object.entries(data.class_racials?.races ?? {})) {
    for (const [name] of spells) classRacialRaces.set(name, [...(classRacialRaces.get(name) ?? []), race]);
  }

  const abilities = [];

  // Level the ability is first learned at (rank 1), from the rank table or the tooltip.
  const firstLevel = (name, ranks) => {
    const fromTable = book.levels?.[name]?.[0];
    if (fromTable) return fromTable;
    const first = [...ranks].sort((a, b) => rankNumber(a) - rankNumber(b))[0];
    const lv = (descs[`${cls}|${name}|${first}`] ?? descs[`${cls}|${name}|`])?.lv;
    return Number(/level (\d+)/.exec(lv ?? "")?.[1]) || undefined;
  };

  const addSpell = (name, ranks, tab, general) => {
    if (gone.has(name)) return;
    if (ranks.includes("Passive")) return;
    const talent = fromTalent.has(name) ? talentInfo.get(name) : undefined;
    if (talent?.passive) return;
    // Highest rank wins: its tooltip and spell ID stand for the ability.
    const top = [...ranks].sort((a, b) => rankNumber(b) - rankNumber(a))[0];
    const desc = descs[`${cls}|${name}|${top}`] ?? descs[`${cls}|${name}|`];
    if (isPassiveDesc(desc)) return;
    const kind = ranks.includes("Shapeshift") ? "shapeshift" : ranks.includes("Summon") ? "summon" : undefined;
    abilities.push({
      id: name,
      name,
      icon: book.icons[name] ?? "inv_misc_questionmark",
      group: general ? "general" : talent ? "talent" : "baseline",
      tree: talent ? talent.tree : general ? undefined : tab,
      kind,
      spellId: desc?.id,
      rank: rankNumber(top) || undefined,
      level: firstLevel(name, ranks),
      lines: tooltipLines(desc),
      desc: desc?.d ?? "",
      requires: requirements(desc),
      races: classRacialRaces.get(name),
      trainer: desc?.nt ? false : undefined,
    });
  };

  const collect = (spells, tab, general) => {
    const byName = new Map();
    for (const [name, rank] of spells) {
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(rank);
    }
    for (const [name, ranks] of byName) addSpell(name, ranks, tab, general);
  };

  for (const tab of book.tabs) if (!PET_TABS.has(tab.name)) collect(tab.spells, tab.name, false);
  collect(book.general ?? [], undefined, true);

  const races = [];
  for (const [faction, entries] of Object.entries(data.racials)) {
    for (const entry of entries) {
      const racialIds = [];
      const add = ([name, text, icon]) => {
        if (!RACIAL_ACTIVE.test(text)) return;
        const id = `racial:${entry.race}:${name}`;
        racialIds.push(id);
        // "Instant, 2 min cooldown. Does X." -> header line + description
        const split = text.search(/\.\s+(?=[A-Z])/);
        const info = split > 0 ? text.slice(0, split) : "";
        const rest = split > 0 ? text.slice(split + 1).trim() : text;
        abilities.push({
          id,
          name,
          icon,
          group: "racial",
          race: entry.race,
          lines: info ? [info] : [],
          desc: rest,
        });
      };
      entry.abilities.forEach(add);
      races.push({ id: entry.race, name: entry.race, faction, icon: entry.icon, racials: racialIds });
    }
  }

  return {
    id: cls,
    name: cls,
    icon: data.talents.icon,
    trees: data.talents.trees.map((t) => t.name),
    tabs: book.tabs.map((t) => t.name).filter((t) => !PET_TABS.has(t)),
    races,
    abilities,
  };
}

async function downloadIcon(icon) {
  const path = join(ICON_DIR, `${icon}.jpg`);
  if (await exists(path)) return;
  let res = await fetch(`${SOURCE}/assets/icons/${icon}.jpg`);
  if (!res.ok) res = await fetch(`https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`);
  if (!res.ok) {
    console.warn(`  icon ${icon}: HTTP ${res.status}`);
    return;
  }
  await writeFile(path, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(ICON_DIR, { recursive: true });

  const icons = new Set(["inv_misc_questionmark", ...EXTRA_ICONS]);
  let generated = "";
  for (const cls of CLASSES) {
    const data = await loadExport(cls);
    generated = data.generated ?? generated;
    const out = buildClass(data);
    out.generated = data.generated;
    await writeFile(join(OUT_DIR, `${cls.toLowerCase()}.json`), JSON.stringify(out));
    icons.add(out.icon);
    for (const r of out.races) icons.add(r.icon);
    for (const a of out.abilities) icons.add(a.icon);
    console.log(`${cls}: ${out.abilities.length} abilities, ${out.races.length} races`);
  }

  const queue = [...icons];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (queue.length) await downloadIcon(queue.pop());
    }),
  );
  const available = [...icons].filter((i) => EXTRA_ICONS.includes(i));
  const present = [];
  for (const i of available) if (await exists(join(ICON_DIR, `${i}.jpg`))) present.push(i);
  const allIcons = [];
  for (const i of [...icons].sort()) if (await exists(join(ICON_DIR, `${i}.jpg`))) allIcons.push(i);
  await writeFile(
    join(OUT_DIR, "..", "meta.json"),
    JSON.stringify({ generated, source: SOURCE, extraIcons: present, icons: allIcons }),
  );
  console.log(`${icons.size} icons checked`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
