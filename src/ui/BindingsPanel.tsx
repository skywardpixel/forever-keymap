import { useState } from "react";
import { BARS, SLOTS_PER_BAR, slotTarget } from "../domain/bars";
import { chordsOf, defaultChords, type Bindings } from "../domain/bindings";
import { longChord } from "../domain/chords";
import { GAME_BINDINGS, GAME_BINDING_GROUPS } from "../domain/gameBindings";
import { BINDING_PRESETS, isPresetActive, type BindingPreset } from "../domain/presets";
import { targetName } from "./model";

type Props = {
  bindings: Bindings;
  readOnly: boolean;
  quickBind: boolean;
  highlight: string | null;
  lockedTarget: string | null;
  flashTarget: string | null;
  onHoverTarget: (target: string | null) => void;
  onLockTarget: (target: string) => void;
  onReset: (target: string) => void;
  /** The Key 1 / Key 2 cell waiting for a key press, if any. */
  capture: { target: string; index: number } | null;
  onCapture: (target: string, index: number) => void;
  onRemoveChord: (target: string, chord: string) => void;
};

type PresetsProps = {
  bindings: Bindings;
  readOnly: boolean;
  onTogglePreset: (preset: BindingPreset, on: boolean) => void;
};

export function PresetsPanel({ bindings, readOnly, onTogglePreset }: PresetsProps) {
  return (
    <section className="presets panel">
      <div className="panel-head">
        <h2>Binding presets</h2>
        <span className="scope-tag" title="Keybindings are account-wide: every character uses the same keymap, as in WoW.">
          All characters
        </span>
      </div>
      {BINDING_PRESETS.map((p) => {
        const on = isPresetActive(bindings, p);
        return (
          <label key={p.id} className={`preset ${on ? "on" : ""}`}>
            <input type="checkbox" checked={on} disabled={readOnly} onChange={() => onTogglePreset(p, !on)} />
            <span>
              <strong>{p.name}</strong>
              <span className="muted">{p.description}</span>
            </span>
          </label>
        );
      })}
    </section>
  );
}

const ACTION_GROUPS = BARS.map((bar) => ({
  name: bar.name,
  targets: Array.from({ length: SLOTS_PER_BAR }, (_, i) => slotTarget(bar.id, i)),
}));

const GROUPS = [
  ...GAME_BINDING_GROUPS.map((g) => ({ name: g, targets: GAME_BINDINGS.filter((b) => b.group === g).map((b) => b.id) })),
  ...ACTION_GROUPS,
];

function KeyCell({
  chord,
  index,
  editable,
  capturing,
  onCapture,
  onRemove,
}: {
  chord?: string;
  index: number;
  editable: boolean;
  capturing: boolean;
  onCapture: (index: number) => void;
  onRemove: (chord: string) => void;
}) {
  if (!editable) return chord ? <kbd>{longChord(chord)}</kbd> : <span className="key-cell-empty">—</span>;
  return (
    <div className={`key-cell ${capturing ? "capturing" : ""}`} data-qb-ignore>
      <button className="key-cell-main" onClick={() => onCapture(index)} aria-label={chord ? `Change ${longChord(chord)}` : "Set key"}>
        {capturing ? <span className="key-cell-prompt">Press a key…</span> : chord ? <kbd>{longChord(chord)}</kbd> : <span className="key-cell-empty">Not bound</span>}
      </button>
      {chord && !capturing && (
        <button className="key-cell-remove" onClick={() => onRemove(chord)} aria-label={`Unbind ${longChord(chord)}`} title="Unbind this key">
          ×
        </button>
      )}
    </div>
  );
}

export function BindingsList(props: Props) {
  const { bindings, readOnly, quickBind } = props;
  const [open, setOpen] = useState<Record<string, boolean>>({ Movement: true });
  return (
    <section className="binding-list panel">
      <div className="panel-head">
        <h2>All bindings</h2>
        <span className="scope-tag" title="Keybindings are account-wide: every character uses the same keymap, as in WoW.">
          All characters
        </span>
        {!readOnly && (
          <span className="muted">
            {quickBind ? "Hover a row and press a key" : "Click Key 1 or Key 2, then press a key (Esc unbinds it)"}
          </span>
        )}
      </div>
      {GROUPS.map((g) => (
        <details key={g.name} open={!!open[g.name]} onToggle={(e) => setOpen({ ...open, [g.name]: (e.target as HTMLDetailsElement).open })}>
          <summary>{g.name}</summary>
          <table>
            <thead>
              <tr>
                <th className="b-name">Action</th>
                <th className="b-chord">Key 1</th>
                <th className="b-chord">Key 2</th>
                {!readOnly && <th className="b-actions" />}
              </tr>
            </thead>
            <tbody>
              {g.targets.map((t) => {
                const chords = chordsOf(bindings, t);
                const defaults = defaultChords(t);
                const isDefault = chords.length === defaults.length && chords.every((c, i) => c === defaults[i]);
                return (
                  <tr
                    key={t}
                    data-target={t}
                    className={[
                      props.highlight === t ? "highlight" : "",
                      props.lockedTarget === t && quickBind ? "locked" : "",
                      props.flashTarget === t ? "flash" : "",
                    ].join(" ")}
                    onMouseEnter={() => props.onHoverTarget(t)}
                    onMouseLeave={() => props.onHoverTarget(null)}
                    onClick={() => quickBind && props.onLockTarget(t)}
                    onContextMenu={(e) => {
                      if (readOnly || quickBind) return;
                      e.preventDefault();
                      props.onReset(t);
                    }}
                  >
                    <td className="b-name">
                      {targetName(t)}
                      {!isDefault && <span className="key-dot inline" title="Changed from default" />}
                    </td>
                    {[0, 1].map((index) => (
                      <td key={index} className="b-chord">
                        <KeyCell
                          chord={chords[index]}
                          // Key 2 can't be set before Key 1 exists; it fills the next free key.
                          index={Math.min(index, chords.length)}
                          editable={!readOnly && !quickBind && index <= chords.length}
                          capturing={props.capture?.target === t && props.capture.index === Math.min(index, chords.length)}
                          onCapture={(i) => props.onCapture(t, i)}
                          onRemove={(c) => props.onRemoveChord(t, c)}
                        />
                      </td>
                    ))}
                    {!readOnly && (
                      <td className="b-actions">
                        {!isDefault && (
                          <button className="small" onClick={() => props.onReset(t)} title="Reset to default">
                            ↺
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </details>
      ))}
    </section>
  );
}
