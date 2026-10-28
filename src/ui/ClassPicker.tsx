import { useEffect, useState } from "react";
import { CLASS_COLORS, CLASS_ICONS, CLASS_IDS, iconUrl, loadClass } from "../data/classes";
import type { ClassData } from "../data/types";

type Props = {
  onCreate: (classId: string, raceId: string) => void;
  onCancel?: () => void;
};

export function ClassPicker({ onCreate, onCancel }: Props) {
  const [classId, setClassId] = useState<string | null>(null);
  const [data, setData] = useState<ClassData | null>(null);

  useEffect(() => {
    setData(null);
    if (classId) loadClass(classId).then(setData);
  }, [classId]);

  return (
    <div className="picker">
      <h1>{classId ? "Choose a race" : "Choose a class"}</h1>
      <p className="muted">
        {classId
          ? "Racials depend on race. You can change it later."
          : "Each profile plans the action bars and keybindings for one class."}
      </p>
      {!classId && (
        <div className="class-grid">
          {CLASS_IDS.map((c) => (
            <button key={c} className="class-card" style={{ "--class": CLASS_COLORS[c] } as React.CSSProperties} onClick={() => setClassId(c)}>
              <img src={iconUrl(CLASS_ICONS[c])} alt="" />
              <span>{c}</span>
            </button>
          ))}
        </div>
      )}
      {classId && data && (
        <div className="race-columns">
          {(["Alliance", "Horde"] as const).map((faction) => (
            <div key={faction} className={`race-col ${faction.toLowerCase()}`}>
              <h2>{faction}</h2>
              {data.races
                .filter((r) => r.faction === faction)
                .map((r) => (
                  <button key={r.id} className="race-card" onClick={() => onCreate(classId, r.id)}>
                    <img src={iconUrl(r.icon)} alt="" />
                    <span>{r.name}</span>
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}
      <div className="row center">
        {classId && <button onClick={() => setClassId(null)}>← Back to classes</button>}
        {onCancel && <button onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}
