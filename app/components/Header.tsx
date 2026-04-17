"use client";

import { Moon, Sun, Eye, EyeOff } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface HeaderProps {
  reasoningOn: boolean;
  onReasoningToggle: (next: boolean) => void;
}

export function Header({
  reasoningOn,
  onReasoningToggle,
}: HeaderProps): React.JSX.Element {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]/90 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-brand)] text-xs font-bold text-white">
          P
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">
            Prox · Vulcan OmniPro 220
          </span>
          <span className="hidden text-[10px] font-mono uppercase tracking-widest text-[color:var(--color-muted)] md:block">
            Technical expert
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <ReasoningToggle on={reasoningOn} onChange={onReasoningToggle} />
        <ThemeToggle />
      </div>
    </header>
  );
}

function ReasoningToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors",
        on
          ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand-strong)]"
          : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]",
      )}
      title={on ? "Reasoning visible — click to hide" : "Show reasoning"}
    >
      {on ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">Reasoning</span>
    </button>
  );
}

function ThemeToggle(): React.JSX.Element {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch — render a placeholder before mount.
  if (!mounted) {
    return (
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--color-border)]"
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted)] transition-colors hover:text-[color:var(--color-foreground)]"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
