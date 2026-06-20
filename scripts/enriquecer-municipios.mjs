// scripts/enriquecer-municipios.mjs
//
// Adiciona lat/lng (centroide do polígono) a cada município no
// src/data/municipios-rs.json. Usa o GeoJSON já baixado.
//
// Idempotente — pode rodar várias vezes.
//
// USO: node scripts/enriquecer-municipios.mjs

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/**
 * Calcula centroide de polígono GeoJSON.
 * Para MultiPolygon, usa o maior polígono.
 *
 * Algoritmo: média ponderada por área de centroides de triângulos
 * (suficiente pro uso aqui — não precisamos de precisão geodésica).
 */
function centroide(geometry) {
  let coords;
  if (geometry.type === "Polygon") {
    coords = geometry.coordinates[0]; // anel exterior
  } else if (geometry.type === "MultiPolygon") {
    // Pega o maior polígono (por número de pontos como heurística)
    coords = geometry.coordinates
      .map((p) => p[0])
      .sort((a, b) => b.length - a.length)[0];
  } else {
    return null;
  }

  // Média simples dos vértices — bom o suficiente pra municípios convexos
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of coords) {
    sumLng += lng;
    sumLat += lat;
  }
  return {
    lat: +(sumLat / coords.length).toFixed(6),
    lng: +(sumLng / coords.length).toFixed(6),
  };
}

async function main() {
  const listaPath = resolve(ROOT, "src/data/municipios-rs.json");
  const geoPath = resolve(ROOT, "public/geo/municipios-rs.geojson");

  const lista = JSON.parse(await readFile(listaPath, "utf8"));
  const geojson = JSON.parse(await readFile(geoPath, "utf8"));

  const byCode = new Map();
  for (const f of geojson.features) {
    byCode.set(String(f.properties.codigo), f.geometry);
  }

  let atualizados = 0;
  for (const m of lista) {
    const geom = byCode.get(m.codigo);
    if (!geom) continue;
    const c = centroide(geom);
    if (!c) continue;
    if (m.lat === c.lat && m.lng === c.lng) continue;
    m.lat = c.lat;
    m.lng = c.lng;
    atualizados++;
  }

  await writeFile(listaPath, JSON.stringify(lista, null, 2), "utf8");
  console.log(`✔ ${atualizados} municípios com lat/lng calculadas`);

  // Sanidade — Porto Alegre deve estar perto de -30.0, -51.2
  const poa = lista.find((m) => m.slug === "porto-alegre");
  if (poa) console.log(`  ↳ Porto Alegre: ${poa.lat}, ${poa.lng}`);
}

main().catch((err) => {
  console.error("✘ Falha:", err);
  process.exit(1);
});
