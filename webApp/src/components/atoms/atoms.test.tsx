import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Avatar from "./Avatar";
import Button, { buttonClass } from "./Button";

describe("D-63 · Avatar sin glifos", () => {
  it("sin foto dibuja iniciales, nunca un símbolo astral", () => {
    const html = renderToStaticMarkup(<Avatar name="Sol Mayor" />);
    expect(html).toContain("SM");
    expect(html).not.toMatch(/[☉☽]/);
  });

  it("sin foto ni nombre dibuja la hoja", () => {
    expect(renderToStaticMarkup(<Avatar name={null} />)).toContain("<svg");
  });
});

describe("D-93 · variante ghost-light", () => {
  it("vive en la clase del botón, no en el className de la pantalla", () => {
    expect(buttonClass({ variant: "ghost-light" })).toContain("btn-ghost-light");
    expect(renderToStaticMarkup(<Button variant="ghost-light">Cancelar</Button>)).toContain("btn-ghost-light");
  });
});
