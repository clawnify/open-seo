import { useState, useEffect } from "preact/hooks";
import { ChevronLeft, ChevronRight, CalendarClock, Send, ExternalLink, Loader2 } from "lucide-preact";
import { useApp } from "../context";
import { Eyebrow, EmptyState, formatDateTime, fromLocalInput, Page } from "./ui";
import type { Post } from "../types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function Publish({ navigate }: { navigate: (p: string) => void }) {
  const { posts, calendarData, calendarMonth, setCalendarMonth, loadCalendar, updatePost, publishPost, status } = useApp();
  const drafts = posts.filter((p) => p.status === "draft");
  const scheduled = posts.filter((p) => p.status === "scheduled");
  const published = posts.filter((p) => p.status === "published");
  const wp = !!status?.wordpress_connected;

  const [start, setStart] = useState("");
  const [cadence, setCadence] = useState<"1" | "2" | "7">("1");
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadCalendar(calendarMonth); }, [calendarMonth, posts]);

  // Distribute every draft across future dates at 09:00, one per cadence step.
  const scheduleDrafts = async () => {
    const startMs = start ? Date.parse(start) : Date.now() + 86400000;
    const step = Number(cadence) * 86400000;
    setBusy(true);
    for (let i = 0; i < drafts.length; i++) {
      const d = new Date(startMs + i * step);
      d.setHours(9, 0, 0, 0);
      await updatePost(drafts[i].id, { status: "scheduled", scheduled_at: fromLocalInput(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T09:00`,
      ) });
    }
    setBusy(false);
  };

  const [y, m] = calendarMonth.split("-").map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: Array<number | null> = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <Page title="Publish">
      {/* Schedule control */}
      <div class="card">
        <div class="card-zone">
          <Eyebrow>Schedule drafts · {drafts.length} ready</Eyebrow>
          <div class="mt-3 flex flex-wrap items-end gap-3">
            <label class="field"><span>Start date</span>
              <input type="datetime-local" class="input w-auto" value={start}
                onInput={(e) => setStart((e.target as HTMLInputElement).value)} />
            </label>
            <label class="field w-40"><span>Cadence</span>
              <select class="input" value={cadence} onChange={(e) => setCadence((e.target as HTMLSelectElement).value as any)}>
                <option value="1">Every day</option>
                <option value="2">Every 2 days</option>
                <option value="7">Every week</option>
              </select>
            </label>
            <button class="btn btn-primary" onClick={scheduleDrafts} disabled={busy || drafts.length === 0}>
              {busy ? <Loader2 size={15} class="animate-spin" /> : <CalendarClock size={15} strokeWidth={2.5} />}
              Schedule {drafts.length} draft{drafts.length === 1 ? "" : "s"}
            </button>
          </div>
          {!wp && <p class="mt-2 text-[12px] text-warning">Connect WordPress in Clawnify → Integrations for scheduled articles to publish.</p>}
        </div>
      </div>

      {/* Calendar */}
      <div class="card">
        <div class="card-zone flex items-center justify-between">
          <Eyebrow>Calendar</Eyebrow>
          <div class="flex items-center gap-1">
            <button class="btn btn-ghost btn-sm px-1.5" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, -1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
            <span class="min-w-[120px] text-center text-[13px] font-semibold">{monthLabel}</span>
            <button class="btn btn-ghost btn-sm px-1.5" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, 1))} aria-label="Next month"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div class="card-zone pt-0">
          <div class="mb-1 grid grid-cols-7 gap-px">
            {WEEKDAYS.map((d) => <div key={d} class="eyebrow px-2 py-1 text-center">{d}</div>)}
          </div>
          <div class="calendar-grid">
            {cells.map((day, i) => {
              const key = day ? `${calendarMonth}-${String(day).padStart(2, "0")}` : `e-${i}`;
              const dayPosts = day ? calendarData[key] || [] : [];
              return (
                <div key={key} class="min-h-[92px] bg-surface p-1.5">
                  {day && <div class="tnum mb-1 px-1 text-[11px] text-muted">{day}</div>}
                  <div class="space-y-1">
                    {dayPosts.map((p) => (
                      <button key={p.id} onClick={() => navigate(`/compose/${p.id}`)} title={p.title}
                        class="block w-full truncate rounded border border-border bg-surface-sunken px-1.5 py-1 text-left text-[11px] hover:border-ring">
                        {p.title || p.keyword || "Untitled"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ArticleTable title="Scheduled" rows={scheduled} navigate={navigate} whenLabel="Scheduled for" whenField="scheduled_at"
        action={(p) => <button class="btn btn-secondary btn-sm" onClick={() => publishPost(p.id)} disabled={!wp} title={wp ? "" : "Connect WordPress"}><Send size={13} /> Publish now</button>} />
      <ArticleTable title="Published" rows={published} navigate={navigate} whenLabel="Published" whenField="published_at"
        action={(p) => p.published_url ? <a class="btn btn-ghost btn-sm px-1.5" href={p.published_url} target="_blank" rel="noreferrer" aria-label="View live"><ExternalLink size={14} /></a> : null} />
    </Page>
  );
}

function ArticleTable({ title, rows, navigate, whenLabel, whenField, action }: {
  title: string; rows: Post[]; navigate: (p: string) => void;
  whenLabel: string; whenField: "scheduled_at" | "published_at"; action: (p: Post) => any;
}) {
  return (
    <div class="card">
      <div class="card-zone pb-0"><Eyebrow>{title} · {rows.length}</Eyebrow></div>
      {rows.length === 0 ? (
        <div class="card-zone pt-3"><EmptyState title={`Nothing ${title.toLowerCase()}`} hint={title === "Scheduled" ? "Schedule your drafts above to queue them for auto-publishing." : "Published articles will appear here with a link to the live post."} /></div>
      ) : (
        <div class="card-zone pt-3">
          <div class="overflow-x-auto rounded-md border border-border">
            <table class="tbl">
              <thead><tr><th>Title</th><th>Keyword</th><th class="num">{whenLabel}</th><th class="w-32"></th></tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td class="cursor-pointer font-medium" onClick={() => navigate(`/compose/${p.id}`)}>{p.title || "Untitled"}</td>
                    <td>{p.keyword ? <span class="chip">{p.keyword}</span> : <span class="text-faint">—</span>}</td>
                    <td class="num text-muted">{formatDateTime(p[whenField])}</td>
                    <td class="text-right">{action(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
