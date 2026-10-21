"use client";

import { useCallback, useSyncExternalStore } from "react";
import { readAutoplay, writeAutoplay } from "@/lib/player/prefs";

const EVENT = "hd:player-prefs";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Autoplay de la siguiente lección: preferencia de dispositivo; en el servidor siempre `false`. */
export function useAutoplayPref(): [boolean, (on: boolean) => void] {
  const value = useSyncExternalStore(subscribe, () => readAutoplay(), () => false);
  const set = useCallback((on: boolean) => {
    writeAutoplay(on);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [value, set];
}
