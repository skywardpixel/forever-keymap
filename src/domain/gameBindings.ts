import type { Chord } from "./chords";

export type GameBinding = {
  /** WoW binding name. */
  id: string;
  label: string;
  /** Few-character label for keyboard keys. */
  short: string;
  group: string;
  defaults: Chord[];
};

const gb = (group: string, id: string, label: string, short: string, ...defaults: Chord[]): GameBinding => ({
  id,
  label,
  short,
  group,
  defaults,
});

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

export const GAME_BINDINGS: GameBinding[] = [
  gb("Movement", "MOVEFORWARD", "Move Forward", "Fwd", "W", "UP"),
  gb("Movement", "MOVEBACKWARD", "Move Backward", "Back", "S", "DOWN"),
  gb("Movement", "TURNLEFT", "Turn Left", "TurnL", "A", "LEFT"),
  gb("Movement", "TURNRIGHT", "Turn Right", "TurnR", "D", "RIGHT"),
  gb("Movement", "STRAFELEFT", "Strafe Left", "StrfL", "Q"),
  gb("Movement", "STRAFERIGHT", "Strafe Right", "StrfR", "E"),
  gb("Movement", "JUMP", "Jump", "Jump", "SPACE"),
  gb("Movement", "SITORSTAND", "Sit / Move Down", "Sit", "X"),
  gb("Movement", "TOGGLEAUTORUN", "Toggle Autorun", "Auto", "NUMLOCK"),
  gb("Movement", "TOGGLERUN", "Toggle Run/Walk", "Walk", "NUMPADDIVIDE"),

  gb("Targeting", "TARGETNEARESTENEMY", "Target Nearest Enemy", "TgtE", "TAB"),
  gb("Targeting", "TARGETPREVIOUSENEMY", "Target Previous Enemy", "PrvE", "SHIFT-TAB"),
  gb("Targeting", "TARGETNEARESTFRIEND", "Target Nearest Friend", "TgtF", "CTRL-TAB"),
  gb("Targeting", "TARGETSELF", "Target Self", "Self", "F1"),
  ...range(4).map((i) => gb("Targeting", `TARGETPARTYMEMBER${i}`, `Target Party Member ${i}`, `P${i}`, `F${i + 1}`)),
  gb("Targeting", "ASSISTTARGET", "Assist Target", "Asst", "F"),

  gb("Interface", "OPENALLBAGS", "Open All Bags", "Bags", "B"),
  gb("Interface", "TOGGLECHARACTER0", "Character", "Char", "C"),
  gb("Interface", "TOGGLESPELLBOOK", "Spellbook", "Book", "P"),
  gb("Interface", "TOGGLEPETBOOK", "Pet Spellbook", "PetBk", "SHIFT-P"),
  gb("Interface", "TOGGLETALENTS", "Talents", "Tal", "N"),
  gb("Interface", "TOGGLEWORLDMAP", "World Map", "Map", "M"),
  gb("Interface", "TOGGLEQUESTLOG", "Quest Log", "Quest", "L"),
  gb("Interface", "TOGGLESOCIAL", "Social", "Soc", "O"),
  gb("Interface", "TOGGLEUI", "Toggle UI", "UI", "ALT-Z"),
  gb("Interface", "SCREENSHOT", "Screenshot", "Scrn", "PRINTSCREEN"),
  gb("Interface", "NAMEPLATES", "Enemy Nameplates", "Plate", "V"),
  gb("Interface", "TOGGLESHEATH", "Sheathe Weapon", "Sheat", "Z"),

  gb("Chat", "OPENCHAT", "Open Chat", "Chat", "ENTER"),
  gb("Chat", "OPENCHATSLASH", "Chat Command", "/cmd", "/"),
  gb("Chat", "REPLY", "Reply Whisper", "Reply", "R"),

  gb("Camera", "CAMERAZOOMIN", "Zoom In", "Zm+", "MOUSEWHEELUP"),
  gb("Camera", "CAMERAZOOMOUT", "Zoom Out", "Zm-", "MOUSEWHEELDOWN"),

  ...range(6).map((i) => gb("Action Pages", `ACTIONPAGE${i}`, `Action Page ${i}`, `Pg${i}`, `SHIFT-${i}`)),
  gb("Action Pages", "PREVIOUSACTIONPAGE", "Previous Action Page", "Pg-", "SHIFT-UP"),
  gb("Action Pages", "NEXTACTIONPAGE", "Next Action Page", "Pg+", "SHIFT-DOWN"),

  ...range(10).map((i) => gb("Stance Bar", `SHAPESHIFTBUTTON${i}`, `Stance Bar ${i}`, `St${i}`, `CTRL-F${i}`)),
  ...range(10).map((i) => gb("Pet Bar", `BONUSACTIONBUTTON${i}`, `Pet Bar ${i}`, `Pet${i}`, `CTRL-${i % 10}`)),
];

export const GAME_BINDING_GROUPS = [...new Set(GAME_BINDINGS.map((g) => g.group))];

export const GAME_BINDINGS_BY_ID = new Map(GAME_BINDINGS.map((g) => [g.id, g]));
