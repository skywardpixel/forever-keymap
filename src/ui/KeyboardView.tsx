import { useMemo } from "react";
import { pageOf, slotFromTarget, slotKey } from "../domain/bars";
import { chordIndex, isChanged, type Bindings } from "../domain/bindings";
import { isBindable, longChord, makeChord, type Modifiers } from "../domain/chords";
import type { Character } from "../domain/character";
import { iconUrl } from "../data/classes";
import { KEYBOARD, KEYBOARD_HEIGHT, KEYBOARD_WIDTH, MOUSE_INPUTS } from "./keyboardLayout";
import { resolveItem, targetName, targetShort, type Catalog } from "./model";
import { useTooltip } from "./Tooltip";

type Props = {
  character: Character;
  catalog: Catalog;
  bindings: Bindings;
  page: string;
  layer: Modifiers;
  /** True while the layer comes from held keys rather than the toggles. */
  layerHeld: boolean;
  onToggleMod: (mod: keyof Modifiers) => void;
  highlight: string | null;
  onHighlight: (target: string | null) => void;
};

const MOD_NAMES: Record<string, keyof Modifiers> = { SHIFT: "shift", CTRL: "ctrl", ALT: "alt" };

export function KeyboardView(props: Props) {
  const { bindings, layer, onToggleMod } = props;
  const index = useMemo(() => chordIndex(bindings), [bindings]);
  const layerName = [layer.alt && "Alt", layer.ctrl && "Ctrl", layer.shift && "Shift"].filter(Boolean).join("+") || "No modifier";

  return (
    <section className="keyboard panel">
      <div className="panel-head">
        <h2>Keyboard</h2>
        <span className="scope-tag" title="Keybindings are account-wide: every character uses the same keymap, as in WoW.">
          All characters
        </span>
        <div className="layer-toggles" role="group" aria-label="Modifier layer">
          {(["shift", "ctrl", "alt"] as const).map((m) => (
            <button key={m} className={layer[m] ? "chip on" : "chip"} onClick={() => onToggleMod(m)} aria-pressed={layer[m]}>
              {m === "shift" ? "Shift" : m === "ctrl" ? "Ctrl" : "Alt"}
            </button>
          ))}
          <span className="muted layer-name">
            {layerName}
            {props.layerHeld ? " (held)" : ""}
          </span>
        </div>
        <div className="legend">
          <span className="lg action">Action bar</span>
          <span className="lg game">Game</span>
          <span className="lg changed">Changed</span>
        </div>
      </div>
      <div className="keyboard-wrap">
        <div className="kb" style={{ aspectRatio: `${KEYBOARD_WIDTH} / ${KEYBOARD_HEIGHT}` }}>
          {KEYBOARD.map((k, i) => {
            const style = {
              left: `${(k.x / KEYBOARD_WIDTH) * 100}%`,
              top: `${(k.y / KEYBOARD_HEIGHT) * 100}%`,
              width: `${(k.w / KEYBOARD_WIDTH) * 100}%`,
              height: `${(k.h / KEYBOARD_HEIGHT) * 100}%`,
            };
            if (k.kind === "dead") {
              return (
                <div key={i} className="key dead" style={style}>
                  <span className="key-label">{k.label}</span>
                </div>
              );
            }
            if (k.kind === "mod") {
              const mod = MOD_NAMES[k.id];
              return (
                <button key={i} className={`key mod ${layer[mod] ? "on" : ""}`} style={style} onClick={() => onToggleMod(mod)}>
                  <span className="key-label">{k.label}</span>
                </button>
              );
            }
            return <BoundKey key={i} input={k.id} label={k.label} style={style} index={index} {...props} />;
          })}
        </div>
        <div className="mouse">
          <div className="mouse-title">Mouse</div>
          <div className="mouse-grid">
            {MOUSE_INPUTS.map((m) => (
              <BoundKey key={m.id} input={m.id} label={m.label} index={index} {...props} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BoundKey({
  input,
  label,
  style,
  index,
  character,
  catalog,
  page,
  layer,
  highlight,
  onHighlight,
}: Props & { input: string; label: string; style?: React.CSSProperties; index: Map<string, string> }) {
  const tip = useTooltip();
  const chord = makeChord(layer, input);
  const bindable = isBindable(chord);
  const target = index.get(chord);
  const slot = target ? slotFromTarget(target) : null;
  const item = slot ? resolveItem(catalog, character.slots[slotKey(slot.bar, pageOf(character.classId, character.barPaging, slot.bar, page), slot.index)]) : undefined;
  const changed = bindable && isChanged(index, chord);
  const kind = !target ? "free" : slot ? "action" : "game";

  return (
    <div
      className={`key ${kind} ${!bindable ? "reserved" : ""} ${highlight && highlight === target ? "highlight" : ""}`}
      style={style}
      onMouseEnter={(e) => {
        onHighlight(target ?? null);
        tip.show(
          e,
          <>
            <div className="tt-name">{longChord(chord)}</div>
            <div className="tt-line">
              {!bindable ? "Reserved for clicking" : target ? `${targetName(target)}${item ? `: ${item.name}` : ""}` : "Unbound"}
            </div>
            {changed && <div className="tt-meta">Changed from the WoW default</div>}
          </>,
        );
      }}
      onMouseLeave={() => {
        onHighlight(null);
        tip.hide();
      }}
    >
      <span className="key-label">{label}</span>
      {item && <img className="key-icon" src={iconUrl(item.icon)} alt="" />}
      {target && <span className="key-target">{targetShort(target)}</span>}
      {changed && <span className="key-dot" aria-label="changed" />}
    </div>
  );
}
