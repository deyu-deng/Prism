import React, { useState, useRef, useCallback, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Tooltip — zero-dependency, absolute-positioned tooltip
// Design spec: 300ms show delay, 150ms hide delay, no arrow, opacity transition
// ---------------------------------------------------------------------------

interface TooltipProps {
  content: string;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  delay?: number;
  hideDelay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const POSITION_STYLES: Record<string, React.CSSProperties> = {
  top: {
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    paddingBottom: '6px',
  },
  bottom: {
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    paddingTop: '6px',
  },
  left: {
    right: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    paddingRight: '6px',
  },
  right: {
    left: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    paddingLeft: '6px',
  },
};

let tooltipIdCounter = 0;

export function Tooltip({
  content,
  children,
  delay = 300,
  hideDelay = 150,
  position = 'top',
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useRef<string>(`tooltip-${++tooltipIdCounter}`);

  const clearTimers = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    showTimer.current = null;
    hideTimer.current = null;
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    showTimer.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const handleMouseLeave = useCallback(() => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    hideTimer.current = setTimeout(() => setVisible(false), hideDelay);
  }, [hideDelay]);

  // Cleanup on unmount
  useEffect(() => clearTimers, [clearTimers]);

  // Clone child to attach event handlers + aria-describedby
  const existingProps = children.props as Record<string, unknown>;
  const child = React.cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent<Element>) => {
      handleMouseEnter();
      (existingProps.onMouseEnter as ((e: React.MouseEvent<Element>) => void) | undefined)?.(e);
    },
    onMouseLeave: (e: React.MouseEvent<Element>) => {
      handleMouseLeave();
      (existingProps.onMouseLeave as ((e: React.MouseEvent<Element>) => void) | undefined)?.(e);
    },
    'aria-describedby': tooltipId.current,
  } as React.HTMLAttributes<HTMLElement>);

  return (
    <div className="relative inline-flex">
      {child}
      {visible && (
        <div
          id={tooltipId.current}
          role="tooltip"
          style={{
            position: 'absolute',
            ...POSITION_STYLES[position],
            pointerEvents: 'none',
            zIndex: 9999,
            whiteSpace: 'nowrap',
          }}
          className="rounded px-2 py-1 font-mono text-[11px] leading-tight border opacity-0 transition-opacity duration-150 bg-[var(--bg-overlay)] text-[var(--text-primary)] border-[var(--border-default)]"
          ref={(el) => {
            // Force opacity after paint to trigger CSS transition
            if (el) requestAnimationFrame(() => el.style.setProperty('opacity', '1'));
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
