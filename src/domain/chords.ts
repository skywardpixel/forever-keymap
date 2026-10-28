// A Chord is stored in WoW's own binding-string format ("ALT-CTRL-SHIFT-Q",
// "SHIFT-BUTTON4", "MOUSEWHEELUP") so a future import addon can use it as-is.
export type Chord = string;

export type Modifiers = { alt: boolean; ctrl: boolean; shift: boolean };

export const NO_MODS: Modifiers = { alt: false, ctrl: false, shift: false };

export function makeChord(mods: Modifiers, input: string): Chord {
  return [mods.alt && "ALT", mods.ctrl && "CTRL", mods.shift && "SHIFT", input].filter(Boolean).join("-");
}

export function parseChord(chord: Chord): { mods: Modifiers; input: string } {
  const parts = chord.split("-");
  const mods = { ...NO_MODS };
  let i = 0;
  // A trailing "-" is the minus key itself, so stop before the last part.
  while (i < parts.length - 1) {
    if (parts[i] === "ALT") mods.alt = true;
    else if (parts[i] === "CTRL") mods.ctrl = true;
    else if (parts[i] === "SHIFT") mods.shift = true;
    else break;
    i++;
  }
  const input = parts.slice(i).join("-") || "-";
  return { mods, input };
}

export function sameMods(a: Modifiers, b: Modifiers): boolean {
  return a.alt === b.alt && a.ctrl === b.ctrl && a.shift === b.shift;
}

const CODE_TO_INPUT: Record<string, string> = {
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Space: "SPACE",
  Tab: "TAB",
  Enter: "ENTER",
  NumpadEnter: "ENTER",
  Backspace: "BACKSPACE",
  Delete: "DELETE",
  Insert: "INSERT",
  Home: "HOME",
  End: "END",
  PageUp: "PAGEUP",
  PageDown: "PAGEDOWN",
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
  CapsLock: "CAPSLOCK",
  NumLock: "NUMLOCK",
  ScrollLock: "SCROLLLOCK",
  Pause: "PAUSE",
  PrintScreen: "PRINTSCREEN",
  NumpadAdd: "NUMPADPLUS",
  NumpadSubtract: "NUMPADMINUS",
  NumpadMultiply: "NUMPADMULTIPLY",
  NumpadDivide: "NUMPADDIVIDE",
  NumpadDecimal: "NUMPADDECIMAL",
};

/** Maps KeyboardEvent.code (layout-independent) to a WoW input name, or null if unbindable. */
export function inputFromCode(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1[0-2])$/.test(code)) return code;
  if (/^Numpad\d$/.test(code)) return `NUMPAD${code.slice(6)}`;
  return CODE_TO_INPUT[code] ?? null;
}

export function modsFromEvent(e: { altKey: boolean; ctrlKey: boolean; shiftKey: boolean; metaKey?: boolean }): Modifiers {
  // Treat Cmd as Ctrl on macOS keyboards.
  return { alt: e.altKey, ctrl: e.ctrlKey || !!e.metaKey, shift: e.shiftKey };
}

/** DOM MouseEvent.button → WoW mouse input. */
export function inputFromMouseButton(button: number): string | null {
  return ({ 0: "BUTTON1", 1: "BUTTON3", 2: "BUTTON2", 3: "BUTTON4", 4: "BUTTON5" } as Record<number, string>)[button] ?? null;
}

/** Bare left/right click stays reserved for the UI; with a modifier it's bindable. */
export function isBindable(chord: Chord): boolean {
  const { mods, input } = parseChord(chord);
  if (input === "BUTTON1" || input === "BUTTON2") return mods.alt || mods.ctrl || mods.shift;
  return true;
}

export const EXTRA_MOUSE_BUTTONS = ["BUTTON6", "BUTTON7", "BUTTON8", "BUTTON9", "BUTTON10"];

const SHORT: Record<string, string> = {
  MOUSEWHEELUP: "MwU",
  MOUSEWHEELDOWN: "MwD",
  SPACE: "Spc",
  BACKSPACE: "Bksp",
  CAPSLOCK: "Caps",
  NUMLOCK: "NumLk",
  SCROLLLOCK: "ScrLk",
  PRINTSCREEN: "PrtSc",
  PAGEUP: "PgUp",
  PAGEDOWN: "PgDn",
  INSERT: "Ins",
  DELETE: "Del",
  HOME: "Home",
  END: "End",
  PAUSE: "Pause",
  ENTER: "Enter",
  TAB: "Tab",
  UP: "↑",
  DOWN: "↓",
  LEFT: "←",
  RIGHT: "→",
  NUMPADPLUS: "N+",
  NUMPADMINUS: "N-",
  NUMPADMULTIPLY: "N*",
  NUMPADDIVIDE: "N/",
  NUMPADDECIMAL: "N.",
};

export function shortInput(input: string): string {
  if (SHORT[input]) return SHORT[input];
  const button = /^BUTTON(\d+)$/.exec(input);
  if (button) return `M${button[1]}`;
  const numpad = /^NUMPAD(\d)$/.exec(input);
  if (numpad) return `N${numpad[1]}`;
  return input;
}

/** Compact label for a slot corner, e.g. "S-M4", "C-1", "MwU". */
export function shortChord(chord: Chord): string {
  const { mods, input } = parseChord(chord);
  return `${mods.alt ? "A-" : ""}${mods.ctrl ? "C-" : ""}${mods.shift ? "S-" : ""}${shortInput(input)}`;
}

/** Readable label for lists and toasts, e.g. "Shift-Mouse 4". */
export function longChord(chord: Chord): string {
  const { mods, input } = parseChord(chord);
  const button = /^BUTTON(\d+)$/.exec(input);
  const name =
    input === "MOUSEWHEELUP"
      ? "Wheel Up"
      : input === "MOUSEWHEELDOWN"
        ? "Wheel Down"
        : button
          ? `Mouse ${button[1]}`
          : shortInput(input);
  return [mods.alt && "Alt", mods.ctrl && "Ctrl", mods.shift && "Shift", name].filter(Boolean).join("-");
}
