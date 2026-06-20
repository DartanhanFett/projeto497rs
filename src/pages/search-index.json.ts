/**
 * Endpoint estático /search-index.json
 *
 * Lista compacta de todas as 497 cidades pra alimentar o buscador
 * client-side (sem precisar de servidor). Cada entrada tem só o
 * mínimo necessário pra exibir resultado: slug (URL), nome
 * (texto principal), mesorregiao (subtexto), status (badge).
 *
 * Tamanho esperado: ~30 KB raw, ~10 KB com gzip — irrelevante.
 *
 * Atualizado a cada build, então um pai editando o status de uma
 * cidade refletirá no buscador no próximo deploy.
 */

import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async () => {
  const cidades = await getCollection("cidades");

  // Versão compacta: só o que o buscador precisa renderizar.
  // Mantém ordem alfabética pra ser determinístico (caching melhor).
  const entries = cidades
    .map((c) => ({
      slug: c.id,
      nome: c.data.nome,
      mesorregiao: c.data.mesorregiao,
      status: c.data.status,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return new Response(JSON.stringify(entries), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Refresh a cada hora — busca não precisa estar tempo real
      "Cache-Control": "public, max-age=3600",
    },
  });
};
