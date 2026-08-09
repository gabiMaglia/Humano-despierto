"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { formatDurationSeconds } from "@/lib/utils/format";
import { toRoman } from "@/lib/utils/roman";
import { useYouTubePlayer } from "@/components/player/useYouTubePlayer";
import { saveLessonProgress, saveLessonNote } from "@/app/(app)/leccion/[id]/actions";
import type { LessonPlayerData, PlayerLessonState, PlayerNote } from "@/lib/server/lesson-player";

const STATE_ICON: Record<PlayerLessonState, string> = {
  done: "✓",
  current: "▶",
  pending: "○",
  preview: "✦",
  locked: "⌗",
};

const STATE_ICON_CLASS: Record<PlayerLessonState, string> = {
  done: "text-lila-300",
  current: "text-gold-400",
  pending: "text-ink-faint",
  preview: "text-gold-400",
  locked: "text-ink-faint",
};

// Throttle de persistencia de progreso (T-006 c.5): el player tickea cada 1s, pero sólo se
// escribe a `lesson_progress` como máximo cada THROTTLE_MS — salvo al pausar/terminar/ocultar
// la pestaña, donde se fuerza el flush para no perder el último tramo visto.
const THROTTLE_MS = 5000;

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  data: LessonPlayerData;
}

export default function LessonPlayer({ data }: Props) {
  const [tab, setTab] = useState<"modulos" | "notas" | "recursos">("notas");
  const [completed, setCompleted] = useState(data.completed);
  const [notes, setNotes] = useState<PlayerNote[]>(data.notes);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const containerId = `yt-player-${data.lessonId}`;

  // Estado de progreso vive en refs: se lee/actualiza desde el tick del player (cada 1s) sin
  // recrear el callback ni disparar renders extra — sólo `completed` importa para la UI.
  const completedRef = useRef(completed);
  useEffect(() => {
    completedRef.current = completed;
  }, [completed]);
  const maxSecondsRef = useRef(data.initialSecondsWatched);
  const lastSavedRef = useRef(data.initialSecondsWatched);
  const lastSaveAtRef = useRef(0);
  const savingRef = useRef(false);

  const flushProgress = useCallback(
    async (force: boolean) => {
      if (completedRef.current) return;
      const seconds = Math.floor(maxSecondsRef.current);
      if (seconds <= lastSavedRef.current) return;
      const now = Date.now();
      if (!force && now - lastSaveAtRef.current < THROTTLE_MS) return;
      if (savingRef.current) return;

      savingRef.current = true;
      lastSaveAtRef.current = now;
      try {
        const result = await saveLessonProgress(data.lessonId, seconds);
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
    },
    [data.lessonId]
  );

  const handleProgressTick = useCallback(
    (seconds: number, isPlaying: boolean) => {
      if (seconds > maxSecondsRef.current) maxSecondsRef.current = seconds;
      void flushProgress(!isPlaying);
    },
    [flushProgress]
  );

  const { ready, currentTime, duration, seekTo } = useYouTubePlayer(
    containerId,
    data.videoId,
    completed ? 0 : data.initialSecondsWatched,
    data.durationSeconds,
    handleProgressTick
  );

  // Flush al ocultar la pestaña / desmontar — el intervalo de 1s no corre confiablemente en
  // background y el cierre de pestaña no espera al próximo tick.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") void flushProgress(true);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      void flushProgress(true);
    };
  }, [flushProgress]);

  const effectiveDuration = duration > 0 ? duration : data.durationSeconds;
  const progressFraction = effectiveDuration > 0 ? Math.min(1, currentTime / effectiveDuration) : 0;

  const sortedChapters = useMemo(
    () => [...data.chapters].sort((a, b) => a.startSeconds - b.startSeconds),
    [data.chapters]
  );
  const activeChapterId = useMemo(() => {
    let active: string | null = null;
    for (const c of sortedChapters) {
      if (c.startSeconds <= currentTime) active = c.id;
    }
    return active;
  }, [sortedChapters, currentTime]);

  async function handleSaveNote() {
    const body = noteDraft.trim();
    if (!body) return;
    setSavingNote(true);
    setNoteError(null);
    try {
      const note = await saveLessonNote(data.lessonId, currentTime, body);
      setNotes((prev) => [...prev, note].sort((a, b) => a.atSeconds - b.atSeconds));
      setNoteDraft("");
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "No se pudo guardar la nota.");
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-cosmos-0 text-ink">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 border-b border-lila-300/18 bg-cosmos-surface px-5 py-3">
        <a
          href={`/cursos/${data.courseSlug}`}
          className="font-display text-eyebrow tracking-cosmic text-ink-soft hover:text-lila-300 transition-colors whitespace-nowrap"
        >
          ← {data.courseTitle}
        </a>
        <div className="hidden sm:flex items-center gap-2 font-display text-eyebrow tracking-cosmic text-ink-faint">
          <span>Módulo {toRoman(data.modulePosition)}</span>
          <span className="text-lila-300/30">·</span>
          <span className="text-lila-300">Lección {data.lessonPosition}</span>
          {completed && (
            <>
              <span className="text-lila-300/30">·</span>
              <span className="text-gold-400">✓ Completada</span>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* MAIN */}
        <main className="flex-1 flex flex-col min-w-0 overflow-auto">
          {/* Video stage — embed real de la IFrame Player API (T-006 c.1) */}
          <div className="relative aspect-video max-h-[55vh] bg-cosmos-1 overflow-hidden">
            <div id={containerId} className="absolute inset-0 h-full w-full" />
            {!ready && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="font-display text-eyebrow tracking-cosmic text-ink-faint">
                  Cargando video…
                </span>
              </div>
            )}
          </div>

          <div className="border-b border-lila-300/18 bg-cosmos-surface px-5 py-4">
            <h1 className="font-display text-xl tracking-wide text-ink mb-1">{data.title}</h1>
            {data.description && (
              <p className="font-body text-sm text-ink-soft leading-relaxed">{data.description}</p>
            )}
          </div>

          {/* Controls */}
          <div className="border-b border-lila-300/18 bg-cosmos-surface px-5 py-3 flex items-center gap-4">
            <span className="font-display text-sm text-ink whitespace-nowrap">
              {formatClock(currentTime)} <span className="text-ink-faint">/ {formatClock(effectiveDuration)}</span>
            </span>
            {/* Scrubber */}
            <div className="relative flex-1 h-1.5 rounded-full bg-lila-300/18">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gold-400"
                style={{ width: `${progressFraction * 100}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-gold-400 border-2 border-cosmos-0"
                style={{ left: `${progressFraction * 100}%` }}
              />
              {/* Chapter marks */}
              {effectiveDuration > 0 &&
                sortedChapters.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => seekTo(c.startSeconds)}
                    className="absolute top-1/2 -translate-y-1/2 h-2 w-0.5 bg-lila-300/40 hover:bg-gold-400"
                    style={{ left: `${(c.startSeconds / effectiveDuration) * 100}%` }}
                    title={c.label}
                  />
                ))}
            </div>
            <span className="font-display text-eyebrow tracking-cosmic text-ink-faint">1.0×</span>
          </div>

          {/* Chapters */}
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-sm tracking-wide text-ink">Capítulos</h3>
              <span className="font-display text-eyebrow tracking-cosmic text-ink-faint">
                {sortedChapters.length} {sortedChapters.length === 1 ? "SECCIÓN" : "SECCIONES"}
              </span>
            </div>
            <div className="space-y-1">
              {sortedChapters.map((c) => {
                const active = c.id === activeChapterId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => seekTo(c.startSeconds)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-ritual px-3 py-2 text-left transition-colors",
                      active ? "bg-lila-300/10 border border-lila-300/20" : "hover:bg-cosmos-surface"
                    )}
                  >
                    <span className="font-display text-eyebrow tracking-cosmic text-ink-faint w-10 flex-none">
                      {formatDurationSeconds(c.startSeconds)}
                    </span>
                    <span className={cn("font-body text-sm flex-1", active ? "text-lila-300" : "text-ink-soft")}>
                      {c.label}
                    </span>
                    <span className={cn("font-display text-xs", active ? "text-gold-400" : "text-ink-faint")}>▸</span>
                  </button>
                );
              })}
              {sortedChapters.length === 0 && (
                <p className="font-body text-xs italic text-ink-faint">Esta lección no tiene capítulos.</p>
              )}
            </div>
          </div>
        </main>

        {/* SIDE tabs */}
        <aside className="w-72 flex-none border-l border-lila-300/18 flex-col hidden md:flex">
          <div className="flex border-b border-lila-300/18">
            {(["modulos", "notas", "recursos"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-3 font-display text-eyebrow tracking-cosmic capitalize transition-colors",
                  tab === t ? "text-lila-300 border-b-2 border-lila-300" : "text-ink-faint hover:text-ink-soft"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {tab === "modulos" && (
              <div className="space-y-2">
                {data.modules.map((m) => (
                  <div
                    key={m.position}
                    className={cn(
                      "rounded-ritual border p-3",
                      m.lessons.some((l) => l.state === "current")
                        ? "border-lila-300/40 bg-lila-300/[0.05]"
                        : "border-lila-300/18"
                    )}
                  >
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="font-display text-sm text-lila-300 w-5">{toRoman(m.position)}</span>
                      <span className="flex-1 font-display text-[11px] tracking-wide text-ink">{m.title}</span>
                    </div>
                    {m.lessons.length > 0 && (
                      <div className="ml-7 mt-2 space-y-1">
                        {m.lessons.map((l) => (
                          <a
                            key={l.id}
                            href={l.state === "locked" ? undefined : `/leccion/${l.id}`}
                            aria-disabled={l.state === "locked"}
                            className={cn(
                              "flex items-center gap-2 py-1.5 rounded px-2",
                              l.state === "current" && "bg-gold-400/10 border border-gold-400/20",
                              l.state === "locked" && "pointer-events-none opacity-60"
                            )}
                          >
                            <span className={cn("font-display text-[9px]", STATE_ICON_CLASS[l.state])}>
                              {STATE_ICON[l.state]}
                            </span>
                            <span className="font-display text-[9px] text-ink-faint w-4">{l.position}</span>
                            <span
                              className={cn(
                                "flex-1 font-body text-[11px] truncate",
                                l.state === "current" ? "text-gold-400" : "text-ink-soft"
                              )}
                            >
                              {l.title}
                            </span>
                            <span className="font-display text-[9px] text-ink-faint">
                              {formatDurationSeconds(l.durationSeconds)}
                            </span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === "notas" && (
              <div>
                <div className="mb-4 rounded-ritual border border-lila-300/20 bg-cosmos-surface p-3">
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Anotá un momento, un símbolo, una sospecha..."
                    rows={3}
                    className="w-full bg-transparent font-body text-sm text-ink placeholder:text-ink-faint outline-none resize-none"
                  />
                  <div className="flex items-center justify-between border-t border-lila-300/10 pt-2 mt-2">
                    <span className="font-display text-eyebrow tracking-cosmic text-ink-faint">
                      ⌘ {formatClock(currentTime)}
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveNote}
                      disabled={savingNote || !noteDraft.trim()}
                      className="font-display text-eyebrow tracking-cosmic text-lila-300 hover:text-gold-400 transition-colors disabled:opacity-40 disabled:hover:text-lila-300"
                    >
                      {savingNote ? "Guardando…" : "Guardar"}
                    </button>
                  </div>
                  {noteError && <p className="mt-2 font-body text-xs text-red-400">{noteError}</p>}
                </div>
                <div className="space-y-3">
                  {notes.map((n) => (
                    <div key={n.id} className="border-l-2 border-lila-300/30 pl-3">
                      <span className="block font-display text-eyebrow tracking-cosmic text-gold-400 mb-1">
                        {formatClock(n.atSeconds)}
                      </span>
                      <p className="font-body text-xs text-ink-soft leading-relaxed">{n.body}</p>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <p className="font-body text-xs italic text-ink-faint">Todavía no tenés notas en esta lección.</p>
                  )}
                </div>
              </div>
            )}

            {tab === "recursos" && (
              <div className="space-y-3">
                {data.resources.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 cosmos-card p-3">
                    <span className="flex-none font-display text-eyebrow tracking-cosmic text-gold-400 border border-gold-400/40 rounded px-1.5 py-0.5 uppercase">
                      {r.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-xs text-ink leading-snug">{r.name}</p>
                      {r.sizeLabel && (
                        <p className="font-display text-eyebrow tracking-cosmic text-ink-faint">{r.sizeLabel}</p>
                      )}
                    </div>
                  </div>
                ))}
                {data.resources.length === 0 && (
                  <p className="font-body text-xs italic text-ink-faint">Esta lección no tiene recursos.</p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
