import { useState, useRef, useEffect } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (show && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const tooltipWidth = tooltipRect.width || 200;
      const tooltipHeight = tooltipRect.height || 40;
      const spacing = 8;

      // Horizontal: center on trigger, clamp to viewport
      let left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
      left = Math.max(8, Math.min(left, viewportWidth - tooltipWidth - 8));

      // Vertical: prefer above, fall back to below
      let top: number;
      if (triggerRect.top >= tooltipHeight + spacing) {
        top = triggerRect.top - tooltipHeight - spacing;
      } else {
        top = triggerRect.bottom + spacing;
      }

      setStyle({ position: "fixed", left: `${left}px`, top: `${top}px`, zIndex: 9999 });
    }
  }, [show]);

  if (!content) return <>{children}</>;

  return (
    <span
      ref={triggerRef}
      className="inline-block cursor-default"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          ref={tooltipRef}
          style={style}
          className="fixed max-w-xs text-xs rounded shadow-lg whitespace-normal break-words bg-card-bg border border-border text-foreground px-2 py-1.5"
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
        >
          {content}
        </span>
      )}
    </span>
  );
}
