import { X } from "lucide-preact";
import { useApp } from "../context";

export function ErrorBanner() {
  const { error, clearError } = useApp();
  if (!error) return null;
  return (
    <div class="fixed bottom-4 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-start gap-3 rounded-md border border-border bg-surface px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
      <p class="text-[13px] text-danger">{error}</p>
      <button class="btn btn-ghost btn-sm -my-1 -mr-2 px-1.5" onClick={clearError} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
