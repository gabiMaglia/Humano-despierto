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

interface YouTubePlaybackRateChangeEvent extends YouTubePlayerEvent {
  data: number;
}

interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getIframe(): HTMLIFrameElement;
  // Fuente: https://developers.google.com/youtube/iframe_api_reference (setPlaybackRate es una
  // sugerencia: el valor real llega por onPlaybackRateChange; las opciones válidas, por
  // getAvailablePlaybackRates, que siempre incluye 1).
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  getAvailablePlaybackRates(): number[];
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
    onPlaybackRateChange?: (event: YouTubePlaybackRateChangeEvent) => void;
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
  /** Velocidad REAL, tomada de onPlaybackRateChange; nunca el valor pedido. */
  playbackRate: number;
  availableRates: number[];
  setPlaybackRate: (rate: number) => void;
  /** El video llegó a PlayerState.ENDED y no se reanudó. */
  ended: boolean;
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
  onProgressTick: (seconds: number, isPlaying: boolean) => void,
  iframeTitle: string,
  // Se lee en onReady: cue/load resetean la tasa a 1, así que la guardada se reaplica ahí.
  getPreferredRate: () => number | null = () => null
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
  const [ended, setEnded] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [availableRates, setAvailableRates] = useState<number[]>([1]);
  const getPreferredRateRef = useRef(getPreferredRate);
  useEffect(() => {
    getPreferredRateRef.current = getPreferredRate;
  });

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
            // X-01 · el <iframe> lo crea la IFrame API, no nuestro JSX, asi que el `title` hay
            // que ponerlo aca: sin el, el contenido PRINCIPAL de la pantalla no tiene nombre
            // accesible y un lector de pantalla anuncia solo "marco".
            event.target.getIframe().setAttribute("title", iframeTitle);
            const d = event.target.getDuration();
            if (d > 0) setDuration(d);
            const rates = event.target.getAvailablePlaybackRates();
            setAvailableRates(rates.length > 0 ? rates : [1]);
            setPlaybackRateState(event.target.getPlaybackRate());
            const preferred = getPreferredRateRef.current();
            if (preferred !== null && rates.includes(preferred)) event.target.setPlaybackRate(preferred);
          },
          onPlaybackRateChange: (event) => {
            if (cancelled) return;
            setPlaybackRateState(event.data);
          },
          onStateChange: (event) => {
            if (cancelled) return;
            const playing = event.data === YT.PlayerState.PLAYING;
            setIsPlaying(playing);
            setEnded(event.data === YT.PlayerState.ENDED);
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

  const setPlaybackRate = useCallback((rate: number) => {
    playerRef.current?.setPlaybackRate(rate);
  }, []);

  return { ready, currentTime, duration, isPlaying, seekTo, playbackRate, availableRates, setPlaybackRate, ended };
}
