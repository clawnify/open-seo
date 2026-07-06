import type { PostStatus } from "../types";

const STATUS_BADGE: Record<PostStatus, string> = {
  draft: "badge-neutral",
  scheduled: "badge-warning",
  published: "badge-success",
  failed: "badge-danger",
};

const STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: PostStatus }) {
  return <span class={`badge ${STATUS_BADGE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function Eyebrow({ children }: { children: preact.ComponentChildren }) {
  return <div class="eyebrow">{children}</div>;
}

/** Toolbar: page title + optional actions, hairline underneath. */
export function Toolbar({ title, children }: { title: string; children?: preact.ComponentChildren }) {
  return (
    <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
      <h1 class="text-[20px] font-bold tracking-tight">{title}</h1>
      <div class="flex items-center gap-2">{children}</div>
    </div>
  );
}

/**
 * Standard stage layout — a full-width sticky toolbar (title + primary action)
 * over a left-aligned, container-bounded content column (hugs the sidebar
 * instead of floating centered). Every stage screen uses this.
 */
export function Page({ title, actions, children }: {
  title: string; actions?: preact.ComponentChildren; children: preact.ComponentChildren;
}) {
  return (
    <>
      <Toolbar title={title}>{actions}</Toolbar>
      <div class="max-w-[1200px] space-y-4 px-6 py-5">{children}</div>
    </>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: preact.ComponentChildren }) {
  return (
    <div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <p class="text-[15px] font-semibold">{title}</p>
      {hint && <p class="max-w-sm text-[13px] text-muted">{hint}</p>}
      {action && <div class="mt-1">{action}</div>}
    </div>
  );
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** datetime-local <input> value (YYYY-MM-DDTHH:mm) from an ISO/SQL string. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value → ISO-8601 (UTC) for the API. */
export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** KPI value + label + fixed-height meta line (so state toggles don't shift layout). */
export function StatTile({ value, label, meta }: { value: number | string; label: string; meta?: string }) {
  return (
    <div>
      <div class="tnum text-[24px] font-bold leading-none">{value}</div>
      <div class="mt-1 text-[11px] text-muted">{label}</div>
      <div class="mt-0.5 h-3.5 text-[11px] text-faint">{meta ?? ""}</div>
    </div>
  );
}

/** Designed empty state for a stage/section not yet wired (honest about Phase 2). */
export function Phase2Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div class="flex flex-col items-center justify-center gap-2.5 py-16 text-center">
      <span class="badge badge-neutral">Phase 2</span>
      <p class="text-[15px] font-semibold">{title}</p>
      <p class="max-w-md text-[13px] text-muted">{hint}</p>
    </div>
  );
}
