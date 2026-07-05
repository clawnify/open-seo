import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { useAppState } from "./hooks/use-app";

type AppContextType = ReturnType<typeof useAppState>;

export const AppContext = createContext<AppContextType>(null as any);

export function useApp() {
  return useContext(AppContext);
}
