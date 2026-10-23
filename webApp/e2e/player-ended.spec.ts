import type { Page } from "@playwright/test";

// T-045 c.1-c.3 + D-32 · fin de video simulado: se engancha el YT.Player real y se dispara
// onStateChange(ENDED), porque el navegador de test no reproduce el video hasta el final.
import { expect, test, ALUMNA, DELFINA, lessonHrefs, login } from "./fixtures";

const HOOK = `(() => {
  let appCb;
  Object.defineProperty(window, "onYouTubeIframeAPIReady", {
    configurable: true,
    set(fn) { appCb = fn; },
    get() { if (!appCb) return undefined; return () => {
      const Orig = window.YT.Player;
      if (!Orig.__qa) {
        const W = function (id, opts) { const p = new Orig(id, opts); window.__qa = { p, opts }; return p; };
        W.__qa = true; window.YT.Player = W;
      }
      appCb && appCb();
    }; },
  });
})();`;

async function setup(page: Page, autoplay: boolean) {
  await page.addInitScript(HOOK);
  await page.addInitScript(`try{localStorage.setItem("hd.player.autoplay","${autoplay ? "1" : "0"}")}catch{}`);
}
interface QaHook {
  opts: { events: { onStateChange: (e: { data: number; target: unknown }) => void } };
  p: unknown;
}

async function fireEnded(page: Page) {
  await page.waitForFunction(() => (window as unknown as { __qa?: QaHook }).__qa && document.querySelectorAll('select[aria-label="Velocidad de reproducción"] option').length > 1);
  await page.evaluate(() => { const q = (window as unknown as { __qa: QaHook }).__qa; q.opts.events.onStateChange({ data: 0, target: q.p }); });
}

test("c.3 autoplay ON: cuenta regresiva y navega a la siguiente", async ({ page }) => {
  await setup(page, true);
  await login(page, ALUMNA);
  const hrefs = await lessonHrefs(page, ALUMNA.enrolledSlug);
  await page.goto(hrefs[0]);
  await fireEnded(page);
  await expect(page.getByText(/Siguiente lección en \d s/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancelar" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Siguiente: .+$/ })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${hrefs[1]}$`), { timeout: 15_000 });
});

test("c.3 autoplay ON + Cancelar: no navega", async ({ page }) => {
  await setup(page, true);
  await login(page, ALUMNA);
  const hrefs = await lessonHrefs(page, ALUMNA.enrolledSlug);
  await page.goto(hrefs[0]);
  await fireEnded(page);
  await page.getByRole("button", { name: "Cancelar" }).click();
  await page.waitForTimeout(8000);
  await expect(page).toHaveURL(new RegExp(`${hrefs[0]}$`));
  await expect(page.getByRole("link", { name: /^Siguiente: / })).toBeVisible();
});

test("c.3 autoplay OFF (default): no navega sola; c.1 tarjeta Siguiente", async ({ page }) => {
  await page.addInitScript(HOOK);
  await login(page, ALUMNA);
  const hrefs = await lessonHrefs(page, ALUMNA.enrolledSlug);
  await page.goto(hrefs[0]);
  await fireEnded(page);
  const link = page.getByRole("link", { name: /^Siguiente: .+$/ });
  await expect(link).toHaveAttribute("href", hrefs[1]);
  await page.waitForTimeout(8000);
  await expect(page).toHaveURL(new RegExp(`${hrefs[0]}$`));
  await expect(page.getByText(/Siguiente lección en/)).toHaveCount(0);
});

test("c.2 ultima leccion, curso incompleto -> /panel", async ({ page }) => {
  await page.addInitScript(HOOK);
  await login(page, ALUMNA);
  const hrefs = await lessonHrefs(page, ALUMNA.enrolledSlug);
  await page.goto(hrefs[hrefs.length - 1]);
  await fireEnded(page);
  await expect(page.getByText("Terminaste el curso")).toBeVisible();
  await expect(page.getByRole("link", { name: "Continuar", exact: true })).toHaveAttribute("href", "/panel");
});

test("c.2 ultima leccion, curso completo -> /certificado/<code>", async ({ page }) => {
  await page.addInitScript(HOOK);
  await login(page, DELFINA);
  const hrefs = await lessonHrefs(page, DELFINA.enrolledSlug);
  await page.goto(hrefs[hrefs.length - 1]);
  await fireEnded(page);
  const link = page.getByRole("link", { name: "Continuar", exact: true });
  await expect(link).toHaveAttribute("href", /^\/certificado\/[A-Za-z0-9-]+$/);
});

test("hostile ?t= no rompe", async ({ page }) => {
  await login(page, ALUMNA);
  const hrefs = await lessonHrefs(page, ALUMNA.enrolledSlug);
  for (const t of ["1e9", "-1", "99999999999999999999", "99999", "%20"]) {
    const r = await page.goto(`${hrefs[0]}?t=${t}`);
    expect(r?.status(), t).toBe(200);
    await expect(page.locator("iframe")).toHaveAttribute("src", /youtube/);
  }
});

test("D-32 anónima que termina la última preview cae en la ficha del curso, no en /panel", async ({ page }) => {
  await page.addInitScript(HOOK);
  const hrefs = await lessonHrefs(page, ALUMNA.enrolledSlug);
  await page.goto(hrefs[hrefs.length - 1]);
  await fireEnded(page);
  await expect(page.getByRole("link", { name: "Continuar", exact: true })).toHaveAttribute("href", `/cursos/${ALUMNA.enrolledSlug}`);
});
