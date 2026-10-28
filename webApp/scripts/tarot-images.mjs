// webApp/scripts/tarot-images.mjs
// Se corre a mano UNA vez (no en CI): baja los escaneos de dominio publico del Rider-Waite 1909 desde
// Wikimedia Commons y los deja como WebP en public/tarot/rws. Uso:
//   node scripts/tarot-images.mjs --probe     (baja 5 cartas de cada serie para elegir)
//   node scripts/tarot-images.mjs --serie=<nombre de categoria>   (baja las 78)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import cards from "../src/lib/tarot/data/cards.json" with { type: "json" };

const API = "https://commons.wikimedia.org/w/api.php";
const OUT = join(import.meta.dirname, "..", "public", "tarot", "rws");
const HEIGHT = 600;
const UA = "humano-despierto-tarot/1.0 (contacto: ver README del repo)";

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Commons limita el ritmo (429) y a veces responde 5xx: se reintenta con espera creciente.
const BACKOFF = [5000, 15000, 45000, 90000];
async function get(url) {
  for (let intento = 0; ; intento++) {
    await sleep(1500);
    let fallo;
    let retryAfter = 0;
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60000) });
      if (res.ok) return res;
      if (res.status !== 429 && res.status < 500) throw new Error(`${res.status} ${url}`);
      fallo = new Error(`${res.status} ${url}`);
      retryAfter = Number(res.headers.get("retry-after")) * 1000 || 0;
    } catch (e) {
      if (e.message.match(/^[34]\d\d /)) throw e;
      fallo = e;
    }
    if (intento >= BACKOFF.length) throw fallo;
    await sleep(Math.max(BACKOFF[intento], retryAfter));
  }
}

async function api(params) {
  return (await get(`${API}?${new URLSearchParams({ format: "json", ...params })}`)).json();
}

async function categoryFiles(category) {
  const files = [];
  let cmcontinue;
  do {
    const r = await api({ action: "query", list: "categorymembers", cmtitle: `Category:${category}`, cmtype: "file", cmlimit: "500", ...(cmcontinue ? { cmcontinue } : {}) });
    files.push(...r.query.categorymembers.map((m) => m.title));
    cmcontinue = r.continue?.cmcontinue;
  } while (cmcontinue);
  return files;
}

// La consulta de extmetadata es cara y Commons la corta con 503: se pide por lotes.
async function fileInfos(titles) {
  const infos = new Map();
  for (let i = 0; i < titles.length; i += 20) {
    await sleep(10000);
    let r;
    try {
      r = await api({ action: "query", titles: titles.slice(i, i + 20).join("|"), prop: "imageinfo", iiprop: "url|extmetadata" });
    } catch (e) {
      console.error(`FALLO lote ${i}: ${e.message.slice(0, 80)}`);
      continue;
    }
    for (const page of Object.values(r.query.pages)) {
      const ii = page.imageinfo?.[0];
      if (ii) infos.set(page.title, { url: ii.url, license: ii.extmetadata?.LicenseShortName?.value ?? "?" });
    }
  }
  return infos;
}

// Las series de Commons nombran los archivos distinto: por numero ("RWS1909 - Cups 03", "Pents02", "RWS Tarot 00 Fool") o por nombre en ingles.
const SUITS = { wands: "bastos", cups: "copas", swords: "espadas", pents: "oros", pentacles: "oros" };
function matchCard(title) {
  const t = title.replace(/^File:/, "").replace(/\.\w+$/, "").replace(/\(.*\)/, "").trim();
  const suit = t.match(/(wands|cups|swords|pentacles|pents)\s*(\d{1,2})\b/i);
  if (suit) return cards.find((c) => c.palo === SUITS[suit[1].toLowerCase()] && c.numero === Number(suit[2]));
  const major = t.match(/(?:^|[\s-])(\d{2})\s+[A-Za-z]/);
  if (major) return cards.find((c) => c.arcano === "mayor" && c.numero === Number(major[1]));
  const norm = (s) => s.toLowerCase().replace(/^the /, "").trim();
  const name = norm(t);
  return cards.find((c) => norm(c.nombre_en) === name || (c.nombre_en.startsWith("Ace of ") && norm(c.nombre_en.replace("Ace", "One")) === name));
}

async function download(url) {
  return Buffer.from(await (await get(url)).arrayBuffer());
}

// Baja la calidad hasta que la carta pese 60 KB o menos.
async function toWebp(buf) {
  const base = sharp(buf).trim({ threshold: 20 }).resize({ height: HEIGHT, withoutEnlargement: true });
  let out;
  for (const quality of [78, 70, 62, 55, 48, 40]) {
    out = await base.clone().webp({ quality }).toBuffer();
    if (out.length <= 60 * 1024) break;
  }
  return out;
}

const CREDITS = join(OUT, "CREDITS.md");

function readCredits() {
  const rows = new Map();
  if (!existsSync(CREDITS)) return rows;
  for (const line of readFileSync(CREDITS, "utf8").split("\n")) {
    const m = line.match(/^\| (.+?) \| (.+?) \| (.+?) \| (.+?) \|$/);
    if (m && m[1] !== "Id" && m[1] !== "---") rows.set(m[1], line);
  }
  return rows;
}

function writeCredits(serie, rows) {
  const head = `# Créditos\n\nSerie de Wikimedia Commons: \`Category:${serie}\`. Ilustraciones de Pamela Colman Smith (1909), dominio público (la autora murió en 1951).\n\n| Id | Carta | Archivo | Licencia |\n|---|---|---|---|\n`;
  const ordered = cards.map((c) => rows.get(c.id)).filter(Boolean);
  writeFileSync(CREDITS, head + ordered.join("\n") + "\n");
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const serie = args.serie ?? "Rider-Waite tarot deck";
  const titles = await categoryFiles(serie);
  const wanted = args.probe ? ["el-loco", "la-luna", "reina-de-copas", "diez-de-espadas", "as-de-oros"] : cards.map((c) => c.id);
  const rows = args.probe ? new Map() : readCredits();
  const seen = new Set();
  const todo = [];
  for (const title of titles) {
    const card = matchCard(title);
    if (!card || !wanted.includes(card.id) || seen.has(card.id)) continue;
    seen.add(card.id);
    if (!args.probe && existsSync(join(OUT, `${card.id}.webp`)) && rows.has(card.id)) continue;
    todo.push({ card, title });
  }
  const infos = await fileInfos(todo.map((t) => t.title));
  for (const { card, title } of todo) {
    const file = join(OUT, `${card.id}.webp`);
    try {
      const info = infos.get(title.replace(/_/g, " "));
      if (!info) throw new Error(`sin imageinfo para ${title}`);
      if (!existsSync(file) || args.probe) {
        const webp = await toWebp(await download(info.url));
        writeFileSync(file, webp);
        console.log(`${card.id} <- ${title} (${Math.round(webp.length / 1024)} KB, ${info.license})`);
      } else {
        console.log(`${card.id}: imagen existente, credito recuperado (${info.license})`);
      }
      rows.set(card.id, `| ${card.id} | ${card.nombre_es} | ${title} | ${info.license} |`);
      if (!args.probe) writeCredits(serie, rows);
    } catch (e) {
      console.error(`FALLO ${card.id}: ${e.message}`);
    }
  }
  const missing = wanted.filter((id) => !existsSync(join(OUT, `${id}.webp`)) || (!args.probe && !rows.has(id)));
  console.log(`${wanted.length - missing.length}/${wanted.length} cartas`);
  if (missing.length) {
    console.error(`Faltan: ${missing.join(", ")}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
