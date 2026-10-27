import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Hero from "./Hero";

describe("D-106 · portada", () => {
  it("tiene exactamente un h1, para lectores de pantalla", () => {
    const html = renderToStaticMarkup(<Hero quote={{ text: "Una frase.", guide: null }} />);
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).toMatch(/<h1 class="sr-only">Humano Despierto/);
  });
});
