import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement, type FunctionComponent } from "react";
import { ImageResponse } from "next/og";
import { CourseOgCard, OG_SIZE, SiteOgCard } from "./brand";
import { ogSafeText } from "./text";
import { loadOgFonts } from "@/lib/server/og-fonts";

const PNG = [0x89, 0x50, 0x4e, 0x47];

async function render<P extends object>(el: FunctionComponent<P>, props: P) {
  const res = new ImageResponse(createElement(el, props), { ...OG_SIZE, fonts: await loadOgFonts() });
  return new Uint8Array(await res.arrayBuffer());
}

function dims(png: Uint8Array): [number, number] {
  const view = new DataView(png.buffer, png.byteOffset);
  return [view.getUint32(16), view.getUint32(20)];
}

const COURSE = {
  title: "Tarot ",
  titleEm: "iniciático",
  discipline: "Tarot",
  teacherName: "Sol Mayor",
  romanNum: "IV",
};

describe("OG sin red (D4: next/og no sale a Google Fonts en un request)", () => {
  afterEach(() => vi.unstubAllGlobals());

  // next/og decodifica su wasm (yoga) con fetch sobre una URI `data:`: eso no es red y se deja
  // pasar al fetch real. Cualquier otra URL se registra y se rechaza.
  const realFetch = globalThis.fetch;
  function noNetwork() {
    const fetchSpy = vi.fn((input: string | URL | Request) => Promise.reject(new Error(`sin red: ${String(input)}`)));
    vi.stubGlobal("fetch", (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      return url.startsWith("data:") ? realFetch(input, init) : fetchSpy(input);
    });
    return fetchSpy;
  }

  it("la tarjeta de marca rinde PNG 1200x630 sin un solo fetch", async () => {
    const fetchSpy = noNetwork();
    const png = await render(SiteOgCard, {});
    expect([...png.slice(0, 4)]).toEqual(PNG);
    expect(dims(png)).toEqual([1200, 630]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("la tarjeta generativa del curso (sin portada) rinde sin fetch", async () => {
    const fetchSpy = noNetwork();
    const png = await render(CourseOgCard, { course: COURSE, cover: null });
    expect(dims(png)).toEqual([1200, 630]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("la OG usa la familia de la marca (ADR-015): Plus Jakarta Sans, 400 y 700, y nada de Cinzel", async () => {
    const fonts = await loadOgFonts();
    expect(fonts.map((f) => `${f.name}:${f.weight}`)).toEqual(["Plus Jakarta Sans:400", "Plus Jakarta Sans:700"]);
  });

  it("todo lo que ogSafeText deja pasar lo cubre Plus Jakarta Sans: ningun caracter permitido dispara fetch", async () => {
    const fetchSpy = noNetwork();
    let all = "";
    for (let c = 0x20; c <= 0xff; c++) all += String.fromCharCode(c);
    const safe = ogSafeText(all, 1000);
    expect(safe.length).toBeGreaterThan(150);
    const Texto = () =>
      createElement("div", { style: { display: "flex", flexWrap: "wrap", fontFamily: "Plus Jakarta Sans", fontSize: 20 } }, safe);
    await render(Texto, {});
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("control: un glifo como TEXTO si dispara fetch (el test ve la red)", async () => {
    const fetchSpy = noNetwork();
    const Glifo = () => createElement("div", { style: { display: "flex", fontFamily: "Plus Jakarta Sans" } }, "✦");
    await render(Glifo, {}).catch(() => undefined);
    expect(fetchSpy).toHaveBeenCalled();
  });
});
