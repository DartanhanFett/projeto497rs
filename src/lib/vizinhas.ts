/**
 * Helper de proximidade geográfica.
 *
 * Calcula as N cidades mais próximas de uma cidade dada, usando
 * lat/lng pré-calculadas em municipios-rs.json. Usado pra internal
 * linking ("cidades vizinhas") nas páginas de cidade.
 *
 * Distância: fórmula de Haversine simplificada (precisão suficiente
 * pra ranking, não pra navegação real).
 */

import municipios from "../data/municipios-rs.json";

interface Mun {
  slug: string;
  nome: string;
  microrregiao: string | null;
  mesorregiao: string | null;
  lat?: number;
  lng?: number;
}

const TODAS = municipios as Mun[];
const COM_COORDS = TODAS.filter((m) => typeof m.lat === "number" && typeof m.lng === "number") as Required<Mun>[];

/** Distância aproximada em km entre duas lat/lng (Haversine). */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Cache: slug → lista de vizinhos pré-calculada. */
const cache = new Map<string, Array<{ slug: string; nome: string; distanciaKm: number }>>();

/**
 * Retorna as N cidades mais próximas de `slug` (excluindo ela mesma).
 * Resultado é determinístico e cacheado.
 */
export function vizinhas(slug: string, n = 6): Array<{ slug: string; nome: string; distanciaKm: number }> {
  const cached = cache.get(slug);
  if (cached) return cached.slice(0, n);

  const alvo = COM_COORDS.find((m) => m.slug === slug);
  if (!alvo) return [];

  const ordenadas = COM_COORDS
    .filter((m) => m.slug !== slug)
    .map((m) => ({
      slug: m.slug,
      nome: m.nome,
      distanciaKm: Math.round(haversine(alvo.lat, alvo.lng, m.lat, m.lng)),
    }))
    .sort((a, b) => a.distanciaKm - b.distanciaKm)
    .slice(0, 12); // cache top 12, retorna fatia conforme `n`

  cache.set(slug, ordenadas);
  return ordenadas.slice(0, n);
}
