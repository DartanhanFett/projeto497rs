import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { renderOgImage } from "../../../lib/og.js";
import { ogCidade } from "../../../lib/og-layouts.js";

export const getStaticPaths: GetStaticPaths = async () => {
  const cidades = await getCollection("cidades");
  return cidades.map((c) => ({
    params: { slug: c.id },
    props: { cidade: c },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const c = props.cidade as Awaited<ReturnType<typeof getCollection>>[number];
  const d = c.data;

  const dataVisita = d.dataVisita
    ? d.dataVisita.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : undefined;

  const png = await renderOgImage(
    ogCidade({
      nome: d.nome,
      status: d.status,
      mesorregiao: d.mesorregiao,
      padroeiro: d.padroeiro,
      populacao: d.populacao ?? undefined,
      dataVisita,
    })
  );

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
