import { useEffect, useMemo, useRef, useState } from "react";
import { activePages } from "../domain/bars";
import { bind, chordsOf, clearTarget, removeChord, resetTarget, setChordAt, type BindResult, type Bindings } from "../domain/bindings";
import { EXTRA_MOUSE_BUTTONS, NO_MODS, isBindable, longChord, makeChord, modsFromEvent, type Chord, type Modifiers } from "../domain/chords";
import { applyPreset, undoPreset } from "../domain/presets";
import {
  clearSlot,
  deleteMacro,
  placeAndPickUp,
  setAddonPage,
  setBarPaging,
  upsertMacro,
  type Character,
  type SlotItem,
} from "../domain/character";
import type { ClassData } from "../data/types";
import { AbilityPanel } from "./AbilityPanel";
import { ActionBars } from "./ActionBars";
import { BindingsList, PresetsPanel } from "./BindingsPanel";
import { KeyboardView } from "./KeyboardView";
import { makeCatalog, resolveItem, targetName, type Catalog } from "./model";
import { iconUrl } from "../data/classes";
import { useHeldModifiers, useQuickBind } from "./useQuickBind";

type Props = {
  character: Character;
  /** The account-wide keymap, shared by every character. */
  keymap: Bindings;
  data: ClassData;
  readOnly: boolean;
  onChange: (character: Character) => void;
  onKeymapChange: (keymap: Bindings) => void;
  toast: (message: string) => void;
};

