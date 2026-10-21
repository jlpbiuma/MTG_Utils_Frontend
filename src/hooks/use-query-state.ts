"use client";
import { useCallback, useSyncExternalStore } from "react";

const subscribe = (notify: () => void) => {
  window.addEventListener("popstate", notify);
  window.addEventListener("mtg-query", notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener("mtg-query", notify);
  };
};
const snapshot = () => window.location.search;
const serverSnapshot = () => "";

export function useQueryState<T extends string>(
  key: string,
  fallback: T,
  allowed?: readonly T[],
) {
  const search = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const raw = new URLSearchParams(search).get(key);
  const value =
    raw !== null && (!allowed || allowed.includes(raw as T))
      ? (raw as T)
      : fallback;
  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      const params = new URLSearchParams(window.location.search);
      const previous = (params.get(key) as T) ?? fallback;
      const resolved = typeof next === "function" ? next(previous) : next;
      if (resolved === fallback) params.delete(key);
      else params.set(key, resolved);
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
      );
      window.dispatchEvent(new Event("mtg-query"));
    },
    [key, fallback],
  );
  return [value, setValue] as const;
}

export function useQueryFlag(key: string, fallback: boolean) {
  const [raw, setRaw] = useQueryState<"true" | "false">(
    key,
    fallback ? "true" : "false",
    ["true", "false"],
  );
  const value = raw === "true";
  const setValue = useCallback(
    (next: boolean | ((previous: boolean) => boolean)) =>
      setRaw((previous) =>
        (typeof next === "function" ? next(previous === "true") : next)
          ? "true"
          : "false",
      ),
    [setRaw],
  );
  return [value, setValue] as const;
}
