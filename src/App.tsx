import { useCallback, useEffect, useRef, useState } from "react";
import { availableToRace, CLASS_COLORS, CLASS_ICONS, iconUrl, loadClass } from "./data/classes";
import meta from "./data/meta.json";
import type { ClassData } from "./data/types";
import { DEFAULT_BINDINGS, type Bindings } from "./domain/bindings";
import { createCharacter, newId, setRace, type Character } from "./domain/character";
import { decodeShare, shareCodeFromHash, shareUrl } from "./domain/share";
import { loadSaved, save, type Saved } from "./domain/storage";
import { ClassPicker } from "./ui/ClassPicker";
import { Editor } from "./ui/Editor";
import { TooltipProvider } from "./ui/Tooltip";

const LAUNCH = Date.UTC(2026, 10, 4, 23, 0); // 4 Nov 2026, 3:00 pm PST

function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatch(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return match;
}

function Countdown() {
  const ms = LAUNCH - Date.now();
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86_400_000);
  return <span className="countdown">{days === 0 ? "Launches today" : `Launch in ${days === 1 ? "1 day" : `${days} days`}`}</span>;
}

/** Two-click confirm without browser dialogs. */
function ConfirmButton({ label, confirm, onConfirm, className }: { label: string; confirm: string; onConfirm: () => void; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button
      className={`${className ?? ""} ${armed ? "armed" : ""}`}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirm : label}
    </button>
  );
}

