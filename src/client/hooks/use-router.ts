import { useState, useEffect, useCallback } from "preact/hooks";
import type { View } from "../types";

interface RouterState {
  view: View;
  editId: number | null;
}

function parseLocation(): RouterState {
  const path = window.location.pathname;
  if (path === "/pipeline") return { view: "pipeline", editId: null };
  if (path === "/calendar") return { view: "calendar", editId: null };
  if (path === "/plans") return { view: "plans", editId: null };
  if (path === "/compose") return { view: "compose", editId: null };
  if (path.startsWith("/compose/")) {
    const id = Number(path.split("/")[2]);
    return { view: "compose", editId: isNaN(id) ? null : id };
  }
  return { view: "dashboard", editId: null };
}

export function useRouter() {
  const [state, setState] = useState<RouterState>(parseLocation);

  useEffect(() => {
    const onPop = () => setState(parseLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState(null, "", path);
    setState(parseLocation());
  }, []);

  return { view: state.view, editId: state.editId, navigate };
}
