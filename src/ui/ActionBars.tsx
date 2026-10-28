import { useEffect, useRef, useState, type ReactNode } from "react";
import { BARS, SLOTS_PER_BAR, mainBarPages, slotKey, slotTarget, type BarId } from "../domain/bars";
import { chordsOf, type Bindings } from "../domain/bindings";
import { shortChord, longChord } from "../domain/chords";
import type { Profile } from "../domain/profile";
import { iconUrl } from "../data/classes";
import { resolveItem, targetName, type Catalog } from "./model";
import { AbilityTooltip } from "./AbilityPanel";
import { useTooltip } from "./Tooltip";
import { markDropHandled, readDrag, wasDropHandled, writeDrag } from "./drag";

type Props = {
  profile: Profile;
  catalog: Catalog;
  bindings: Bindings;
  page: string;
  onPage: (page: string) => void;
  readOnly: boolean;
  quickBind: boolean;
  highlight: string | null;
  lockedTarget: string | null;
  flashTarget: string | null;
  onHoverTarget: (target: string | null) => void;
  onLockTarget: (target: string) => void;
  onDropItem: (key: string, data: ReturnType<typeof readDrag>) => void;
  onRemove: (key: string) => void;
  /** Controls shown at the end of the panel header (Quick Bind). */
  actions?: ReactNode;
  /** A row under the header (the extra mouse button picker). */
  notice?: ReactNode;
};

export function ActionBars(props: Props) {
  const { profile, catalog, page, onPage } = props;
  const pages = mainBarPages(profile.classId);
  return (
    <section className="bars panel">
      <div className="panel-head">
        <h2>Action bars</h2>
        {pages.length > 1 && (
          <div className="page-tabs" role="tablist" aria-label="Main bar page">
            {pages.map((p) => {
              const icon = p.ability ? catalog.abilities.get(p.ability)?.icon : undefined;
              return (
                <button key={p.id} role="tab" aria-selected={page === p.id} className={page === p.id ? "on" : ""} onClick={() => onPage(p.id)}>
                  {icon && <img src={iconUrl(icon)} alt="" />}
                  {p.name}
                </button>
              );
            })}
          </div>
        )}
        {props.actions && <div className="panel-actions">{props.actions}</div>}
      </div>
      {props.notice}
      {BARS.map((bar, i) => (
        <BarRow key={bar.id} bar={bar.id} name={bar.name} side={!!bar.side && !BARS[i - 1]?.side} pageId={bar.id === "MAIN" ? page : "default"} {...props} />
      ))}
      {!props.readOnly && (
        <p className="hint">
          {props.quickBind
            ? "Hover a slot and press a key, mouse button or wheel. A slot holds two keys; a third replaces the second. Esc or right-click clears the hovered slot. Esc with nothing hovered exits."
            : "Drag abilities onto slots. Drag a slot off the bars to remove it. Bindings stay with the slot."}
        </p>
      )}
    </section>
  );
}

function BarRow(props: Props & { bar: BarId; name: string; pageId: string; side: boolean }) {
  const { bar, name, pageId, side } = props;
  return (
    <div className={side ? "bar side-start" : "bar"}>
      <div className="bar-name">{name}</div>
      <div className="bar-slots">
        {Array.from({ length: SLOTS_PER_BAR }, (_, i) => (
          <Slot key={i} {...props} slot={slotKey(bar, pageId, i)} target={slotTarget(bar, i)} />
        ))}
      </div>
    </div>
  );
}

function Slot(props: Props & { slot: string; target: string }) {
  const { slot: key, target, profile, catalog, bindings, readOnly, quickBind } = props;
  const tip = useTooltip();
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const item = resolveItem(catalog, profile.slots[key]);
  const chords = chordsOf(bindings, target);

  // Re-show while hovered so the tooltip tracks bindings made in Quick Bind.
  useEffect(() => {
    if (hover && ref.current) {
      tip.show(ref.current, <SlotTooltip name={item?.name} ability={item?.ability} target={target} chords={chords} />);
    }
  }, [hover, item?.name, chords.join(" ")]);

  const classes = [
    "slot",
    item ? "filled" : "",
    props.highlight === target ? "highlight" : "",
    props.lockedTarget === target && quickBind ? "locked" : "",
    props.flashTarget === target ? "flash" : "",
    quickBind ? "qb" : "",
  ].join(" ");

  return (
    <div
      ref={ref}
      className={classes}
      data-target={target}
      draggable={!readOnly && !!item && !quickBind}
      onDragStart={(e) => {
        tip.hide();
        writeDrag(e, { kind: "slot", key }, "move");
      }}
      onDragEnd={() => {
        if (!wasDropHandled()) props.onRemove(key);
      }}
      onDragOver={(e) => {
        if (readOnly) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = e.dataTransfer.effectAllowed === "move" ? "move" : "copy";
      }}
      onDrop={(e) => {
        e.preventDefault();
        markDropHandled();
        props.onDropItem(key, readDrag(e));
      }}
      onClick={() => quickBind && props.onLockTarget(target)}
      onMouseEnter={() => {
        props.onHoverTarget(target);
        setHover(true);
      }}
      onMouseLeave={() => {
        props.onHoverTarget(null);
        setHover(false);
        tip.hide();
      }}
    >
      {item && <img src={iconUrl(item.icon)} alt={item.name} draggable={false} />}
      {chords[0] && <span className="slot-key">{shortChord(chords[0])}</span>}
      {chords[1] && <span className="slot-key2">{shortChord(chords[1])}</span>}
      {item?.macro && <span className="slot-name">{item.name}</span>}
    </div>
  );
}

function SlotTooltip({
  name,
  ability,
  target,
  chords,
}: {
  name?: string;
  ability?: Parameters<typeof AbilityTooltip>[0]["ability"];
  target: string;
  chords: string[];
}) {
  return (
    <>
      {ability ? <AbilityTooltip ability={ability} /> : <div className="tt-name">{name ?? "Empty slot"}</div>}
      <div className="tt-binding">
        {targetName(target)}: {chords.length ? chords.map(longChord).join(", ") : "unbound"}
      </div>
    </>
  );
}
