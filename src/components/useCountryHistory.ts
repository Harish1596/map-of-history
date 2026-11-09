"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Map as LibreMap, GeoJSONSource } from "maplibre-gl";
import { countrySnapshot, parseCountryHistory, type CountryHistory, type CountrySnapshot } from "@/data/country-history";

export function useCountryHistory(
  mapRef: RefObject<LibreMap | null>,
  presentRef: RefObject<CountrySnapshot | null>,
  ready: boolean,
) {
  const [year, setYear] = useState<number | null>(null);
  const [requestedYear, setRequestedYear] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const cache = useRef<CountryHistory | null>(null);
  const request = useRef<Promise<CountryHistory> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const displayedYear = useRef<number | null>(null);
  const idleListener = useRef<(() => void) | null>(null);

  const selectYear = useCallback(async (nextYear: number | null) => {
    const map = mapRef.current;
    if (!ready || !map || !presentRef.current) return;
    const ticket = ++sequence.current;
    if (idleListener.current) map.off("idle", idleListener.current);
    setRequestedYear(nextYear);
    setState("loading");
    try {
      let snapshot = presentRef.current;
      if (nextYear !== null) {
        if (!cache.current) {
          if (!request.current) {
            const abort = new AbortController();
            controller.current = abort;
            const timeout = window.setTimeout(() => abort.abort(), 25_000);
            request.current = fetch("/data/world/history/countries.json", { signal: abort.signal })
              .then((response) => {
                if (!response.ok) throw new Error("Historical countries could not load");
                return response.json();
              })
              .then(parseCountryHistory)
              .then((data) => { cache.current = data; return data; })
              .finally(() => { window.clearTimeout(timeout); request.current = null; });
          }
          await request.current;
        }
        snapshot = countrySnapshot(cache.current!, nextYear);
      }
      if (ticket !== sequence.current || map !== mapRef.current) return;
      (map.getSource("political-countries") as GeoJSONSource).setData(snapshot.countries);
      (map.getSource("labels") as GeoJSONSource).setData(snapshot.labels);
      const finish = () => {
        if (ticket !== sequence.current || map !== mapRef.current) return;
        displayedYear.current = nextYear;
        setYear(nextYear);
        setState("idle");
        idleListener.current = null;
      };
      idleListener.current = finish;
      map.once("idle", finish);
      map.triggerRepaint();
    } catch {
      if (ticket === sequence.current && map === mapRef.current) setState("error");
    }
  }, [mapRef, presentRef, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const invalidate = () => { sequence.current++; };
    // Reapply even Present day: a first historical request may have been
    // interrupted by a map error before any historical year was displayed.
    if (ready) void selectYear(displayedYear.current);
    return () => {
      invalidate();
      if (idleListener.current && map) map.off("idle", idleListener.current);
      idleListener.current = null;
    };
  }, [ready, selectYear, mapRef]);

  useEffect(() => () => { controller.current?.abort(); }, []);

  return { year, requestedYear, state, selectYear };
}
