import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { renderOgImage } from "../../lib/og.js";
import { ogHome } from "../../lib/og-layouts.js";

export const GET: APIRoute = async () => {
  const cidades = await getCollection("cidades");
  const total = cidades.length;
  const visitadas = cidades.filter((c) => c.data.status === "visitada").length;
  const pct = ((visitadas / total) * 100).toFixed(1);

  const png = await renderOgImage(ogHome({ visitadas, total, pct }));

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
