// US ANSI full-size keyboard, positioned in key units (1u = one letter key).

export type KeyKind = "input" | "mod" | "dead";

export type KeyCap = {
  /** WoW input name for "input" keys; modifier name for "mod" keys. */
  id: string;
  label: string;
  kind: KeyKind;
  x: number;
  y: number;
  w: number;
  h: number;
};

const caps: KeyCap[] = [];

function row(y: number, x: number, keys: (string | [string, number] | [string, number, string])[], kind: KeyKind = "input") {
  for (const k of keys) {
    const [id, w = 1, label] = typeof k === "string" ? [k, 1, undefined] : k;
    caps.push({ id, label: label ?? id, kind, x, y, w, h: 1 });
    x += w;
  }
}

function key(id: string, x: number, y: number, opts: Partial<KeyCap> = {}) {
  caps.push({ id, label: id, kind: "input", x, y, w: 1, h: 1, ...opts });
}

// Function row
key("ESCAPE", 0, 0, { label: "Esc", kind: "dead" });
row(0, 2, ["F1", "F2", "F3", "F4"]);
row(0, 6.5, ["F5", "F6", "F7", "F8"]);
row(0, 11, ["F9", "F10", "F11", "F12"]);
row(0, 15.25, [["PRINTSCREEN", 1, "PrtSc"], ["SCROLLLOCK", 1, "ScrLk"], ["PAUSE", 1, "Pause"]]);

// Number row
row(1.25, 0, ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", ["BACKSPACE", 2, "Backspace"]]);
row(1.25, 15.25, [["INSERT", 1, "Ins"], ["HOME", 1, "Home"], ["PAGEUP", 1, "PgUp"]]);
row(1.25, 18.5, [["NUMLOCK", 1, "Num"], ["NUMPADDIVIDE", 1, "/"], ["NUMPADMULTIPLY", 1, "*"], ["NUMPADMINUS", 1, "-"]]);

// QWERTY row
row(2.25, 0, [["TAB", 1.5, "Tab"], "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", ["\\", 1.5]]);
row(2.25, 15.25, [["DELETE", 1, "Del"], ["END", 1, "End"], ["PAGEDOWN", 1, "PgDn"]]);
row(2.25, 18.5, [["NUMPAD7", 1, "7"], ["NUMPAD8", 1, "8"], ["NUMPAD9", 1, "9"]]);
key("NUMPADPLUS", 21.5, 2.25, { label: "+", h: 2 });

// Home row
row(3.25, 0, [["CAPSLOCK", 1.75, "Caps"], "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", ["ENTER", 2.25, "Enter"]]);
row(3.25, 18.5, [["NUMPAD4", 1, "4"], ["NUMPAD5", 1, "5"], ["NUMPAD6", 1, "6"]]);

// Bottom letter row
row(4.25, 0, [["SHIFT", 2.25, "Shift"]], "mod");
row(4.25, 2.25, ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"]);
row(4.25, 12.25, [["SHIFT", 2.75, "Shift"]], "mod");
key("UP", 16.25, 4.25, { label: "↑" });
row(4.25, 18.5, [["NUMPAD1", 1, "1"], ["NUMPAD2", 1, "2"], ["NUMPAD3", 1, "3"]]);
key("ENTER", 21.5, 4.25, { label: "Enter", h: 2 });

// Space row
row(5.25, 0, [["CTRL", 1.25, "Ctrl"]], "mod");
row(5.25, 1.25, [["WIN", 1.25, "Win"]], "dead");
row(5.25, 2.5, [["ALT", 1.25, "Alt"]], "mod");
row(5.25, 3.75, [["SPACE", 6.25, "Space"]]);
row(5.25, 10, [["ALT", 1.25, "Alt"]], "mod");
row(5.25, 11.25, [["WIN", 1.25, "Win"], ["MENU", 1.25, "Menu"]], "dead");
row(5.25, 13.75, [["CTRL", 1.25, "Ctrl"]], "mod");
row(5.25, 15.25, [["LEFT", 1, "←"], ["DOWN", 1, "↓"], ["RIGHT", 1, "→"]]);
row(5.25, 18.5, [["NUMPAD0", 2, "0"], ["NUMPADDECIMAL", 1, "."]]);

export const KEYBOARD: KeyCap[] = caps;
export const KEYBOARD_WIDTH = 22.5;
export const KEYBOARD_HEIGHT = 6.25;

export const MOUSE_INPUTS: { id: string; label: string }[] = [
  { id: "BUTTON1", label: "M1" },
  { id: "BUTTON2", label: "M2" },
  { id: "BUTTON3", label: "M3" },
  { id: "MOUSEWHEELUP", label: "MwU" },
  { id: "MOUSEWHEELDOWN", label: "MwD" },
  { id: "BUTTON4", label: "M4" },
  { id: "BUTTON5", label: "M5" },
  { id: "BUTTON6", label: "M6" },
  { id: "BUTTON7", label: "M7" },
  { id: "BUTTON8", label: "M8" },
  { id: "BUTTON9", label: "M9" },
  { id: "BUTTON10", label: "M10" },
];
