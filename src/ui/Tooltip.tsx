import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Tip = { x: number; y: number; content: ReactNode } | null;

type Anchor = React.MouseEvent | Element;

const TooltipContext = createContext<{ show: (anchor: Anchor, content: ReactNode) => void; hide: () => void }>({
  show: () => {},
  hide: () => {},
});

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<Tip>(null);
  const show = useCallback((anchor: Anchor, content: ReactNode) => {
    const el = anchor instanceof Element ? anchor : (anchor.currentTarget as Element);
    const r = el.getBoundingClientRect();
    setTip({ x: r.right + 8, y: r.top, content });
  }, []);
  const hide = useCallback(() => setTip(null), []);
  return (
    <TooltipContext.Provider value={{ show, hide }}>
      {children}
      {tip && (
        <div
          className="tooltip"
          style={{
            left: Math.min(tip.x, window.innerWidth - 330),
            top: Math.min(tip.y, window.innerHeight - 220),
          }}
        >
          {tip.content}
        </div>
      )}
    </TooltipContext.Provider>
  );
}

export const useTooltip = () => useContext(TooltipContext);
