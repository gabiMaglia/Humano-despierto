"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import Icon from "@/components/atoms/Icon";
import { buttonClass } from "@/components/atoms/Button";
import { formatDurationSeconds } from "@/lib/utils/format";
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
    <div className="flex min-h-screen flex-col bg-fondo text-tinta">
      {/* Top bar */}
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-linea bg-papel px-4 md:px-6">
        <a
          href={`/cursos/${data.courseSlug}`}
          className="inline-flex min-h-10 min-w-0 items-center gap-2 rounded-md text-sm font-semibold text-bosque hover:text-miel-800 transition-colors"
        >
          <Icon name="arrow-left" />
          <span className="truncate">{data.courseTitle}</span>
        </a>
        {completed && (
          <span className="inline-flex flex-none items-center gap-1.5 rounded-pill bg-salvia-100 px-3 py-1 text-xs font-semibold text-exito">
            <Icon name="check" className="h-3.5 w-3.5" />
            Completada
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* MAIN */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Marco bosque: concentra la mirada en el video. Encima, sólo texto blanco/salvia-100 y foco miel. */}
          <section aria-label="Video de la lección" className="bg-bosque px-0 pb-0 pt-0 md:px-6 md:pt-6">
            {/* 16:9 con tope de 70vh: un `max-h` sobre `aspect-video` deformaba el cuadro. */}
            <div className="relative mx-auto aspect-video w-full max-w-[calc(70vh*16/9)] overflow-hidden md:rounded-md">
              <div id={containerId} className="absolute inset-0 h-full w-full" />
              {!ready && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-semibold text-salvia-100">Cargando video…</span>
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

            {/* Controls */}
            <div className="mx-auto flex w-full max-w-[calc(70vh*16/9)] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 text-white md:px-0 md:py-4">
              <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-white">
                {formatClock(currentTime)} <span className="font-medium text-salvia-100">/ {formatClock(effectiveDuration)}</span>
              </span>
              {/* Scrubber */}
              <div className="relative h-1.5 min-w-24 flex-1 rounded-pill bg-bosque-700">
                <div
                  className="absolute left-0 top-0 h-full rounded-pill bg-miel"
                  style={{ width: `${progressFraction * 100}%` }}
                />
                <div
                  className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bosque bg-miel"
                  style={{ left: `${progressFraction * 100}%` }}
                />
                {/* Chapter marks */}
                {effectiveDuration > 0 &&
                  sortedChapters.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => seekTo(c.startSeconds)}
                      className="absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-pill bg-salvia hover:bg-miel"
                      style={{ left: `${(c.startSeconds / effectiveDuration) * 100}%` }}
                      title={c.label}
                      aria-label={`Ir al capítulo ${c.label}`}
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
                className="min-h-10 rounded-md border border-salvia bg-bosque-700 px-2 text-sm font-semibold tabular-nums text-white"
              >
                {rates.map((r) => (
                  <option key={r} value={r} className="bg-papel text-tinta">
                    {r}×
                  </option>
                ))}
              </select>
              {nextHref && (
                <label className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-white">
                  <input
                    type="checkbox"
                    checked={autoplay}
                    onChange={(e) => setAutoplay(e.target.checked)}
                    className="h-5 w-5 accent-miel"
                  />
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
                  className={buttonClass({ size: "sm" })}
                >
                  Siguiente lección
                  <Icon name="arrow-right" className="btn-arrow" />
                </a>
              )}
            </div>
          </section>

          <div className="border-b border-linea bg-papel px-5 py-6 md:px-8">
            <p className="eyebrow mb-2">
              Módulo {String(data.modulePosition)} · Lección {data.lessonPosition}
            </p>
            <h1 className="text-2xl md:text-3xl">{data.title}</h1>
            {data.description && (
              <p className="mt-3 max-w-[70ch] text-base leading-relaxed text-suave">{data.description}</p>
            )}
          </div>

          {/* Chapters */}
          <section aria-labelledby="capitulos" className="px-5 py-6 md:px-8">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 id="capitulos" className="text-lg">
                Capítulos
              </h2>
              <span className="text-sm text-suave">
                {sortedChapters.length} {sortedChapters.length === 1 ? "sección" : "secciones"}
              </span>
            </div>
            <ul className="space-y-1">
              {sortedChapters.map((c) => {
                const active = c.id === activeChapterId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => seekTo(c.startSeconds)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-4 rounded-md px-3 py-2 text-left transition-colors",
                        active ? "bg-salvia-100" : "hover:bg-salvia-100"
                      )}
                    >
                      <span className="w-12 flex-none text-sm font-semibold tabular-nums text-miel-800">
                        {formatDurationSeconds(c.startSeconds)}
                      </span>
                      <span className={cn("flex-1 text-base", active ? "font-semibold text-bosque" : "text-tinta")}>
                        {c.label}
                      </span>
                      {active && <Icon name="play" className="h-3.5 w-3.5 text-bosque" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            {sortedChapters.length === 0 && <p className="text-sm text-suave">Esta lección no tiene capítulos.</p>}
          </section>
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
