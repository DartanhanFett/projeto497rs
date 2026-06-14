// scripts/fetch-municipios.mjs
//
// Baixa dados oficiais do IBGE para o Rio Grande do Sul:
//   1. Lista dos 497 municípios (com código, nome, microrregião, mesorregião)
//   2. GeoJSON simplificado (resolução intermediária — bom equilíbrio
//      entre fidelidade e tamanho de arquivo para web)
//
// Saídas:
//   - src/data/municipios-rs.json
//   - public/geo/municipios-rs.geojson

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// IBGE servidor de geoprocessamento — RS = UF 43
const UF_RS = 43;

const MUNICIPIOS_API = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${UF_RS}/municipios`;
const MALHA_API = `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${UF_RS}?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio`;

/** Slug em kebab-case, sem acentos. */
function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

async function main() {
  console.log("→ Baixando lista de municípios do IBGE…");
  const raw = await fetchJson(MUNICIPIOS_API);

  const municipios = raw
    .map((m) => ({
      codigo: String(m.id),
      nome: m.nome,
      slug: slugify(m.nome),
      microrregiao: m.microrregiao?.nome ?? null,
      mesorregiao: m.microrregiao?.mesorregiao?.nome ?? null,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  console.log(`  ✓ ${municipios.length} municípios`);

  console.log("→ Baixando GeoJSON dos polígonos (qualidade intermediária)…");
  const geojson = await fetchJson(MALHA_API);

  // Enriquecer cada feature com nome/slug usando o código IBGE
  const byCode = new Map(municipios.map((m) => [m.codigo, m]));
  for (const feature of geojson.features) {
    const code = String(feature.properties?.codarea ?? "");
    const m = byCode.get(code);
    if (!m) {
      console.warn(`  ! município sem match: ${code}`);
      continue;
    }
    feature.properties = {
      codigo: m.codigo,
      nome: m.nome,
      slug: m.slug,
      microrregiao: m.microrregiao,
      mesorregiao: m.mesorregiao,
    };
  }
  console.log(`  ✓ ${geojson.features.length} polígonos`);

  // Persistir
  await mkdir(resolve(ROOT, "src/data"), { recursive: true });
  await mkdir(resolve(ROOT, "public/geo"), { recursive: true });

  const listaPath = resolve(ROOT, "src/data/municipios-rs.json");
  const geoPath = resolve(ROOT, "public/geo/municipios-rs.geojson");

  await writeFile(listaPath, JSON.stringify(municipios, null, 2), "utf8");
  await writeFile(geoPath, JSON.stringify(geojson), "utf8");

  console.log(`\n✔ ${listaPath}`);
  console.log(`✔ ${geoPath}`);
}

main().catch((err) => {
  console.error("✘ Falha:", err);
  process.exit(1);
});
