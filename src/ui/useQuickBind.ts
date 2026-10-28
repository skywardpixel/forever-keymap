import { useEffect, useRef } from "react";
import { inputFromCode, inputFromMouseButton, isBindable, makeChord, modsFromEvent, type Chord } from "../domain/chords";

type Handlers = {
  /** Bind a chord to the current target (hovered, else locked). */
  onChord: (chord: Chord) => void;
  /** Right-click. */
  onClear: () => void;
  /** Esc is never bindable (it's WoW's game menu), so it acts as a command. */
  onEscape: () => void;
  /** A bare left click outside [data-qb-ignore] controls. */
  onPlainClick?: () => void;
};

const WHEEL_THROTTLE_MS = 250;

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
}

/** Controls marked data-qb-ignore (the Quick Bind toolbar) keep normal mouse behaviour. */
function isIgnored(target: EventTarget | null) {
  return target instanceof Element && !!target.closest("[data-qb-ignore]");
}

/** Captures keys, mouse buttons and wheel while Quick Bind (or a key capture) is on. */
export function useQuickBind(enabled: boolean, handlers: Handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    let lastWheel = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.code === "Escape") {
        e.preventDefault();
        ref.current.onEscape();
        return;
      }
      const input = inputFromCode(e.code);
      if (!input) return; // a lone modifier, or a key WoW can't bind
      e.preventDefault();
      ref.current.onChord(makeChord(modsFromEvent(e), input));
    };

    const onMouseDown = (e: MouseEvent) => {
      if (isTyping(e.target) || isIgnored(e.target)) return;
      const input = inputFromMouseButton(e.button);
      if (!input) return;
      const chord = makeChord(modsFromEvent(e), input);
      if (!isBindable(chord)) {
        if (e.button === 2) {
          e.preventDefault();
          ref.current.onClear();
        } else {
          ref.current.onPlainClick?.(); // otherwise a normal UI click (locks a slot)
        }
        return;
      }
      e.preventDefault();
      ref.current.onChord(chord);
    };

    // Mouse 4/5 navigate back/forward on release unless stopped.
    const stopNav = (e: MouseEvent) => {
      if (e.button === 3 || e.button === 4) e.preventDefault();
    };

    const onWheel = (e: WheelEvent) => {
      if (isTyping(e.target) || e.deltaY === 0) return;
      e.preventDefault();
      const now = performance.now();
      if (now - lastWheel < WHEEL_THROTTLE_MS) return;
      lastWheel = now;
      ref.current.onChord(makeChord(modsFromEvent(e), e.deltaY < 0 ? "MOUSEWHEELUP" : "MOUSEWHEELDOWN"));
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("mouseup", stopNav, true);
    window.addEventListener("auxclick", stopNav, true);
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.addEventListener("contextmenu", onContextMenu, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("mouseup", stopNav, true);
      window.removeEventListener("auxclick", stopNav, true);
      window.removeEventListener("wheel", onWheel, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
    };
  }, [enabled]);
}

/** Modifiers currently held, for showing the matching keyboard layer. */
export function useHeldModifiers(onChange: (mods: { alt: boolean; ctrl: boolean; shift: boolean }) => void) {
  const ref = useRef(onChange);
  ref.current = onChange;
  useEffect(() => {
    const update = (e: KeyboardEvent) => {
      if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) ref.current(modsFromEvent(e));
    };
    const reset = () => ref.current({ alt: false, ctrl: false, shift: false });
    window.addEventListener("keydown", update);
    window.addEventListener("keyup", update);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", update);
      window.removeEventListener("keyup", update);
      window.removeEventListener("blur", reset);
    };
  }, []);
}
