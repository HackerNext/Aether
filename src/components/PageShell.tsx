import React from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';

interface PageShellProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  onOpenDocs?: () => void;
  children: React.ReactNode;
}

export const PageShell: React.FC<PageShellProps> = ({
  title,
  subtitle,
  onBack,
  onOpenDocs,
  children,
}) => {
  return (
    <div className="animate-page flex min-h-screen flex-col bg-[#07090D]">
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#07090D]/90 backdrop-blur-xl safe-top">
        <div className="mx-auto flex w-full max-w-[460px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-200 transition hover:bg-white/[0.09] active:scale-95"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-white">{title}</h1>
              {subtitle && <p className="truncate text-[11px] text-slate-400">{subtitle}</p>}
            </div>
          </div>

          {onOpenDocs && (
            <button
              type="button"
              onClick={onOpenDocs}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[11px] font-medium text-slate-300 transition hover:border-emerald-400/40 hover:text-white active:scale-95"
              aria-label="How this metric is calculated"
            >
              <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
              <span>How it works</span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[460px] flex-1 space-y-4 px-4 pb-12 pt-5 safe-bottom">
        {children}
      </main>
    </div>
  );
};