export default function App() {
  const [saved, setSaved] = useState<Saved>(loadSaved);
  const [shared, setShared] = useState<{ character: Character; keymap: Bindings } | null>(null);
  /** On a shared link: also replace my keymap with theirs when copying. */
  const [takeKeymap, setTakeKeymap] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [data, setData] = useState<ClassData | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number>();
  const narrow = useMediaQuery("(max-width: 899px), (pointer: coarse)");

  const toast = useCallback((message: string) => {
    setToastMsg(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 3500);
  }, []);

  useEffect(() => save(saved), [saved]);

  // Open share links (#share=...) read-only.
  useEffect(() => {
    const read = () => {
      const code = shareCodeFromHash(window.location.hash);
      if (!code) {
        setShared(null);
        return;
      }
      decodeShare(code)
        .then(({ character, keymap }) => {
          setShared({ character: { ...character, id: "shared", updatedAt: Date.now() }, keymap });
          setTakeKeymap(false);
          setShareError(null);
        })
        .catch(() => setShareError("This share link is broken or from a newer version of the site."));
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const active = saved.characters.find((p) => p.id === saved.activeId) ?? saved.characters[0] ?? null;
  const shown = shared?.character ?? active;
  const shownKeymap = shared?.keymap ?? saved.keymap;

  useEffect(() => {
    setData(null);
    if (shown) loadClass(shown.classId).then(setData);
  }, [shown?.classId]);

  const updateCharacter = (p: Character) =>
    setSaved((s) => ({ ...s, characters: s.characters.map((x) => (x.id === p.id ? p : x)) }));

  const addCharacter = (p: Character) => {
    setSaved((s) => ({ ...s, characters: [...s.characters, p], activeId: p.id }));
    setPicking(false);
  };

  const closeShared = () => {
    history.replaceState(null, "", window.location.pathname);
    setShared(null);
    setShareError(null);
  };

  const showPicker = !shared && (picking || !active);

  return (
    <TooltipProvider>
      <div className="app" style={shown ? ({ "--class": CLASS_COLORS[shown.classId] } as React.CSSProperties) : undefined}>
        <header className="header">
          <div className="brand">
            <span className="logo" aria-hidden="true">
              F
            </span>
            <span>
              Forever <b>Keymap</b>
            </span>
            <Countdown />
          </div>
          {!shared && active && !picking && (
            <div className="character-bar">
              <img className="class-icon" src={iconUrl(CLASS_ICONS[active.classId])} alt={active.classId} />
              <select
                aria-label="Character"
                value={active.id}
                onChange={(e) => setSaved((s) => ({ ...s, activeId: e.target.value }))}
              >
                {saved.characters.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                className="name-input"
                aria-label="Character name"
                value={active.name}
                onChange={(e) => updateCharacter({ ...active, name: e.target.value })}
                maxLength={40}
              />
              {data && (
                <select
                  aria-label="Race"
                  value={active.raceId}
                  onChange={(e) => {
                    const race = e.target.value;
                    const byId = new Map(data.abilities.map((a) => [a.id, a]));
                    updateCharacter(setRace(active, race, (id) => !byId.has(id) || availableToRace(byId.get(id)!, race)));
                  }}
                >
                  {data.races.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
              <button onClick={() => setPicking(true)}>New</button>
              <button onClick={() => addCharacter({ ...structuredClone(active), id: newId(), name: `${active.name} (copy)` })}>
                Duplicate
              </button>
              <button
                className="primary"
                onClick={async () => {
                  const url = await shareUrl(active, saved.keymap);
                  try {
                    await navigator.clipboard.writeText(url);
                    toast("Share link copied to clipboard.");
                  } catch {
                    window.location.hash = url.slice(url.indexOf("#"));
                    toast("Couldn't access the clipboard. Copy the link from the address bar.");
                  }
                }}
              >
                Share
              </button>
              <ConfirmButton
                label="Reset keybindings"
                confirm="Reset for all characters?"
                onConfirm={() => {
                  setSaved((s) => ({ ...s, keymap: structuredClone(DEFAULT_BINDINGS) }));
                  toast("Keybindings reset to WoW defaults for all characters. Bars are unchanged.");
                }}
              />
              <ConfirmButton
                className="danger"
                label="Delete"
                confirm="Delete character?"
                onConfirm={() =>
                  setSaved((s) => {
                    const characters = s.characters.filter((p) => p.id !== active.id);
                    return { ...s, characters, activeId: characters[0]?.id ?? null };
                  })
                }
              />
            </div>
          )}
        </header>

        {shareError && (
          <div className="banner error">
            {shareError} <button onClick={closeShared}>Close</button>
          </div>
        )}
        {shared && (
          <div className="banner">
            <span>
              Viewing shared character <b>{shared.character.name}</b> ({shared.character.raceId} {shared.character.classId}) and
              its keybindings. Read-only.
            </span>
            <label className="banner-check">
              <input type="checkbox" checked={takeKeymap} onChange={(e) => setTakeKeymap(e.target.checked)} />
              Also use their keybindings (replaces yours for all characters)
            </label>
            <button
              className="primary"
              onClick={() => {
                const { character, keymap } = shared;
                addCharacter({ ...character, id: newId(), updatedAt: Date.now() });
                if (takeKeymap) setSaved((s) => ({ ...s, keymap }));
                closeShared();
                toast(`Copied “${character.name}”${takeKeymap ? " and its keybindings" : ""} to your characters.`);
              }}
            >
              Copy to my characters
            </button>
            <button onClick={closeShared}>Close</button>
          </div>
        )}
        {narrow && (
          <div className="banner warning" role="alert">
            <b>This site only works on a computer.</b> Planning your bars needs a keyboard and mouse, so on this device you can
            only look.
          </div>
        )}

        <main>
          {showPicker ? (
            <ClassPicker
              onCreate={(c, r) => addCharacter(createCharacter(c, r))}
              onCancel={active ? () => setPicking(false) : undefined}
            />
          ) : shown && data && data.id === shown.classId ? (
            <Editor
              key={shown.id}
              character={shown}
              keymap={shownKeymap}
              data={data}
              readOnly={!!shared || narrow}
              onChange={updateCharacter}
              onKeymapChange={(keymap) => setSaved((s) => ({ ...s, keymap }))}
              toast={toast}
            />
          ) : (
            <p className="muted pad">Loading…</p>
          )}
        </main>

        <footer className="footer">
          Ability data from{" "}
          <a href="https://talentsforever.com" target="_blank" rel="noreferrer">
            talentsforever.com
          </a>{" "}
          (CC BY 4.0), updated {meta.generated}. Game names, icons and text © Blizzard Entertainment. Fan-made, not affiliated with
          Blizzard.
        </footer>

        {toastMsg && (
          <div className="toast" role="status">
            {toastMsg}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
