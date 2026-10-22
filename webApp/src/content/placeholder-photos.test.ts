import { describe, expect, it } from "vitest";
import {
  PLACEHOLDER_PHOTOS,
  placeholderForDiscipline,
  placeholderPortrait,
  unsplashUrl,
} from "./placeholder-photos";

// Los 16 ids verificados a mano en design_handoff_humano_humano/reference/brote/README.md.
const README_IDS = [
  "1441974231531-c6227db76b6e", "1760445529648-9c8af38a0bb3", "1600429991827-5224817554f8",
  "1694144167581-8bc49479f6b7", "1772710333229-97bb734d5d5e", "1519681393784-d120267933ba",
  "1545840716-c82e9eec6930", "1492552181161-62217fc3076d", "1567922045116-2a00fae2ed03",
  "1447619297994-b829cc1ab44a", "1762162623066-89e462b3d8f0", "1470252649378-9c29740c9fa8",
  "1746410848551-ca40cdb57674", "1544005313-94ddf0286df2", "1692801439915-ef9194bf0951",
  "1643224196036-a61f69ff4144",
];

describe("PLACEHOLDER_PHOTOS", () => {
  it("es exactamente la lista verificada del README, sin la foto de somosbuenavida.com", () => {
    expect(PLACEHOLDER_PHOTOS.map((p) => p.id).sort()).toEqual([...README_IDS].sort());
    expect(PLACEHOLDER_PHOTOS.map((p) => p.id)).not.toContain("1469474968028-56623f02e42e");
  });

  it("toda foto describe lo que se ve", () => {
    for (const p of PLACEHOLDER_PHOTOS) expect(p.alt.trim().length).toBeGreaterThan(10);
  });

  it("unsplashUrl arma la URL del host listado en remotePatterns", () => {
    expect(unsplashUrl("1545840716-c82e9eec6930")).toBe("https://images.unsplash.com/photo-1545840716-c82e9eec6930");
  });
});

describe("placeholderForDiscipline", () => {
  it.each([
    ["Tarot", "1600429991827-5224817554f8"],
    ["tarot iniciático", "1600429991827-5224817554f8"],
    ["Astrología", "1519681393784-d120267933ba"],
    ["ASTROLOGIA", "1519681393784-d120267933ba"],
    ["Herbal", "1545840716-c82e9eec6930"],
    ["Herbolaria", "1545840716-c82e9eec6930"],
    ["Reiki", "1447619297994-b829cc1ab44a"],
    ["Magia", "1762162623066-89e462b3d8f0"],
  ])("%s → foto de su oficio", (discipline, id) => {
    expect(placeholderForDiscipline(discipline).id).toBe(id);
  });

  it("una disciplina desconocida o ausente cae en una foto neutra", () => {
    for (const d of ["Numerología", "", null, undefined]) {
      expect(placeholderForDiscipline(d).id).toBe("1567922045116-2a00fae2ed03");
    }
  });
});

describe("placeholderPortrait", () => {
  it("siempre devuelve un retrato y la misma semilla da el mismo", () => {
    const a = placeholderPortrait("sol-mayor");
    expect(a.use).toBe("retrato");
    expect(placeholderPortrait("sol-mayor").id).toBe(a.id);
    const vistos = new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map((s) => placeholderPortrait(s).id));
    expect(vistos.size).toBeGreaterThan(1);
  });
});
