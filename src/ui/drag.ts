export type DragData = { kind: "ability"; id: string } | { kind: "macro"; id: string } | { kind: "slot"; key: string };

const MIME = "application/x-forever-keymap";

export function writeDrag(e: React.DragEvent, data: DragData, effect: "copy" | "move") {
  beginDrag();
  e.dataTransfer.setData(MIME, JSON.stringify(data));
  e.dataTransfer.effectAllowed = effect;
}

export function readDrag(e: React.DragEvent): DragData | null {
  try {
    const raw = e.dataTransfer.getData(MIME);
    return raw ? (JSON.parse(raw) as DragData) : null;
  } catch {
    return null;
  }
}

// dropEffect is unreliable across browsers, so drop targets flag a handled drop
// and the source's dragend checks it to tell "dropped on a slot" from "dragged off".
let dropHandled = false;

export function markDropHandled() {
  dropHandled = true;
}

export function beginDrag() {
  dropHandled = false;
}

export function wasDropHandled() {
  return dropHandled;
}
