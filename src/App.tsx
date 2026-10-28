import { useCallback, useEffect, useRef, useState } from "react";
import { CLASS_COLORS, CLASS_ICONS, iconUrl, loadClass } from "./data/classes";
import meta from "./data/meta.json";
import type { ClassData } from "./data/types";
import { DEFAULT_BINDINGS } from "./domain/bindings";
import { createProfile, newId, setRace, type Profile } from "./domain/profile";
import { decodeProfile, shareCodeFromHash, shareUrl } from "./domain/share";
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
  const [shared, setShared] = useState<Profile | null>(null);
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

  // Open share links (#share=...) as read-only profiles.
  useEffect(() => {
    const read = () => {
      const code = shareCodeFromHash(window.location.hash);
      if (!code) {
        setShared(null);
        return;
      }
      decodeProfile(code)
        .then((p) => {
          setShared({ ...p, id: "shared", updatedAt: Date.now() });
          setShareError(null);
        })
        .catch(() => setShareError("This share link is broken or from a newer version of the site."));
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const active = saved.profiles.find((p) => p.id === saved.activeId) ?? saved.profiles[0] ?? null;
  const shown = shared ?? active;

  useEffect(() => {
    setData(null);
    if (shown) loadClass(shown.classId).then(setData);
  }, [shown?.classId]);

  const updateProfile = (p: Profile) =>
    setSaved((s) => ({ ...s, profiles: s.profiles.map((x) => (x.id === p.id ? p : x)) }));

  const addProfile = (p: Profile) => {
    setSaved((s) => ({ profiles: [...s.profiles, p], activeId: p.id }));
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
            <div className="profile-bar">
              <img className="class-icon" src={iconUrl(CLASS_ICONS[active.classId])} alt={active.classId} />
              <select
                aria-label="Profile"
                value={active.id}
                onChange={(e) => setSaved((s) => ({ ...s, activeId: e.target.value }))}
              >
                {saved.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                className="name-input"
                aria-label="Profile name"
                value={active.name}
                onChange={(e) => updateProfile({ ...active, name: e.target.value })}
                maxLength={40}
              />
              {data && (
                <select
                  aria-label="Race"
                  value={active.raceId}
                  onChange={(e) => updateProfile(setRace(active, e.target.value))}
                >
                  {data.races.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
              <button onClick={() => setPicking(true)}>New</button>
              <button onClick={() => addProfile({ ...structuredClone(active), id: newId(), name: `${active.name} (copy)` })}>
                Duplicate
              </button>
              <button
                className="primary"
                onClick={async () => {
                  const url = await shareUrl(active);
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
                label="Reset bindings"
                confirm="Reset all bindings?"
                onConfirm={() => {
                  updateProfile({ ...active, bindings: structuredClone(DEFAULT_BINDINGS) });
                  toast("Bindings reset to WoW defaults. Your bars are unchanged.");
                }}
              />
              <ConfirmButton
                className="danger"
                label="Delete"
                confirm="Delete profile?"
                onConfirm={() =>
                  setSaved((s) => {
                    const profiles = s.profiles.filter((p) => p.id !== active.id);
                    return { profiles, activeId: profiles[0]?.id ?? null };
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
              Viewing shared profile <b>{shared.name}</b> ({shared.raceId} {shared.classId}). Read-only.
            </span>
            <button
              className="primary"
              onClick={() => {
                addProfile({ ...shared, id: newId(), updatedAt: Date.now() });
                closeShared();
                toast(`Copied “${shared.name}” to your profiles.`);
              }}
            >
              Copy to my profiles
            </button>
            <button onClick={closeShared}>Close</button>
          </div>
        )}
        {narrow && shown && !showPicker && <div className="banner">Editing needs a desktop browser. This is a read-only view.</div>}

        <main>
          {showPicker ? (
            narrow ? (
              <div className="picker">
                <h1>Forever Keymap</h1>
                <p className="muted">Plan your WoW Forever action bars and keybindings. Open this site on a desktop browser to start.</p>
              </div>
            ) : (
              <ClassPicker
                onCreate={(c, r) => addProfile(createProfile(c, r))}
                onCancel={active ? () => setPicking(false) : undefined}
              />
            )
          ) : shown && data && data.id === shown.classId ? (
            <Editor
              key={shown.id}
              profile={shown}
              data={data}
              readOnly={!!shared || narrow}
              onChange={updateProfile}
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