export function Editor({ character, keymap, data, readOnly, onChange, onKeymapChange, toast }: Props) {
  const pages = activePages(character.classId, character.addonPages);
  const [page, setPage] = useState(pages[0].id);
  const [quickBind, setQuickBind] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [keyHighlight, setKeyHighlight] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [toggledLayer, setToggledLayer] = useState<Modifiers>(NO_MODS);
  const [heldLayer, setHeldLayer] = useState<Modifiers>(NO_MODS);
  /** An ability picked up off a slot by overwriting it, following the mouse until placed or dropped. */
  const [cursorItem, setCursorItem] = useState<{ item: SlotItem; x: number; y: number } | null>(null);
  /** A Key 1 / Key 2 cell in the bindings list waiting for a key. */
  const [capture, setCapture] = useState<{ target: string; index: number } | null>(null);
  const flashTimer = useRef<number>();

  useEffect(() => {
    if (!pages.some((p) => p.id === page)) setPage(pages[0].id);
  }, [pages, page]);

  const catalog = useMemo(() => makeCatalog(data, character), [data, character]);
  const bindings = keymap;
  const setKeymap = onKeymapChange;
  const target = hovered ?? locked;

  const update = (next: Partial<Character>) => onChange({ ...character, ...next, updatedAt: Date.now() });

  /** Applies a binding change and says what happened, flashing a target that lost its key. */
  const applyBind = (to: string, chord: Chord, result: BindResult) => {
    const before = chordsOf(bindings, to);
    setKeymap(result.bindings);
    if (result.movedFrom && result.movedFrom !== to) {
      setFlash(result.movedFrom);
      window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlash(null), 1500);
      toast(`${longChord(chord)} moved from ${targetName(result.movedFrom)} to ${targetName(to)}.`);
    } else if (!before.includes(chord)) {
      toast(`${longChord(chord)} → ${targetName(to)}`);
    }
  };

  const clearAll = (t: string) => {
    setKeymap(clearTarget(bindings, t));
    toast(`Cleared ${targetName(t)}.`);
  };

  const bindChord = (chord: Chord) => {
    if (!target) {
      toast("Hover a slot or binding first (or click one to lock it).");
      return;
    }
    applyBind(target, chord, bind(bindings, target, chord));
  };

  useQuickBind(quickBind && !readOnly, {
    onChord: bindChord,
    onClear: () => target && clearAll(target),
    // Esc clears what you're hovering; with nothing hovered it leaves Quick Bind.
    onEscape: () => (hovered ? clearAll(hovered) : setQuickBind(false)),
  });

  useQuickBind(!!capture && !quickBind && !readOnly, {
    onChord: (chord) => {
      if (!capture) return;
      applyBind(capture.target, chord, setChordAt(bindings, capture.target, capture.index, chord));
      setCapture(null);
    },
    onEscape: () => {
      if (!capture) return;
      const chord = chordsOf(bindings, capture.target)[capture.index];
      if (chord) {
        setKeymap(removeChord(bindings, capture.target, chord));
        toast(`Unbound ${longChord(chord)} from ${targetName(capture.target)}.`);
      }
      setCapture(null);
    },
    onClear: () => setCapture(null),
    onPlainClick: () => setCapture(null),
  });

  // Like the game: clicking anywhere but a slot, or pressing Esc, drops what you're holding.
  useEffect(() => {
    if (!cursorItem) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target instanceof Element && e.target.closest(".slot"))) setCursorItem(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCursorItem(null);
    };
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [cursorItem]);

  useEffect(() => {
    if (quickBind) setCursorItem(null);
  }, [quickBind]);

  /** Places an item and puts whatever it replaced on the cursor. */
  const place = (key: string, item: SlotItem, at: { x: number; y: number }, from?: string) => {
    const { character: next, pickedUp } = placeAndPickUp(character, key, item, from);
    update(next);
    setCursorItem(pickedUp ? { item: pickedUp, ...at } : null);
  };

  useHeldModifiers(setHeldLayer);
  const held = heldLayer.alt || heldLayer.ctrl || heldLayer.shift;
  const layer = held ? heldLayer : toggledLayer;

  const highlight = keyHighlight ?? hovered;

  const barProps = {
    character,
    catalog,
    bindings,
    readOnly,
    quickBind,
    highlight,
    lockedTarget: locked,
    flashTarget: flash,
    onHoverTarget: setHovered,
    onLockTarget: setLocked,
  };

  return (
    <div className={`editor ${quickBind ? "quickbind-on" : ""} ${cursorItem ? "holding" : ""}`}>
      {cursorItem && <HeldCursor catalog={catalog} item={cursorItem.item} start={cursorItem} />}
      <AbilityPanel
        data={data}
        character={character}
        readOnly={readOnly}
        onSaveMacro={(item) => update(upsertMacro(character, item))}
        onDeleteMacro={(id) => update(deleteMacro(character, id))}
        onRemoveSlot={(key) => update(clearSlot(character, key))}
      />
      <div className="workspace">
        <ActionBars
          {...barProps}
          page={page}
          onPage={setPage}
          onDropItem={(key, d, at) => {
            if (!d || readOnly) return;
            if (d.kind === "slot") {
              const item = character.slots[d.key];
              if (item) place(key, item, at, d.key);
            } else place(key, { type: d.kind, id: d.id }, at);
          }}
          holding={!!cursorItem}
          onPlaceHeld={(key) => cursorItem && place(key, cursorItem.item, cursorItem)}
          onRemove={(key) => update(clearSlot(character, key))}
          onTogglePaging={(bar, on) => update(setBarPaging(character, bar, on))}
          onToggleAddonPage={(pageId, on) => update(setAddonPage(character, pageId, on))}
          actions={
            !readOnly && (
              <button
                data-qb-ignore
                className={`qb-toggle ${quickBind ? "on" : ""}`}
                onClick={() => setQuickBind(!quickBind)}
                aria-pressed={quickBind}
              >
                <span className="qb-dot" />
                Quick Bind
              </button>
            )
          }
          notice={
            quickBind &&
            !readOnly && (
              <div className="mouse-picker" data-qb-ignore>
                <span className="muted">
                  {locked ? `Locked to ${targetName(locked)}. Extra mouse buttons:` : "For mouse buttons 6–10, click a slot to lock it, then pick:"}
                </span>
                {EXTRA_MOUSE_BUTTONS.map((b) => (
                  <button
                    key={b}
                    className="small"
                    disabled={!locked}
                    // Hold modifiers while clicking to bind e.g. Shift-M6.
                    onClick={(e) => {
                      const chord = makeChord(modsFromEvent(e), b);
                      if (locked && isBindable(chord)) bindChord(chord);
                    }}
                  >
                    M{b.slice(6)}
                  </button>
                ))}
              </div>
            )
          }
        />
        <KeyboardView
          character={character}
          catalog={catalog}
          bindings={bindings}
          page={page}
          layer={layer}
          layerHeld={held}
          onToggleMod={(m) => setToggledLayer({ ...toggledLayer, [m]: !toggledLayer[m] })}
          highlight={highlight}
          onHighlight={setKeyHighlight}
        />
        <div className="lower">
          <PresetsPanel
            bindings={bindings}
            readOnly={readOnly}
            onTogglePreset={(preset, on) => {
              setKeymap(on ? applyPreset(bindings, preset) : undoPreset(bindings, preset));
              toast(`${preset.name} ${on ? "applied" : "undone"}.`);
            }}
          />
          <BindingsList
            {...barProps}
            onReset={(t) => setKeymap(resetTarget(bindings, t))}
            capture={capture}
            onCapture={(target, index) =>
              setCapture(capture?.target === target && capture.index === index ? null : { target, index })
            }
            onRemoveChord={(t, chord) => setKeymap(removeChord(bindings, t, chord))}
          />
        </div>
      </div>
    </div>
  );
}

/** The picked-up ability's icon, following the mouse like the game's cursor. */
function HeldCursor({ catalog, item, start }: { catalog: Catalog; item: SlotItem; start: { x: number; y: number } }) {
  const [pos, setPos] = useState(start);
  useEffect(() => {
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  const resolved = resolveItem(catalog, item);
  if (!resolved) return null;
  return (
    <div className="held-cursor" style={{ left: pos.x, top: pos.y }} aria-live="polite">
      <img src={iconUrl(resolved.icon)} alt="" />
      <span className="sr-only">Holding {resolved.name}. Click a slot to place it, or click elsewhere to drop it.</span>
    </div>
  );
}
