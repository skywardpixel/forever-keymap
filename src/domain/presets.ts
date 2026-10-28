import { bind, chordsOf, resetTarget, type Bindings } from "./bindings";
import type { Chord } from "./chords";

export type BindingPreset = {
  id: string;
  name: string;
  description: string;
  /** The exact chords each listed target ends up with. */
  targets: Record<string, Chord[]>;
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const cleared = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, [] as Chord[]]));

export const BINDING_PRESETS: BindingPreset[] = [
  {
    id: "ad-strafe",
    name: "A/D strafe",
    description: "Strafe on A/D, turn on the arrow keys. Frees Q and E.",
    targets: {
      STRAFELEFT: ["A"],
      STRAFERIGHT: ["D"],
      TURNLEFT: ["LEFT"],
      TURNRIGHT: ["RIGHT"],
    },
  },
  {
    id: "free-shift-numbers",
    name: "Free Shift-numbers",
    description: "Unbinds action page switching (Shift-1–6, Shift-Up/Down).",
    targets: cleared([...range(6).map((i) => `ACTIONPAGE${i}`), "PREVIOUSACTIONPAGE", "NEXTACTIONPAGE"]),
  },
  {
    id: "free-ctrl-bars",
    name: "Free pet/stance Ctrl-keys",
    description: "Unbinds the pet bar (Ctrl-1–0) and stance bar (Ctrl-F1–F10).",
    targets: cleared([...range(10).map((i) => `BONUSACTIONBUTTON${i}`), ...range(10).map((i) => `SHAPESHIFTBUTTON${i}`)]),
  },
  {
    id: "free-f-keys",
    name: "Free F1–F5",
    description: "Unbinds Target Self and party member targeting.",
    targets: cleared(["TARGETSELF", ...range(4).map((i) => `TARGETPARTYMEMBER${i}`)]),
  },
  {
    id: "free-rvz",
    name: "Free R/V/Z",
    description: "Unbinds Reply, Nameplates and Sheathe.",
    targets: cleared(["REPLY", "NAMEPLATES", "TOGGLESHEATH"]),
  },
];

export function isPresetActive(bindings: Bindings, preset: BindingPreset): boolean {
  return Object.entries(preset.targets).every(([target, chords]) => {
    const current = chordsOf(bindings, target);
    return current.length === chords.length && current.every((c, i) => c === chords[i]);
  });
}

export function applyPreset(bindings: Bindings, preset: BindingPreset): Bindings {
  let next = { ...bindings };
  for (const target of Object.keys(preset.targets)) next[target] = [];
  for (const [target, chords] of Object.entries(preset.targets)) {
    for (const chord of chords) next = bind(next, target, chord).bindings;
  }
  return next;
}

/** Puts the preset's targets back to their defaults without stealing chords bound since. */
export function undoPreset(bindings: Bindings, preset: BindingPreset): Bindings {
  let next = { ...bindings };
  for (const target of Object.keys(preset.targets)) next[target] = [];
  for (const target of Object.keys(preset.targets)) next = resetTarget(next, target, false);
  return next;
}
