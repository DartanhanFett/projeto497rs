import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { renderOgImage } from "../../../lib/og.js";
import { ogCuriosidade } from "../../../lib/og-layouts.js";
import { TAG_LABELS } from "../../../lib/tags.js";

export const getStaticPaths: GetStaticPaths = async () => {
  const todas = await getCollection("curiosidades");
  return todas.map((c) => ({
    params: { slug: c.id },
    props: { curiosidade: c },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const c = props.curiosidade as Awaited<ReturnType<typeof getCollection>>[number];
  const d = c.data;

  const data = d.data
    ? d.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : undefined;

  const tags = (d.tags ?? []).map((t: string) => TAG_LABELS[t] ?? t);

  const png = await renderOgImage(
    ogCuriosidade({
      titulo: d.titulo,
      data,
      tags,
    })
  );

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
