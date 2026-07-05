import { useEffect } from "preact/hooks";
import { ChevronLeft, ChevronRight, Plus } from "lucide-preact";
import { useApp } from "../context";
import { Toolbar } from "./ui";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function Calendar({ navigate }: { navigate: (p: string) => void }) {
  const { calendarData, calendarMonth, setCalendarMonth, loadCalendar } = useApp();

  useEffect(() => { loadCalendar(calendarMonth); }, [calendarMonth]);

  const [y, m] = calendarMonth.split("-").map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: Array<number | null> = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <>
      <Toolbar title="Calendar">
        <button class="btn btn-ghost btn-sm px-1.5" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, -1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
        <span class="min-w-[130px] text-center text-[13px] font-semibold">{monthLabel}</span>
        <button class="btn btn-ghost btn-sm px-1.5" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, 1))} aria-label="Next month"><ChevronRight size={16} /></button>
        <button class="btn btn-primary" onClick={() => navigate("/compose")}><Plus size={15} strokeWidth={2.5} /> New article</button>
      </Toolbar>

      <div class="p-6">
        <div class="mb-1 grid grid-cols-7 gap-px">
          {WEEKDAYS.map((d) => <div key={d} class="eyebrow px-2 py-1 text-center">{d}</div>)}
        </div>
        <div class="calendar-grid">
          {cells.map((day, i) => {
            const key = day ? `${calendarMonth}-${String(day).padStart(2, "0")}` : `empty-${i}`;
            const posts = day ? calendarData[key] || [] : [];
            return (
              <div key={key} class="min-h-[104px] bg-surface p-1.5">
                {day && <div class="tnum mb-1 px-1 text-[11px] text-muted">{day}</div>}
                <div class="space-y-1">
                  {posts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/compose/${p.id}`)}
                      class="block w-full truncate rounded border border-border bg-surface-sunken px-1.5 py-1 text-left text-[11px] hover:border-ring"
                      title={p.title}
                    >
                      {p.title || p.keyword || "Untitled"}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
