"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Superficie mínima de la IFrame Player API que usamos (T-006 c.1/c.4: reproducir de verdad y
// saltar a un segundo). Sin key — la IFrame Player API es pública; la Data API (que sí pide key,
// B-2) es para *consultar* metadata desde el servidor, no para embeber (ver ticket).
interface YouTubePlayerVars {
  start?: number;
  rel?: 0 | 1;
  modestbranding?: 0 | 1;
}

interface YouTubePlayerEvent {
  target: YouTubePlayer;
}

interface YouTubePlayerStateChangeEvent extends YouTubePlayerEvent {
  data: number;
}

interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}

interface YouTubePlayerOptions {
  videoId: string;
  width?: string | number;
  height?: string | number;
  playerVars?: YouTubePlayerVars;
  events?: {
    onReady?: (event: YouTubePlayerEvent) => void;
    onStateChange?: (event: YouTubePlayerStateChangeEvent) => void;
  };
}

interface YouTubeIframeApi {
  Player: new (elementId: string, options: YouTubePlayerOptions) => YouTubePlayer;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT?: YouTubeIframeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeIframeApi> | null = null;

function loadYouTubeIframeApi(): Promise<YouTubeIframeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve(window.YT!);
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return apiPromise;
}

export interface UseYouTubePlayerResult {
  ready: boolean;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  seekTo: (seconds: number) => void;
}

/**
 * Instancia UN player de YouTube sobre el `<div id={containerId}>` del caller y lo mantiene
 * sincronizado. `onProgressTick(seconds, isPlaying)` se llama ~1 vez por segundo mientras
 * reproduce y una vez más al pausar/terminar — el caller decide ahí el throttle de persistencia
 * (T-006 c.5); este hook no persiste nada por sí mismo.
 */
export function useYouTubePlayer(
  containerId: string,
  videoId: string,
  initialStartSeconds: number,
  initialDurationSeconds: number,
  onProgressTick: (seconds: number, isPlaying: boolean) => void
): UseYouTubePlayerResult {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const onProgressTickRef = useRef(onProgressTick);
  useEffect(() => {
    onProgressTickRef.current = onProgressTick;
  });

  const [ready, setReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialStartSeconds);
  const [duration, setDuration] = useState(initialDurationSeconds);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | undefined;

    loadYouTubeIframeApi().then((YT) => {
      if (cancelled) return;

      const player = new YT.Player(containerId, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          start: Math.max(0, Math.floor(initialStartSeconds)),
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return;
            setReady(true);
            const d = event.target.getDuration();
            if (d > 0) setDuration(d);
          },
          onStateChange: (event) => {
            if (cancelled) return;
            const playing = event.data === YT.PlayerState.PLAYING;
            setIsPlaying(playing);
            if (!playing) {
              const t = event.target.getCurrentTime();
              setCurrentTime(t);
              onProgressTickRef.current(t, false);
            }
          },
        },
      });
      playerRef.current = player;

      intervalId = window.setInterval(() => {
        const p = playerRef.current;
        if (!p || p.getPlayerState() !== YT.PlayerState.PLAYING) return;
        const t = p.getCurrentTime();
        setCurrentTime(t);
        const d = p.getDuration();
        if (d > 0) setDuration(d);
        onProgressTickRef.current(t, true);
      }, 1000);
    });

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // containerId/videoId no cambian en la vida de esta página (una lección = un montaje).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId, videoId]);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
    playerRef.current?.playVideo();
  }, []);

  return { ready, currentTime, duration, isPlaying, seekTo };
}
