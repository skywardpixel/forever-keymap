import { describe, expect, it } from "vitest";
import { applyDiff, bind, bindingDiff, chordIndex, DEFAULT_BINDINGS, isChanged, removeChord, resetTarget, setChordAt } from "./bindings";
import { isBindable, longChord, makeChord, parseChord, shortChord } from "./chords";
import { applyPreset, BINDING_PRESETS, isPresetActive, undoPreset } from "./presets";
import { activePages, addonPagesInUse, barsNeedingAddon, isPaged, pageOf } from "./bars";
import { createCharacter, placeAndPickUp, placeItem, setAddonPage, setBarPaging, setRace } from "./character";
import { decodeShare, encodeShare } from "./share";
import { fromV1 } from "./storage";

const preset = (id: string) => BINDING_PRESETS.find((p) => p.id === id)!;

describe("chords", () => {
  it("round-trips modifiers, including the minus key", () => {
    expect(parseChord("SHIFT--")).toEqual({ mods: { alt: false, ctrl: false, shift: true }, input: "-" });
    expect(parseChord("-").input).toBe("-");
    expect(makeChord({ alt: true, ctrl: true, shift: true }, "Q")).toBe("ALT-CTRL-SHIFT-Q");
  });

  it("labels mouse inputs", () => {
    expect(shortChord("SHIFT-BUTTON4")).toBe("S-M4");
    expect(shortChord("MOUSEWHEELUP")).toBe("MwU");
    expect(longChord("CTRL-MOUSEWHEELDOWN")).toBe("Ctrl-Wheel Down");
  });

  it("reserves bare left/right click", () => {
    expect(isBindable("BUTTON1")).toBe(false);
    expect(isBindable("SHIFT-BUTTON2")).toBe(true);
    expect(isBindable("BUTTON4")).toBe(true);
  });
});

describe("bindings", () => {
  it("moves a chord away from its previous owner", () => {
    const { bindings, movedFrom } = bind(DEFAULT_BINDINGS, "MULTIACTIONBAR1BUTTON1", "E");
    expect(movedFrom).toBe("STRAFERIGHT");
    expect(bindings.STRAFERIGHT).toEqual([]);
    expect(bindings.MULTIACTIONBAR1BUTTON1).toEqual(["E"]);
  });

  it("keeps two chords per target, replacing the secondary", () => {
    let b = bind(DEFAULT_BINDINGS, "MULTIACTIONBAR1BUTTON1", "SHIFT-Q").bindings;
    b = bind(b, "MULTIACTIONBAR1BUTTON1", "SHIFT-E").bindings;
    b = bind(b, "MULTIACTIONBAR1BUTTON1", "SHIFT-R").bindings;
    expect(b.MULTIACTIONBAR1BUTTON1).toEqual(["SHIFT-Q", "SHIFT-R"]);
  });

  it("tracks chords changed from default", () => {
    const b = bind(DEFAULT_BINDINGS, "MULTIACTIONBAR1BUTTON1", "E").bindings;
    const index = chordIndex(b);
    expect(isChanged(index, "E")).toBe(true);
    expect(isChanged(index, "W")).toBe(false);
    expect(isChanged(index, "SHIFT-Q")).toBe(false);
  });

  it("resets a target, taking its defaults back", () => {
    const b = bind(DEFAULT_BINDINGS, "MULTIACTIONBAR1BUTTON1", "E").bindings;
    const r = resetTarget(b, "STRAFERIGHT");
    expect(r.STRAFERIGHT).toEqual(["E"]);
    expect(r.MULTIACTIONBAR1BUTTON1).toEqual([]);
  });

  it("stores only differences", () => {
    const b = bind(DEFAULT_BINDINGS, "MULTIACTIONBAR1BUTTON1", "E").bindings;
    expect(bindingDiff(b)).toEqual({ MULTIACTIONBAR1BUTTON1: ["E"], STRAFERIGHT: [] });
    expect(applyDiff(bindingDiff(b))).toEqual(b);
  });
});

describe("presets", () => {
  it("A/D strafe frees Q/E and undoes cleanly", () => {
    const ad = preset("ad-strafe");
    const on = applyPreset(DEFAULT_BINDINGS, ad);
    expect(isPresetActive(on, ad)).toBe(true);
    expect(chordIndex(on).has("Q")).toBe(false);
    expect(chordIndex(on).has("E")).toBe(false);
    expect(isPresetActive(undoPreset(on, ad), ad)).toBe(false);
    expect(undoPreset(on, ad)).toEqual({ ...DEFAULT_BINDINGS });
  });

  it("undo does not steal chords bound since", () => {
    const ad = preset("ad-strafe");
    const on = bind(applyPreset(DEFAULT_BINDINGS, ad), "ACTIONBUTTON1", "Q").bindings;
    const off = undoPreset(on, ad);
    expect(off.ACTIONBUTTON1).toContain("Q");
    expect(off.STRAFELEFT).toEqual([]);
    expect(off.TURNLEFT).toEqual(["A", "LEFT"]);
  });
});

