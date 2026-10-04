import React, { useRef, useEffect } from 'react';
import { Activity, AlertCircle, Terminal } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';

interface ConsoleTrayProps {
  logs: string[];
}

export const ConsoleTray = React.memo(function ConsoleTray({ logs }: ConsoleTrayProps) {
  const logEndRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef<number | null>(null);

  useEffect(() => {
    // Use requestAnimationFrame to debounce scroll — avoid layout thrashing
    // from rapid log additions. Use 'auto' behavior instead of 'smooth' to
    // prevent animated scrolling that looks like page flickering.
    if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      logEndRef.current?.scrollIntoView({ behavior: 'auto' });
      scrollRaf.current = null;
    });
    return () => {
      if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
    };
  }, [logs]);

  return (
    <footer className="shrink-0 border-t border-[var(--border-default)] bg-[var(--bg-surface)]">
      <div className="flex items-center justify-between px-6 py-1.5">
        <Tooltip content="系统日志">
          <span className="flex items-center gap-1.5 font-mono text-[9px] text-[var(--log-system)] uppercase tracking-widest">
            <Terminal className="w-3 h-3" />
            Console
          </span>
        </Tooltip>
        <Tooltip content="实时监听中">
          <span className="flex items-center gap-1 font-mono text-[9px] text-[var(--accent-teal)]">
            <Activity className="w-3 h-3 animate-pulse" />
            LIVE
          </span>
        </Tooltip>
      </div>
      <div className="px-6 pb-2 max-h-16 overflow-y-auto flex flex-col gap-0.5">
        {logs.map((log, idx) => {
          const isError = log.startsWith('$> IO.ERROR:');
          const displayLog = isError ? log.replace('$> IO.ERROR:', 'IO.ERROR:') : log;
          return (
            <div key={idx} className="flex gap-2 font-mono text-[10px]">
              <span className="text-[var(--border-subtle)] select-none shrink-0">
                {isError ? (
                  <AlertCircle className="w-3 h-3 text-[var(--accent-rose)] inline-block" />
                ) : (
                  <Terminal className="w-3 h-3 inline-block" />
                )}
              </span>
              <span className={isError ? 'text-[var(--accent-rose)] font-bold' : 'text-[var(--log-system)]'}>
                {displayLog}
              </span>
            </div>
          );
        })}
        <div ref={logEndRef} />
      </div>
    </footer>
  );
});
