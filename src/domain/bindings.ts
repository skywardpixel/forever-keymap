import { BARS, SLOTS_PER_BAR, slotTarget } from "./bars";
import type { Chord } from "./chords";
import { GAME_BINDINGS } from "./gameBindings";

/** Binding target id (a WoW binding name) → up to two chords, primary first. */
export type Bindings = Record<string, Chord[]>;

export const MAX_CHORDS_PER_TARGET = 2;

const MAIN_BAR_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="];

export const ALL_TARGETS: string[] = [
  ...BARS.flatMap((bar) => Array.from({ length: SLOTS_PER_BAR }, (_, i) => slotTarget(bar.id, i))),
  ...GAME_BINDINGS.map((g) => g.id),
];

export const DEFAULT_BINDINGS: Bindings = Object.freeze(
  Object.fromEntries([
    ...MAIN_BAR_KEYS.map((key, i) => [slotTarget("MAIN", i), [key]]),
    ...GAME_BINDINGS.map((g) => [g.id, g.defaults]),
  ]),
);

export function defaultChords(target: string): Chord[] {
  return DEFAULT_BINDINGS[target] ?? [];
}

export function chordsOf(bindings: Bindings, target: string): Chord[] {
  return bindings[target] ?? [];
}

/** chord → target that owns it. */
export function chordIndex(bindings: Bindings): Map<Chord, string> {
  const index = new Map<Chord, string>();
  for (const [target, chords] of Object.entries(bindings)) for (const c of chords) index.set(c, target);
  return index;
}

const DEFAULT_INDEX = chordIndex(DEFAULT_BINDINGS);

export function defaultTargetOf(chord: Chord): string | undefined {
  return DEFAULT_INDEX.get(chord);
}

function without(bindings: Bindings, chord: Chord): { bindings: Bindings; from?: string } {
  for (const [target, chords] of Object.entries(bindings)) {
    if (chords.includes(chord)) {
      return { bindings: { ...bindings, [target]: chords.filter((c) => c !== chord) }, from: target };
    }
  }
  return { bindings };
}

export type BindResult = { bindings: Bindings; movedFrom?: string };

/**
 * Binds a chord to a target the way the game does: the chord leaves whatever
 * target held it, fills the target's empty slot, or replaces its secondary.
 */
export function bind(bindings: Bindings, target: string, chord: Chord): BindResult {
  const current = chordsOf(bindings, target);
  if (current.includes(chord)) return { bindings };
  const removed = without(bindings, chord);
  const chords =
    current.length < MAX_CHORDS_PER_TARGET ? [...current, chord] : [...current.slice(0, MAX_CHORDS_PER_TARGET - 1), chord];
  return { bindings: { ...removed.bindings, [target]: chords }, movedFrom: removed.from };
}

export function clearTarget(bindings: Bindings, target: string): Bindings {
  return { ...bindings, [target]: [] };
}

/**
 * Restores a target's default chords. With `steal`, defaults are taken back from
 * whichever target holds them now; otherwise only free chords are restored.
 */
export function resetTarget(bindings: Bindings, target: string, steal = true): Bindings {
  let next: Bindings = { ...bindings, [target]: [] };
  const index = chordIndex(next);
  for (const chord of defaultChords(target)) {
    if (!steal && index.has(chord)) continue;
    next = bind(next, target, chord).bindings;
  }
  return next;
}

/** Whether the chord now triggers something other than its WoW default. */
export function isChanged(index: Map<Chord, string>, chord: Chord): boolean {
  return index.get(chord) !== DEFAULT_INDEX.get(chord);
}

/** Targets whose chords differ from the defaults (order-sensitive: primary matters). */
export function bindingDiff(bindings: Bindings): Bindings {
  const diff: Bindings = {};
  for (const target of new Set([...Object.keys(bindings), ...Object.keys(DEFAULT_BINDINGS)])) {
    const a = chordsOf(bindings, target);
    const b = defaultChords(target);
    if (a.length !== b.length || a.some((c, i) => c !== b[i])) diff[target] = a;
  }
  return diff;
}

export function applyDiff(diff: Bindings): Bindings {
  return { ...structuredClone(DEFAULT_BINDINGS), ...diff };
}

/**
 * Sets one specific key (0 = primary, 1 = secondary) on a target, like WoW's
 * Key 1 / Key 2 columns. The chord leaves whatever target held it.
 */
export function setChordAt(bindings: Bindings, target: string, index: number, chord: Chord): BindResult {
  const removed = without(bindings, chord);
  const chords = [...chordsOf(removed.bindings, target)];
  if (index >= chords.length) chords.push(chord);
  else chords[index] = chord;
  return {
    bindings: { ...removed.bindings, [target]: chords.slice(0, MAX_CHORDS_PER_TARGET) },
    movedFrom: removed.from === target ? undefined : removed.from,
  };
}

/** Removes one key from a target; a secondary key moves up to primary. */
export function removeChord(bindings: Bindings, target: string, chord: Chord): Bindings {
  return { ...bindings, [target]: chordsOf(bindings, target).filter((c) => c !== chord) };
}
