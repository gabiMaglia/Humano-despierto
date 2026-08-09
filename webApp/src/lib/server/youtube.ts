import "server-only";

// T-005 c.4/c.4b · Extracción de `video_id` + resolución de `duration_seconds` contra la
// API de YouTube Data v3. Server-only por dos razones: usa `YOUTUBE_API_KEY` (sin
// `NEXT_PUBLIC_`, B-2) y es la ÚNICA fuente de verdad para `duration_seconds` — el docente
// pega la URL, nunca declara la duración (decisión del PO 2026-08-06, ver ADR-007 "corregido
// en T-012").

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * Acepta las cuatro formas que pide el criterio 4: `watch?v=`, `youtu.be/`, `/embed/`,
 * y cualquiera de esas con parámetros extra (`&t=30s`, `?si=...`, etc — `URL` los ignora
 * salvo que estén en la posición que se lee). `null` si no matchea ninguna forma conocida
 * o si lo que matchea no tiene la forma exacta de un id de YouTube (11 caracteres
 * `[A-Za-z0-9_-]`, mismo patrón que el `CHECK` de `lessons.video_id` en la DB).
 */
export function extractYoutubeVideoId(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return YOUTUBE_ID_RE.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v") ?? "";
      return YOUTUBE_ID_RE.test(id) ? id : null;
    }
    const embedMatch = url.pathname.match(/^\/embed\/([^/]+)/);
    if (embedMatch) {
      return YOUTUBE_ID_RE.test(embedMatch[1]) ? embedMatch[1] : null;
    }
    const shortsMatch = url.pathname.match(/^\/shorts\/([^/]+)/);
    if (shortsMatch) {
      return YOUTUBE_ID_RE.test(shortsMatch[1]) ? shortsMatch[1] : null;
    }
  }

  return null;
}

function parseIso8601Duration(iso: string): number {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const [, h, mnt, s] = m;
  return Number(h ?? 0) * 3600 + Number(mnt ?? 0) * 60 + Number(s ?? 0);
}

export type YoutubeLookupResult =
  | { ok: true; videoId: string; durationSeconds: number }
  | {
      ok: false;
      code: "invalid_url" | "not_found" | "quota_exceeded" | "zero_duration" | "api_error";
      message: string;
    };

/**
 * Resuelve una URL de YouTube pegada por el docente a `(video_id, duration_seconds)`,
 * o a un error explícito — c.4b pide manejar cada uno sin dejarlo reventar:
 *   · `invalid_url`    — no matchea ninguna forma conocida, o el fragmento no es un id válido.
 *   · `not_found`      — video privado, borrado o inexistente. La API pública (sin OAuth del
 *                         dueño) devuelve `items: []` para los tres casos por igual; no hay
 *                         forma de distinguirlos desde acá, así que el mensaje cubre los tres.
 *   · `quota_exceeded` — 10.000 u/día, esta llamada cuesta 1 (verificado por el PO) — igual
 *                         puede agotarse por otro consumidor de la misma key.
 *   · `zero_duration`  — un live sin grabación cerrada da `contentDetails.duration = "P0D"`
 *                         (0 segundos). Con duración 0 ninguna lección se puede completar
 *                         nunca (ADR-007) y el `CHECK lessons_published_needs_video` ni
 *                         siquiera deja publicarla — se bloquea acá, antes de guardar nada.
 *   · `api_error`      — falta la key, la red falló, o la API devolvió algo inesperado.
 */
export async function resolveYoutubeVideo(rawUrl: string): Promise<YoutubeLookupResult> {
  const videoId = extractYoutubeVideoId(rawUrl);
  if (!videoId) {
    return {
      ok: false,
      code: "invalid_url",
      message:
        "Ese link no es una URL de YouTube reconocible. Usá el link de \"Compartir\" (youtu.be/…) o la barra del navegador (youtube.com/watch?v=…).",
    };
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      code: "api_error",
      message: "Falta configurar YOUTUBE_API_KEY en el servidor. Avisá al equipo técnico.",
    };
  }

  const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
  endpoint.searchParams.set("part", "contentDetails,status");
  endpoint.searchParams.set("id", videoId);
  endpoint.searchParams.set("key", apiKey);

  let res: Response;
  try {
    res = await fetch(endpoint, { cache: "no-store" });
  } catch {
    return {
      ok: false,
      code: "api_error",
      message: "No se pudo contactar a la API de YouTube. Probá de nuevo en un momento.",
    };
  }

  if (res.status === 403) {
    let reason: string | undefined;
    try {
      const body = await res.json();
      reason = body?.error?.errors?.[0]?.reason;
    } catch {
      // sin body legible — se trata igual como cuota/permiso, mensaje genérico abajo.
    }
    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded" || reason === "rateLimitExceeded") {
      return {
        ok: false,
        code: "quota_exceeded",
        message: "Se agotó la cuota diaria de la API de YouTube. La lección no se guardó — probá de nuevo más tarde.",
      };
    }
    return {
      ok: false,
      code: "api_error",
      message: `YouTube rechazó la consulta (${reason ?? "sin motivo"}).`,
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      code: "api_error",
      message: `La API de YouTube devolvió un error inesperado (${res.status}).`,
    };
  }

  let data: { items?: Array<{ contentDetails?: { duration?: string } }> };
  try {
    data = await res.json();
  } catch {
    return { ok: false, code: "api_error", message: "La respuesta de YouTube no se pudo leer." };
  }

  const item = data.items?.[0];
  if (!item) {
    return {
      ok: false,
      code: "not_found",
      message: "Ese video no existe, es privado o fue borrado. No se puede cargar.",
    };
  }

  const durationSeconds = parseIso8601Duration(item.contentDetails?.duration ?? "");
  if (durationSeconds <= 0) {
    return {
      ok: false,
      code: "zero_duration",
      message:
        "YouTube no reporta una duración para este video (¿es una transmisión en vivo sin grabación cerrada?). No se puede cargar: con 0 segundos ninguna alumna podría completar la lección nunca.",
    };
  }

  return { ok: true, videoId, durationSeconds };
}
