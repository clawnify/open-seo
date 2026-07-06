import { Check, X } from "lucide-preact";
import { Eyebrow, Phase2Empty, Page } from "./ui";

export function Optimize(_: { navigate: (p: string) => void }) {
  return (
    <Page title="Optimize">
      <div class="card">
        <div class="card-zone pb-0"><Eyebrow>AI improvement suggestions</Eyebrow></div>
        <div class="card-zone pt-2">
          <Phase2Empty
            title="Data-driven rewrite suggestions"
            hint="Once search performance is connected, we'll surface concrete edits — current text, the suggested rewrite, and why — for you to accept or reject per line."
          />
          {/* Designed preview of the intended review layout (inert) */}
          <div class="mt-2 overflow-hidden rounded-md border border-border opacity-60">
            <table class="tbl">
              <thead><tr><th>Current content</th><th>Suggested improvement</th><th>Why</th><th class="w-20"></th></tr></thead>
              <tbody>
                {[0, 1].map((i) => (
                  <tr key={i}>
                    <td><span class="block h-3 w-40 rounded bg-surface-sunken" /></td>
                    <td><span class="block h-3 w-44 rounded bg-surface-sunken" /></td>
                    <td><span class="block h-3 w-28 rounded bg-surface-sunken" /></td>
                    <td class="text-right">
                      <span class="btn btn-secondary btn-sm px-1.5 pointer-events-none"><Check size={13} /></span>
                      <span class="btn btn-secondary btn-sm px-1.5 pointer-events-none"><X size={13} /></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Page>
  );
}