describe("characters", () => {
  const charge = { type: "ability", id: "Charge" } as const;
  const rend = { type: "ability", id: "Rend" } as const;

  it("picks up what was in a slot when another item lands on it", () => {
    const p = placeItem(createCharacter("Warrior", "Orc"), "MAIN:battle:1", rend);
    const { character, pickedUp } = placeAndPickUp(p, "MAIN:battle:1", charge);
    expect(character.slots["MAIN:battle:1"]).toEqual(charge);
    expect(pickedUp).toEqual(rend);
  });

  it("moving between slots empties the source and picks up the target's item", () => {
    let p = placeItem(createCharacter("Warrior", "Orc"), "MAIN:battle:0", charge);
    p = placeItem(p, "MAIN:battle:1", rend);
    const { character, pickedUp } = placeAndPickUp(p, "MAIN:battle:1", charge, "MAIN:battle:0");
    expect(character.slots["MAIN:battle:0"]).toBeUndefined();
    expect(character.slots["MAIN:battle:1"]).toEqual(charge);
    expect(pickedUp).toEqual(rend);
  });

  it("picks up nothing from an empty slot, the same item, or a drop onto itself", () => {
    const p = placeItem(createCharacter("Warrior", "Orc"), "MAIN:battle:0", charge);
    expect(placeAndPickUp(p, "MAIN:battle:5", rend).pickedUp).toBeUndefined();
    expect(placeAndPickUp(p, "MAIN:battle:0", charge).pickedUp).toBeUndefined();
    expect(placeAndPickUp(p, "MAIN:battle:0", charge, "MAIN:battle:0").character).toBe(p);
  });

  it("drops abilities the new race doesn't have on race change", () => {
    let p = createCharacter("Priest", "Night Elf");
    p = placeItem(p, "MAIN:default:0", { type: "ability", id: "racial:Night Elf:Shadowmeld" });
    p = placeItem(p, "MAIN:default:1", { type: "ability", id: "Starshards" });
    p = placeItem(p, "MAIN:default:2", { type: "ability", id: "Smite" });
    const nightElfOnly = new Set(["racial:Night Elf:Shadowmeld", "Starshards"]);
    p = setRace(p, "Human", (id) => !nightElfOnly.has(id));
    expect(Object.keys(p.slots)).toEqual(["MAIN:default:2"]);
  });

  it("round-trips through a share code", async () => {
    let p = createCharacter("Druid", "Tauren", "Feral PvP");
    p = placeItem(p, "MAIN:cat:3", { type: "ability", id: "Shred" });
    p = { ...p, macros: [{ id: "c1", name: "Potion", icon: "inv_potion_54" }] };
    p = placeItem(p, "RIGHT:default:0", { type: "macro", id: "c1" });
    const keymap = applyPreset(DEFAULT_BINDINGS, preset("ad-strafe"));
    const code = await encodeShare(p, keymap);
    expect(code.startsWith("1.")).toBe(true);
    const back = await decodeShare(code);
    expect(back).toEqual({
      character: { name: p.name, classId: p.classId, raceId: p.raceId, slots: p.slots, macros: p.macros },
      keymap,
    });
  });
});

describe("storage", () => {
  it("moves v1 per-profile bindings into one account keymap, newest wins", () => {
    const older = { ...createCharacter("Warrior", "Orc"), updatedAt: 1, bindings: DEFAULT_BINDINGS };
    const newer = {
      ...createCharacter("Druid", "Tauren"),
      updatedAt: 2,
      bindings: applyPreset(DEFAULT_BINDINGS, preset("ad-strafe")),
      macros: undefined, // v1 saves from before the rename had only customItems
      customItems: [{ id: "m1", name: "Potion", icon: "inv_potion_54" }],
      slots: { "MAIN:default:0": { type: "custom", id: "m1" } },
    };
    const saved = fromV1({ profiles: [older, newer] as never, activeId: older.id });
    expect(saved.keymap).toEqual(newer.bindings);
    expect(saved.activeId).toBe(older.id);
    expect(saved.characters.map((c) => "bindings" in c)).toEqual([false, false]);
    expect(saved.characters[1].macros).toEqual(newer.customItems);
    expect(saved.characters[1].slots["MAIN:default:0"]).toEqual({ type: "macro", id: "m1" });
  });
});

