import { applyDiff, bindingDiff, type Bindings } from "./bindings";
import type { Macro, Profile, SlotItem } from "./profile";

// Share links carry the whole profile (see docs/adr/0001). The payload is
// "<version>.<base64url(deflate-raw(json))>"; every past version must keep decoding.

const VERSION = 1;

type PayloadV1 = {
  n: string;
  c: string;
  r: string;
  /** slot key → ability id, or ["c", macroId] */
  s: Record<string, string | ["c", string]>;
  /** macros as [id, name, icon] */
  x: [string, string, string][];
  /** only the bindings that differ from WoW defaults */
  b: Bindings;
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function encodeProfile(profile: Profile): Promise<string> {
  const payload: PayloadV1 = {
    n: profile.name,
    c: profile.classId,
    r: profile.raceId,
    s: Object.fromEntries(
      Object.entries(profile.slots).map(([k, item]) => [k, item.type === "ability" ? item.id : ["c", item.id]]),
    ),
    x: profile.macros.map((c) => [c.id, c.name, c.icon]),
    b: bindingDiff(profile.bindings),
  };
  const bytes = await pipe(new TextEncoder().encode(JSON.stringify(payload)), new CompressionStream("deflate-raw"));
  return `${VERSION}.${toBase64Url(bytes)}`;
}

/** A shared profile, not yet saved (it gets a fresh id when copied). */
export type SharedProfile = Omit<Profile, "id" | "updatedAt">;

export async function decodeProfile(code: string): Promise<SharedProfile> {
  const dot = code.indexOf(".");
  const version = Number(code.slice(0, dot));
  if (version !== 1) throw new Error(`Unsupported share link version ${code.slice(0, dot)}`);
  const json = await pipe(fromBase64Url(code.slice(dot + 1)), new DecompressionStream("deflate-raw"));
  const p = JSON.parse(new TextDecoder().decode(json)) as PayloadV1;
  const slots: Record<string, SlotItem> = Object.fromEntries(
    Object.entries(p.s).map(([k, v]) => [k, typeof v === "string" ? { type: "ability", id: v } : { type: "macro", id: v[1] }]),
  );
  const macros: Macro[] = p.x.map(([id, name, icon]) => ({ id, name, icon }));
  return { name: p.n, classId: p.c, raceId: p.r, slots, macros, bindings: applyDiff(p.b) };
}

export async function shareUrl(profile: Profile): Promise<string> {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#share=${await encodeProfile(profile)}`;
}

export function shareCodeFromHash(hash: string): string | null {
  const m = /^#share=(.+)$/.exec(hash);
  return m ? m[1] : null;
}
