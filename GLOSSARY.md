# Forever Keymap

A planner for laying out WoW Forever action bars and keybindings before launch, so players arrive with their setup already decided.

## Language

### Planning

**Character**:
A named plan for one class and race: its slot contents and macros. Each character has its own action bars but uses the account's keymap.
_Avoid_: Profile, loadout, setup

**Keymap**:
The account-wide set of bindings, shared by every character, as in WoW.
_Avoid_: Profile, keybind set, binding profile

**Class**:
The WoW class a character is; it determines which abilities are available.

**Race**:
The playable race a character is, restricted to races that can play its class; it determines which racials are available. Skyborne counts as two races, one per faction.

### Bars and slots

**Action Bar**:
One of the five bars from the default UI, named Bar 1 to Bar 5, each with 12 action slots. Bar 1 is the main bar; Bars 4 and 5 sit on the right edge of the screen.
_Avoid_: Hotbar, row

**Action Slot**:
A single button position on an action bar; the thing a key is bound to.
_Avoid_: Button, cell, hotkey

**Bar Page**:
An alternate set of slot contents for a bar that swaps in for a stance, form, or stealth; it shares that bar's bindings. The default UI pages only Bar 1 (Warrior stances, Druid forms, Rogue Stealth); paging other bars, or for Shadowform or Moonkin Form, needs a bar addon.

**Paged Bar**:
A bar that swaps to a Bar Page when the character changes stance or form; all paged bars swap together.
_Avoid_: Stance bar, form bar

**Slot Item**:
Whatever occupies an action slot: an ability or a macro.
_Avoid_: Action, spell (when meaning slot contents)

**Ability**:
A non-passive class spell, talent-granted spell, or racial that can be placed in an action slot. It has no rank: one ability stands for all of its ranks.
_Avoid_: Spell, skill

**Racial**:
An ability granted by the character's race, either race-wide or specific to the race and class combination (e.g. Priest's Starshards).

**Macro**:
A player-made slot item with a name and an icon, standing in for an in-game macro (and through it, consumables, mounts, or anything not in the ability data). Its script isn't modelled.
_Avoid_: Custom item

### Keys and bindings

**Input**:
A single physical trigger: a keyboard key, a mouse button (M1–M10), or a wheel direction (MwU/MwD).
_Avoid_: Key (when mouse inputs are included), button

**Chord**:
An input together with zero or more modifiers (Shift, Ctrl, Alt), e.g. `Shift-M4`.
_Avoid_: Keybind, hotkey, combo

**Binding**:
The assignment of a chord to an action slot or game binding; each target holds at most a primary and a secondary chord, and a chord belongs to at most one target.
_Avoid_: Keybind, hotkey

**Game Binding**:
A game command that isn't an action slot (movement, targeting, opening panels, chat, bar page switching, stance bar and pet bar buttons).
_Avoid_: System bind, UI bind

**Default Binding**:
The chord WoW assigns to an action slot or game binding out of the box; a fresh keymap starts with all of them.

**Binding Preset**:
A named, one-click set of binding changes for a common customization, such as moving strafe to A/D.
_Avoid_: Template, tweak

**Quick Bind**:
The mode where hovering a target and pressing a chord creates a binding.

**Modifier Layer**:
The keyboard view filtered to chords using one specific combination of modifiers.
_Avoid_: Shift layer, modifier mode
