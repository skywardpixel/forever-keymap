import { useMemo, useState } from "react";
import type { Ability, AbilityGroup, ClassData } from "../data/types";
import type { Macro, Profile } from "../domain/profile";
import { newId } from "../domain/profile";
import { iconUrl } from "../data/classes";
import { mainBarPages } from "../domain/bars";
import meta from "../data/meta.json";
import { useTooltip } from "./Tooltip";
import { readDrag, writeDrag } from "./drag";

type Filter = "all" | AbilityGroup | "macro";

type Sort = "level" | "name";

const SORT_KEY = "forever-keymap:ability-sort";

function loadSort(): Sort {
  try {
    return localStorage.getItem(SORT_KEY) === "name" ? "name" : "level";
  } catch {
    return "level";
  }
}

const byName = (a: Ability, b: Ability) => a.name.localeCompare(b.name);

// Abilities without a learn level (racials, General) go after the levelled ones.
const byLevel = (a: Ability, b: Ability) => (a.level ?? Infinity) - (b.level ?? Infinity) || byName(a, b);

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "baseline", label: "Baseline" },
  { id: "talent", label: "Talents" },
  { id: "racial", label: "Racial" },
  { id: "general", label: "General" },
  { id: "macro", label: "Macros" },
];

type Props = {
  data: ClassData;
  profile: Profile;
  readOnly: boolean;
  onSaveMacro: (item: Macro) => void;
  onDeleteMacro: (id: string) => void;
  onRemoveSlot: (key: string) => void;
};

export function AbilityPanel({ data, profile, readOnly, onSaveMacro, onDeleteMacro, onRemoveSlot }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSortState] = useState<Sort>(loadSort);
  /** A stance/form name (a Bar Page's ability) the abilities must require, or null for any. */
  const [form, setForm] = useState<string | null>(null);
  const formPages = mainBarPages(data.id).filter((p) => p.ability);
  const setSort = (next: Sort) => {
    setSortState(next);
    try {
      localStorage.setItem(SORT_KEY, next);
    } catch {
      // Not remembered; still applies for this visit.
    }
  };
  const [editing, setEditing] = useState<Macro | null>(null);

  const placed = useMemo(() => new Set(Object.values(profile.slots).map((s) => `${s.type}:${s.id}`)), [profile.slots]);

  const race = data.races.find((r) => r.id === profile.raceId);
  const q = query.trim().toLowerCase();
  const matches = (name: string, extra = "") => !q || name.toLowerCase().includes(q) || extra.toLowerCase().includes(q);

  const sections = useMemo(() => {
    const visible = data.abilities.filter(
      (a) =>
        (a.group !== "racial" || race?.racials.includes(a.id)) &&
        (filter === "all" || filter === a.group) &&
        (!form || !!a.requires?.includes(form)) &&
        matches(a.name, a.tree),
    );
    const out: { title: string; abilities: Ability[] }[] = [];
    // Talent abilities sit with their spec's trainer spells, marked with a pill.
    const isSpec = (a: Ability) => a.group === "baseline" || a.group === "talent";
    for (const tab of data.tabs) {
      out.push({ title: tab, abilities: visible.filter((a) => isSpec(a) && a.tree === tab) });
    }
    for (const tree of data.trees.filter((t) => !data.tabs.includes(t))) {
      out.push({ title: tree, abilities: visible.filter((a) => a.group === "talent" && a.tree === tree) });
    }
    out.push({ title: `${race?.name ?? ""} racials`, abilities: visible.filter((a) => a.group === "racial") });
    out.push({ title: "General", abilities: visible.filter((a) => a.group === "general") });
    for (const s of out) s.abilities.sort(sort === "level" ? byLevel : byName);
    return out.filter((s) => s.abilities.length);
  }, [data, race, filter, q, sort, form]);

  const macroList = profile.macros.filter((c) => !form && (filter === "all" || filter === "macro") && matches(c.name));

  return (
    <aside
      className="abilities panel"
      onDragOver={(e) => {
        if (e.dataTransfer.effectAllowed === "move") e.preventDefault();
      }}
      onDrop={(e) => {
        const d = readDrag(e);
        if (d?.kind === "slot") onRemoveSlot(d.key);
      }}
    >
      <div className="panel-head">
        <h2>Abilities</h2>
        <div className="segmented" role="group" aria-label="Sort abilities">
          <button className={sort === "level" ? "on" : ""} aria-pressed={sort === "level"} onClick={() => setSort("level")}>
            Level
          </button>
          <button className={sort === "name" ? "on" : ""} aria-pressed={sort === "name"} onClick={() => setSort("name")}>
            A–Z
          </button>
        </div>
      </div>
      <input
        className="search"
        type="search"
        placeholder="Search abilities…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search abilities"
      />
      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f.id} className={filter === f.id ? "chip on" : "chip"} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      {formPages.length > 0 && (
        <div className="chips form-chips" role="group" aria-label="Filter by required form">
          <span className="chips-label">Requires</span>
          <button className={form === null ? "chip on" : "chip"} onClick={() => setForm(null)}>
            Any
          </button>
          {formPages.map((p) => {
            const icon = data.abilities.find((a) => a.name === p.ability)?.icon;
            return (
              <button
                key={p.id}
                className={form === p.ability ? "chip on" : "chip"}
                onClick={() => setForm(form === p.ability ? null : p.ability!)}
                title={`Abilities that require ${p.ability}`}
              >
                {icon && <img src={iconUrl(icon)} alt="" />}
                {p.ability}
              </button>
            );
          })}
        </div>
      )}
      <div className="ability-list">
        {sections.map((s) => (
          <div key={s.title} className="ability-section">
            <h3>{s.title}</h3>
            {s.abilities.map((a) => (
              <AbilityRow key={a.id} ability={a} placed={placed.has(`ability:${a.id}`)} readOnly={readOnly} showLevel={sort === "level"} />
            ))}
          </div>
        ))}
        {(filter === "all" || filter === "macro") && (
          <div className="ability-section">
            <h3>Macros</h3>
            {macroList.map((c) => (
              <div
                key={c.id}
                className="ability-row"
                draggable={!readOnly}
                onDragStart={(e) => writeDrag(e, { kind: "macro", id: c.id }, "copy")}
              >
                <img src={iconUrl(c.icon)} alt="" />
                <span className="ability-name">{c.name}</span>
                {placed.has(`macro:${c.id}`) && <span className="placed" title="On your bars">✓</span>}
                {!readOnly && (
                  <button className="small" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}>
                    Edit
                  </button>
                )}
              </div>
            ))}
            {!readOnly && !editing && (
              <button className="add-macro" onClick={() => setEditing({ id: newId(), name: "", icon: "inv_misc_questionmark" })}>
                + New macro
              </button>
            )}
            {editing && (
              <MacroEditor
                item={editing}
                data={data}
                isNew={!profile.macros.some((c) => c.id === editing.id)}
                onSave={(item) => {
                  onSaveMacro(item);
                  setEditing(null);
                }}
                onDelete={() => {
                  onDeleteMacro(editing.id);
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            )}
          </div>
        )}
        {(q || form) && !sections.length && !macroList.length && (
          <p className="muted pad">No abilities match{q ? ` “${query}”` : ""}{form ? ` that require ${form}` : ""}.</p>
        )}
      </div>
    </aside>
  );
}

