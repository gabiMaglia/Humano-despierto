"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveLessonProgress } from "@/app/leccion/[id]/actions";

// Throttle de persistencia de progreso (T-006 c.5): el player tickea cada 1s, pero sólo se
// escribe a `lesson_progress` como máximo cada THROTTLE_MS — salvo al pausar/terminar/ocultar
// la pestaña, donde se fuerza el flush para no perder el último tramo visto.
const THROTTLE_MS = 5000;

interface Options {
  lessonId: string;
  isAuthenticated: boolean;
  initialSecondsWatched: number;
  initialCompleted: boolean;
}

export interface LessonProgress {
  completed: boolean;
  onTick: (seconds: number, isPlaying: boolean) => void;
  /** Resuelve cuando el último tramo visto ya está guardado; hay que esperarlo antes de navegar. */
  settle: () => Promise<void>;
}

export function useLessonProgress({
  lessonId,
  isAuthenticated,
  initialSecondsWatched,
  initialCompleted,
}: Options): LessonProgress {
  const [completed, setCompleted] = useState(initialCompleted);

  // Estado de progreso vive en refs: se lee/actualiza desde el tick del player (cada 1s) sin
  // recrear el callback ni disparar renders extra — sólo `completed` importa para la UI.
  const completedRef = useRef(completed);
  useEffect(() => {
    completedRef.current = completed;
  }, [completed]);
  const maxSecondsRef = useRef(initialSecondsWatched);
  const lastSavedRef = useRef(initialSecondsWatched);
  const lastSaveAtRef = useRef(0);
  const savingRef = useRef(false);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const flush = useCallback(
    async (force: boolean) => {
      // T-006 (rechazo 1): un anónimo puede estar acá viendo una lección `is_preview`
      // (ADR-003). `lesson_progress` exige sesión — sin esto, cada tick intenta persistir y
      // falla contra el server action, en vez de simplemente no aplicar (no hay progreso propio
      // que guardar sin usuario).
      if (!isAuthenticated) return;
      if (completedRef.current) return;
      const seconds = Math.floor(maxSecondsRef.current);
      if (seconds <= lastSavedRef.current) return;
      const now = Date.now();
      if (!force && now - lastSaveAtRef.current < THROTTLE_MS) return;
      if (savingRef.current) return;

      savingRef.current = true;
      lastSaveAtRef.current = now;
      const run = (async () => {
        try {
          const result = await saveLessonProgress(lessonId, seconds);
          lastSavedRef.current = result.secondsWatched;
          if (result.completed && !completedRef.current) {
            completedRef.current = true;
            setCompleted(true);
          }
        } catch (error) {
          console.error("No se pudo guardar el progreso de la lección:", error);
        } finally {
          savingRef.current = false;
        }
      })();
      inFlightRef.current = run;
      await run;
    },
    [lessonId, isAuthenticated]
  );

  const onTick = useCallback(
    (seconds: number, isPlaying: boolean) => {
      if (seconds > maxSecondsRef.current) maxSecondsRef.current = seconds;
      void flush(!isPlaying);
    },
    [flush]
  );

  // Un guardado en vuelo puede llevar menos segundos que los últimos vistos: se espera, se
  // fuerza uno más con el máximo actual y se espera también ese. Sin esto, navegar justo al
  // terminar pierde el tramo que cruza el 90 %.
  const settle = useCallback(async () => {
    await inFlightRef.current;
    await flush(true);
    await inFlightRef.current;
  }, [flush]);

  // Flush al ocultar la pestaña / desmontar — el intervalo de 1s no corre confiablemente en
  // background y el cierre de pestaña no espera al próximo tick.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") void flush(true);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      void flush(true);
    };
  }, [flush]);

  return { completed, onTick, settle };
}