describe("key 1 / key 2", () => {
  it("replaces exactly the chosen key", () => {
    const { bindings } = setChordAt(DEFAULT_BINDINGS, "MOVEFORWARD", 1, "NUMPAD8");
    expect(bindings.MOVEFORWARD).toEqual(["W", "NUMPAD8"]);
  });

  it("appends when the target has fewer keys", () => {
    const { bindings, movedFrom } = setChordAt(DEFAULT_BINDINGS, "JUMP", 1, "BUTTON4");
    expect(bindings.JUMP).toEqual(["SPACE", "BUTTON4"]);
    expect(movedFrom).toBeUndefined();
  });

  it("takes the chord from its previous owner", () => {
    const { bindings, movedFrom } = setChordAt(DEFAULT_BINDINGS, "ACTIONBUTTON1", 1, "Q");
    expect(movedFrom).toBe("STRAFELEFT");
    expect(bindings.ACTIONBUTTON1).toEqual(["1", "Q"]);
    expect(bindings.STRAFELEFT).toEqual([]);
  });

  it("moving a target's own key between columns keeps one copy", () => {
    const { bindings } = setChordAt(DEFAULT_BINDINGS, "MOVEFORWARD", 0, "UP");
    expect(bindings.MOVEFORWARD).toEqual(["UP"]);
  });

  it("removing the primary promotes the secondary", () => {
    expect(removeChord(DEFAULT_BINDINGS, "MOVEFORWARD", "W").MOVEFORWARD).toEqual(["UP"]);
  });
});

describe("bar paging", () => {
  it("defaults to the default UI: Bar 1 only, and never for Shadowform", () => {
    expect(isPaged("Warrior", undefined, "MAIN")).toBe(true);
    expect(isPaged("Warrior", undefined, "BOTTOMLEFT")).toBe(false);
    expect(isPaged("Priest", undefined, "MAIN")).toBe(false);
    expect(isPaged("Mage", { MAIN: true }, "MAIN")).toBe(false); // nothing to page on
    expect(barsNeedingAddon("Warrior", undefined)).toEqual([]);
  });

  it("flags any deviation from the default UI as needing an addon", () => {
    let c = setBarPaging(createCharacter("Druid", "Tauren"), "BOTTOMLEFT", true);
    expect(barsNeedingAddon(c.classId, c.barPaging)).toEqual(["BOTTOMLEFT"]);
    c = setBarPaging(c, "MAIN", false);
    expect(barsNeedingAddon(c.classId, c.barPaging)).toEqual(["MAIN", "BOTTOMLEFT"]);
    expect(pageOf(c.classId, c.barPaging, "MAIN", "cat")).toBe("default");
    expect(pageOf(c.classId, c.barPaging, "BOTTOMLEFT", "cat")).toBe("cat");
  });

  it("drops overrides that match the default UI", () => {
    let c = setBarPaging(createCharacter("Priest", "Undead"), "MAIN", true);
    expect(c.barPaging).toEqual({ MAIN: true });
    c = setBarPaging(c, "MAIN", false);
    expect(c.barPaging).toBeUndefined();
  });

  it("round-trips paging through a share code", async () => {
    const c = setBarPaging(createCharacter("Priest", "Undead"), "MAIN", true);
    const { character } = await decodeShare(await encodeShare(c, DEFAULT_BINDINGS));
    expect(character.barPaging).toEqual({ MAIN: true });
  });
});

describe("addon-only pages", () => {
  it("keeps Moonkin off for Druids until they opt in", () => {
    const ids = (c: { classId: string; addonPages?: string[] }) => activePages(c.classId, c.addonPages).map((p) => p.id);
    let c = createCharacter("Druid", "Tauren");
    expect(ids(c)).toEqual(["default", "bear", "cat", "prowl"]);
    expect(addonPagesInUse(c.classId, c.barPaging, c.addonPages)).toEqual([]);
    c = setAddonPage(c, "moonkin", true);
    expect(ids(c)).toEqual(["default", "bear", "cat", "prowl", "moonkin"]);
    expect(addonPagesInUse(c.classId, c.barPaging, c.addonPages).map((p) => p.id)).toEqual(["moonkin"]);
    c = setAddonPage(c, "moonkin", false);
    expect(c.addonPages).toBeUndefined();
  });

  it("gives Priests Shadowform as soon as a bar pages", () => {
    let c = createCharacter("Priest", "Undead");
    expect(addonPagesInUse(c.classId, c.barPaging, c.addonPages)).toEqual([]);
    c = setBarPaging(c, "MAIN", true);
    expect(addonPagesInUse(c.classId, c.barPaging, c.addonPages).map((p) => p.id)).toEqual(["shadowform"]);
  });

  it("round-trips opted-in pages through a share code", async () => {
    const c = setAddonPage(createCharacter("Druid", "Tauren"), "moonkin", true);
    const { character } = await decodeShare(await encodeShare(c, DEFAULT_BINDINGS));
    expect(character.addonPages).toEqual(["moonkin"]);
  });
});
