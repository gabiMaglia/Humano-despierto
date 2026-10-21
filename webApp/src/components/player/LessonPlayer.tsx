"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { formatDurationSeconds } from "@/lib/utils/format";
import { toRoman } from "@/lib/utils/roman";
import { readRate, writeRate } from "@/lib/player/prefs";
import { anonymousClosingHref } from "@/lib/player/navigation";
import { useYouTubePlayer } from "@/components/player/useYouTubePlayer";
import { useLessonProgress } from "@/components/player/useLessonProgress";
import { useLessonNotes } from "@/components/player/useLessonNotes";
import { useAutoplayPref } from "@/components/player/useAutoplayPref";
import { formatClock } from "@/components/player/formatClock";
import PlayerTabs from "@/components/player/PlayerTabs";
import CurriculumTab from "@/components/player/CurriculumTab";
import NotesTab from "@/components/player/NotesTab";
import ResourcesTab from "@/components/player/ResourcesTab";
import LessonQA from "@/components/player/qa/LessonQA";
import EndCard from "@/components/player/EndCard";
import { resolveClosingHref } from "@/app/leccion/[id]/actions";
import type { LessonPlayerData } from "@/lib/server/lesson-player";

const AUTOPLAY_SECONDS = 5;

interface Props {
  data: LessonPlayerData;
  /** `?t=` ya validado por la página; gana sobre el progreso guardado. */
  startSeconds?: number | null;
}

export default function LessonPlayer({ data, startSeconds = null }: Props) {
  const router = useRouter();
  const containerId = `yt-player-${data.lessonId}`;

  const progress = useLessonProgress({
    lessonId: data.lessonId,
    canTrackProgress: data.canTrackProgress,
    initialSecondsWatched: data.initialSecondsWatched,
    initialCompleted: data.completed,
  });
  const { completed } = progress;

  const notesApi = useLessonNotes(data.lessonId, data.notes);
  const [autoplay, setAutoplay] = useAutoplayPref();

  const { ready, currentTime, duration, seekTo, playbackRate, availableRates, setPlaybackRate, ended } =
    useYouTubePlayer(
      containerId,
      data.videoId,
      startSeconds ?? (completed ? 0 : data.initialSecondsWatched),
      data.durationSeconds,
      progress.onTick,
      data.title,
      readRate
    );

  const next = data.nextLesson;
  const nextHref = next ? `/leccion/${next.id}` : null;

  async function goTo(href: string) {
    await progress.settle();
    router.push(href);
  }

  // Al terminar: primero se espera el flush del último tramo (el que cruza el 90 %), recién
  // después se decide el destino. Navegar antes pierde ese tramo y el certificado no aparece.
  const [closing, setClosing] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  useEffect(() => {
    if (!ended) return;
    let live = true;
    (async () => {
      await progress.settle();
      if (!live) return;
      if (nextHref) {
        if (autoplay) setCountdown(AUTOPLAY_SECONDS);
      } else {
        const href = data.isAuthenticated
          ? await resolveClosingHref(data.courseId)
          : anonymousClosingHref(data.courseSlug);
        if (live) setClosing(href);
      }
    })();
    return () => {
      live = false;
      setCountdown(null);
      setClosing(null);
    };
    // Sólo reacciona al fin del video; autoplay se lee al momento de terminar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended]);

  useEffect(() => {
    if (countdown === null || !nextHref) return;
    if (countdown === 0) {
      void goTo(nextHref);
      return;
    }
    const id = window.setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, nextHref]);

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

  const rates = availableRates.includes(playbackRate)
    ? availableRates
    : [...availableRates, playbackRate].sort((a, b) => a - b);

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

      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
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
            {ended && (
              <EndCard
                next={next}
                closingHref={closing}
                countdown={countdown}
                onCancel={() => setCountdown(null)}
                onGo={goTo}
              />
            )}
          </div>

          <div className="border-b border-lila-300/18 bg-cosmos-surface px-5 py-4">
            <h1 className="font-display text-xl tracking-wide text-ink mb-1">{data.title}</h1>
            {data.description && (
              <p className="font-body text-sm text-ink-soft leading-relaxed">{data.description}</p>
            )}
          </div>

          {/* Controls */}
          <div className="border-b border-lila-300/18 bg-cosmos-surface px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-display text-sm text-ink whitespace-nowrap">
              {formatClock(currentTime)} <span className="text-ink-faint">/ {formatClock(effectiveDuration)}</span>
            </span>
            {/* Scrubber */}
            <div className="relative flex-1 min-w-24 h-1.5 rounded-full bg-lila-300/18">
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
            {/* Se muestra la velocidad REAL (onPlaybackRateChange), no la pedida. */}
            <select
              aria-label="Velocidad de reproducción"
              value={playbackRate}
              onChange={(e) => {
                const rate = Number(e.target.value);
                setPlaybackRate(rate);
                writeRate(rate);
              }}
              className="bg-cosmos-surface border border-lila-300/20 rounded px-1 py-0.5 font-display text-eyebrow tracking-cosmic text-ink-faint"
            >
              {rates.map((r) => (
                <option key={r} value={r}>
                  {r}×
                </option>
              ))}
            </select>
            {nextHref && (
              <label className="flex items-center gap-1.5 font-display text-eyebrow tracking-cosmic text-ink-faint">
                <input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} />
                Autoplay
              </label>
            )}
            {nextHref && (
              <a
                href={nextHref}
                onClick={(e) => {
                  e.preventDefault();
                  void goTo(nextHref);
                }}
                className="font-display text-eyebrow tracking-cosmic text-lila-300 hover:text-gold-400 transition-colors whitespace-nowrap"
              >
                Siguiente lección →
              </a>
            )}
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

        <PlayerTabs
          label="Contenido de la lección"
          initialTabId="notas"
          tabs={[
            {
              id: "modulos",
              label: "Currículum",
              panel: <CurriculumTab modules={data.modules} currentCompleted={completed} />,
            },
            {
              id: "notas",
              label: "Notas",
              panel: (
                <NotesTab
                  isAuthenticated={data.isAuthenticated}
                  canTakeNotes={data.canTrackProgress}
                  currentTime={currentTime}
                  api={notesApi}
                />
              ),
            },
            { id: "recursos", label: "Recursos", panel: <ResourcesTab resources={data.resources} /> },
            { id: "preguntas", label: "Preguntas", panel: <LessonQA lessonId={data.lessonId} data={data.qa} /> },
          ]}
        />
      </div>
    </div>
  );
}
