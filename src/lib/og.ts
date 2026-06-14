/**
 * Gerador de OG images via Satori → SVG → PNG.
 *
 * Satori aceita árvores parecidas com JSX, mas como o projeto não usa
 * React, montamos os nós como objetos puros via helper `h()` —
 * equivalente funcional ao React.createElement.
 *
 * Tamanho fixo: 1200×630 (padrão Open Graph + Twitter).
 *
 * Fontes: lidas do disco resolvendo via `import.meta.url`. Funciona em
 * dev e em build (incluindo prerender), porque a URL absoluta do módulo
 * permanece válida em todos os contextos.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

let fontsCache: Awaited<ReturnType<typeof loadFonts>> | null = null;

/**
 * Resolve o caminho absoluto da fonte a partir do diretório raiz do
 * projeto (process.cwd()). Astro sempre roda a build/dev a partir da
 * raiz, então isso é estável tanto em dev quanto em prerender.
 */
async function loadFonts() {
  const cwd = process.cwd();
  const [fraunces, inter] = await Promise.all([
    readFile(`${cwd}/src/assets/fonts/Fraunces-SemiBold.ttf`),
    readFile(`${cwd}/src/assets/fonts/Inter-Regular.ttf`),
  ]);
  return [
    { name: "Fraunces", data: fraunces, weight: 600 as const, style: "normal" as const },
    { name: "Inter", data: inter, weight: 400 as const, style: "normal" as const },
  ];
}

/**
 * Hyperscript helper — produz a árvore que Satori espera, sem depender
 * de React/JSX. `h('div', { style: {...} }, ...children)`.
 */
export function h(
  type: string,
  props: Record<string, any> = {},
  ...children: any[]
): any {
  const flat = children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false);
  return {
    type,
    props: {
      ...props,
      children: flat.length === 0 ? undefined : flat.length === 1 ? flat[0] : flat,
    },
  };
}

export async function renderOgImage(node: any): Promise<Buffer> {
  if (!fontsCache) fontsCache = await loadFonts();

  const svg = await satori(node, {
    width: 1200,
    height: 630,
    fonts: fontsCache,
  });

  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
  })
    .render()
    .asPng();

  return Buffer.from(png);
}

/** Cores da paleta "Pampa Quente" (light) — sincronizar com global.css */
export const COLORS = {
  bg: "#FAF7F0",
  surface: "#FFFFFF",
  surface2: "#F2EDE3",
  primary: "#B8421F",
  accent: "#2D7A4F",
  highlight: "#C99124",
  pending: "#C9C0AF",
  text: "#1F1611",
  textMuted: "#6B5F52",
  textFaint: "#9A8F80",
  border: "#E5DCC9",
};
