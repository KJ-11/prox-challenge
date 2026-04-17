import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ArtifactSource {
  label: string;
  page: number;
  document?: "owner_manual" | "quick_start" | "selection_chart";
}

export interface ArtifactCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  sources?: ArtifactSource[];
  children: ReactNode;
  className?: string;
  /** If true, renders without card chrome — useful when embedded side-by-side */
  bare?: boolean;
}

const DOC_LABEL: Record<NonNullable<ArtifactSource["document"]>, string> = {
  owner_manual: "Owner's Manual",
  quick_start: "Quick Start Guide",
  selection_chart: "Selection Chart",
};

function formatSources(sources: ArtifactSource[]): string {
  return sources
    .map((s) => {
      const doc = s.document ? ` · ${DOC_LABEL[s.document]}` : "";
      return `${s.label} · p${s.page}${doc}`;
    })
    .join("  •  ");
}

export function ArtifactCard({
  title,
  subtitle,
  badge,
  sources,
  children,
  className,
  bare,
}: ArtifactCardProps): React.JSX.Element {
  if (bare) {
    return (
      <div className={cn("w-full", className)}>
        <Header title={title} subtitle={subtitle} badge={badge} bare />
        <div className="pt-3">{children}</div>
        {sources && sources.length > 0 && <Footer sources={sources} />}
      </div>
    );
  }
  return (
    <figure
      className={cn(
        "w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-xs",
        className,
      )}
    >
      <Header title={title} subtitle={subtitle} badge={badge} />
      <div className="px-5 py-4">{children}</div>
      {sources && sources.length > 0 && <Footer sources={sources} />}
    </figure>
  );
}

function Header({
  title,
  subtitle,
  badge,
  bare,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  bare?: boolean;
}): React.JSX.Element {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3",
        bare
          ? "pb-2"
          : "rounded-t-lg border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-5 py-3",
      )}
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold tracking-tight text-[color:var(--color-foreground)]">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-[color:var(--color-muted)]">
            {subtitle}
          </p>
        )}
      </div>
      {badge && (
        <span className="shrink-0 rounded-full border border-[color:var(--color-brand)] bg-[color:var(--color-brand-soft)] px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wide text-[color:var(--color-brand-strong)]">
          {badge}
        </span>
      )}
    </header>
  );
}

function Footer({ sources }: { sources: ArtifactSource[] }): React.JSX.Element {
  return (
    <footer className="rounded-b-lg border-t border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-5 py-2 text-[10px] text-[color:var(--color-muted)]">
      Source: {formatSources(sources)}
    </footer>
  );
}
