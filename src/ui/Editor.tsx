import { useEffect, useMemo, useRef, useState } from "react";
import { mainBarPages } from "../domain/bars";
import { bind, chordsOf, clearTarget, removeChord, resetTarget, setChordAt, type BindResult } from "../domain/bindings";
import { EXTRA_MOUSE_BUTTONS, NO_MODS, isBindable, longChord, makeChord, modsFromEvent, type Chord, type Modifiers } from "../domain/chords";
import { applyPreset, undoPreset } from "../domain/presets";
import { clearSlot, deleteMacro, moveItem, placeItem, upsertMacro, type Profile } from "../domain/profile";
import type { ClassData } from "../data/types";
import { AbilityPanel } from "./AbilityPanel";
import { ActionBars } from "./ActionBars";
import { BindingsList, PresetsPanel } from "./BindingsPanel";
import { KeyboardView } from "./KeyboardView";
import { makeCatalog, targetName } from "./model";
import { useHeldModifiers, useQuickBind } from "./useQuickBind";

type Props = {
  profile: Profile;
  data: ClassData;
  readOnly: boolean;
  onChange: (profile: Profile) => void;
  toast: (message: string) => void;
};

export function Editor({ profile, data, readOnly, onChange, toast }: Props) {
  const pages = mainBarPages(profile.classId);
  const [page, setPage] = useState(pages[0].id);
  const [quickBind, setQuickBind] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [keyHighlight, setKeyHighlight] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [toggledLayer, setToggledLayer] = useState<Modifiers>(NO_MODS);
  const [heldLayer, setHeldLayer] = useState<Modifiers>(NO_MODS);
  /** A Key 1 / Key 2 cell in the bindings list waiting for a key. */
  const [capture, setCapture] = useState<{ target: string; index: number } | null>(null);
  const flashTimer = useRef<number>();

  useEffect(() => {
    if (!pages.some((p) => p.id === page)) setPage(pages[0].id);
  }, [pages, page]);

  const catalog = useMemo(() => makeCatalog(data, profile), [data, profile]);
  const bindings = profile.bindings;
  const target = hovered ?? locked;

  const update = (next: Partial<Profile>) => onChange({ ...profile, ...next, updatedAt: Date.now() });

  /** Applies a binding change and says what happened, flashing a target that lost its key. */
  const applyBind = (to: string, chord: Chord, result: BindResult) => {
    const before = chordsOf(bindings, to);
    update({ bindings: result.bindings });
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
    update({ bindings: clearTarget(bindings, t) });
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
        update({ bindings: removeChord(bindings, capture.target, chord) });
        toast(`Unbound ${longChord(chord)} from ${targetName(capture.target)}.`);
      }
      setCapture(null);
    },
    onClear: () => setCapture(null),
    onPlainClick: () => setCapture(null),
  });

  useHeldModifiers(setHeldLayer);
  const held = heldLayer.alt || heldLayer.ctrl || heldLayer.shift;
  const layer = held ? heldLayer : toggledLayer;

  const highlight = keyHighlight ?? hovered;

  const barProps = {
    profile,
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
    <div className={`editor ${quickBind ? "quickbind-on" : ""}`}>
      <AbilityPanel
        data={data}
        profile={profile}
        readOnly={readOnly}
        onSaveMacro={(item) => update(upsertMacro(profile, item))}
        onDeleteMacro={(id) => update(deleteMacro(profile, id))}
        onRemoveSlot={(key) => update(clearSlot(profile, key))}
      />
      <div className="workspace">
        <ActionBars
          {...barProps}
          page={page}
          onPage={setPage}
          onDropItem={(key, d) => {
            if (!d || readOnly) return;
            if (d.kind === "slot") update(moveItem(profile, d.key, key));
            else update(placeItem(profile, key, { type: d.kind, id: d.id }));
          }}
          onRemove={(key) => update(clearSlot(profile, key))}
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
          profile={profile}
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
              update({ bindings: on ? applyPreset(bindings, preset) : undoPreset(bindings, preset) });
              toast(`${preset.name} ${on ? "applied" : "undone"}.`);
            }}
          />
          <BindingsList
            {...barProps}
            onReset={(t) => update({ bindings: resetTarget(bindings, t) })}
            capture={capture}
            onCapture={(target, index) =>
              setCapture(capture?.target === target && capture.index === index ? null : { target, index })
            }
            onRemoveChord={(t, chord) => update({ bindings: removeChord(bindings, t, chord) })}
          />
        </div>
      </div>
    </div>
  );
}
