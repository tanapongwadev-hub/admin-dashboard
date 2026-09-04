"use client";

import * as React from "react";

export type ViewMode = "table" | "card";

// `storage` events only fire in *other* tabs, not the one that wrote the
// value — dispatch one manually so same-tab updates also notify subscribers.
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

// Persists a table/card view preference to localStorage, namespaced by
// `key` so multiple lists (this page or others) don't collide — pass a
// stable per-list identifier, e.g. "materials-pc".
//
// Reads localStorage via useSyncExternalStore rather than useState+useEffect
// — the React-recommended way to read external mutable state without a
// setState-in-effect (which this project's lint config flags as an error;
// see the sidebar's activeChainIds for the same "derive, don't effect"
// principle applied elsewhere). The server snapshot is always
// `defaultValue`, so SSR/first-paint markup matches; React itself handles
// re-reading the real value after hydration, no manual effect needed.
export function useViewMode(key: string, defaultValue: ViewMode = "table") {
  const storageKey = `view-mode:${key}`;

  const getSnapshot = React.useCallback((): ViewMode => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored === "table" || stored === "card" ? stored : defaultValue;
    } catch {
      return defaultValue;
    }
  }, [storageKey, defaultValue]);

  const getServerSnapshot = React.useCallback((): ViewMode => defaultValue, [defaultValue]);

  const view = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setView = React.useCallback(
    (next: ViewMode) => {
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // Preference just won't persist this session.
      }
      window.dispatchEvent(new StorageEvent("storage"));
    },
    [storageKey]
  );

  return [view, setView] as const;
}