function AbilityRow({ ability, placed, readOnly, showLevel }: { ability: Ability; placed: boolean; readOnly: boolean; showLevel: boolean }) {
  const tip = useTooltip();
  return (
    <div
      className="ability-row"
      draggable={!readOnly}
      onDragStart={(e) => {
        tip.hide();
        writeDrag(e, { kind: "ability", id: ability.id }, "copy");
      }}
      onMouseEnter={(e) => tip.show(e, <AbilityTooltip ability={ability} />)}
      onMouseLeave={tip.hide}
    >
      <img src={iconUrl(ability.icon)} alt="" draggable={false} />
      <span className="ability-name">{ability.name}</span>
      {ability.kind === "shapeshift" && <span className="badge">Form</span>}
      {ability.group === "talent" && <span className="badge talent">Talent</span>}
      {placed && <span className="placed" title="On your bars">✓</span>}
      {showLevel && ability.level !== undefined && (
        <span className="ability-level" title={`Learned at level ${ability.level}`}>
          {ability.level}
        </span>
      )}
    </div>
  );
}

export function AbilityTooltip({ ability }: { ability: Ability }) {
  const where =
    ability.group === "talent"
      ? `${ability.tree} talent`
      : ability.group === "racial"
        ? `${ability.race} racial`
        : ability.group === "general"
          ? "General"
          : ability.tree;
  return (
    <>
      <div className="tt-name">
        {ability.name}
        {ability.rank ? <span className="tt-rank">Rank {ability.rank}</span> : null}
      </div>
      {ability.lines.map((l, i) => (
        <div key={i} className="tt-line">
          {l}
        </div>
      ))}
      {ability.desc && <div className="tt-desc">{ability.desc}</div>}
      <div className="tt-meta">
        {where}
        {ability.level ? ` · learned at ${ability.level}` : ""}
        {ability.trainer === false ? " · not from the class trainer" : ""}
      </div>
    </>
  );
}

function MacroEditor({
  item,
  data,
  isNew,
  onSave,
  onDelete,
  onCancel,
}: {
  item: Macro;
  data: ClassData;
  isNew: boolean;
  onSave: (item: Macro) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [icon, setIcon] = useState(item.icon);
  const [iconQuery, setIconQuery] = useState("");
  // Generic icons first, then this class's, then every other icon we ship.
  const icons = useMemo(() => [...new Set([...meta.extraIcons, ...data.abilities.map((a) => a.icon), ...meta.icons])], [data]);
  const q = iconQuery.trim().toLowerCase().replace(/\s+/g, "_");
  const shown = q ? icons.filter((i) => i.includes(q)) : icons;
  return (
    <form
      className="macro-editor"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSave({ ...item, name: name.trim(), icon });
      }}
    >
      <input
        autoFocus
        aria-label="Macro name"
        placeholder="Macro name, e.g. Healing Potion"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={16}
      />
      <div className="macro-preview">
        <img src={iconUrl(icon)} alt="" />
        <input
          type="search"
          aria-label="Search icons"
          placeholder={`Search ${icons.length} icons…`}
          value={iconQuery}
          onChange={(e) => setIconQuery(e.target.value)}
        />
      </div>
      <div className="icon-grid">
        {shown.length === 0 && <span className="muted">No icons match.</span>}
        {shown.map((i) => (
          <button type="button" key={i} className={i === icon ? "on" : ""} onClick={() => setIcon(i)} aria-label={i} title={i}>
            <img src={iconUrl(i)} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      <div className="row">
        <button type="submit" className="primary" disabled={!name.trim()}>
          {isNew ? "Add" : "Save"}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        {!isNew && (
          <button type="button" className="danger" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
