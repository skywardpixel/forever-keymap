import { describe, expect, it } from "vitest";
import { applyDiff, bind, bindingDiff, chordIndex, DEFAULT_BINDINGS, isChanged, removeChord, resetTarget, setChordAt } from "./bindings";
import { isBindable, longChord, makeChord, parseChord, shortChord } from "./chords";
import { applyPreset, BINDING_PRESETS, isPresetActive, undoPreset } from "./presets";
import { createProfile, moveItem, placeItem, setRace } from "./profile";
import { decodeProfile, encodeProfile } from "./share";

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

describe("profiles", () => {
  it("swaps items when moving onto an occupied slot", () => {
    let p = createProfile("Warrior", "Orc");
    p = placeItem(p, "MAIN:battle:0", { type: "ability", id: "Charge" });
    p = placeItem(p, "MAIN:battle:1", { type: "ability", id: "Rend" });
    p = moveItem(p, "MAIN:battle:0", "MAIN:battle:1");
    expect(p.slots["MAIN:battle:0"]).toEqual({ type: "ability", id: "Rend" });
    expect(p.slots["MAIN:battle:1"]).toEqual({ type: "ability", id: "Charge" });
  });

  it("drops old racials on race change", () => {
    let p = createProfile("Warrior", "Orc");
    p = placeItem(p, "MAIN:battle:0", { type: "ability", id: "racial:Orc:Blood Fury" });
    p = placeItem(p, "MAIN:battle:1", { type: "ability", id: "Charge" });
    p = setRace(p, "Tauren");
    expect(Object.keys(p.slots)).toEqual(["MAIN:battle:1"]);
  });

  it("round-trips through a share code", async () => {
    let p = createProfile("Druid", "Tauren", "Feral PvP");
    p = placeItem(p, "MAIN:cat:3", { type: "ability", id: "Shred" });
    p = { ...p, macros: [{ id: "c1", name: "Potion", icon: "inv_potion_54" }] };
    p = placeItem(p, "RIGHT:default:0", { type: "macro", id: "c1" });
    p = { ...p, bindings: applyPreset(p.bindings, preset("ad-strafe")) };
    const code = await encodeProfile(p);
    expect(code.startsWith("1.")).toBe(true);
    const back = await decodeProfile(code);
    expect(back).toEqual({
      name: p.name,
      classId: p.classId,
      raceId: p.raceId,
      slots: p.slots,
      macros: p.macros,
      bindings: p.bindings,
    });
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
