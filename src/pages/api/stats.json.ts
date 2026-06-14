/**
 * Endpoint estático /api/stats.json
 *
 * Expõe métricas agregadas deste projeto em JSON, pensado para ser
 * consumido pelo site mãe "Conhecendo o Brasil" (conhecendoobrasil.com.br)
 * num futuro próximo. Cada projeto-irmão (RS, SP, MG…) expõe o mesmo
 * formato, e o site mãe agrega tudo num mapa do Brasil.
 *
 * Headers de cache em netlify.toml. CORS aberto pra permitir fetch
 * cross-origin pelo site mãe.
 */
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async () => {
  const cidades = await getCollection("cidades");

  const total = cidades.length;
  const visitadas = cidades.filter((c) => c.data.status === "visitada").length;
  const emProgresso = cidades.filter((c) => c.data.status === "em-progresso").length;
  const pendentes = total - visitadas - emProgresso;
  const comPadroeiro = cidades.filter((c) => c.data.padroeiro).length;

  // Última visita (data mais recente)
  const ultimaVisita = cidades
    .filter((c) => c.data.dataVisita)
    .sort((a, b) => +b.data.dataVisita! - +a.data.dataVisita!)[0];

  const payload = {
    projeto: {
      nome: "Projeto 497 RS",
      uf: "RS",
      estado: "Rio Grande do Sul",
      site: "https://projeto497rs.com.br",
      instagram: "https://instagram.com/projeto497rs",
    },
    parente: {
      nome: "Conhecendo o Brasil",
      site: "https://conhecendoobrasil.com.br",
    },
    contagem: {
      total,
      visitadas,
      emProgresso,
      pendentes,
      comPadroeiro,
      percentualConcluido: Number(((visitadas / total) * 100).toFixed(2)),
    },
    ultimaAtualizacao: new Date().toISOString(),
    ultimaVisita: ultimaVisita
      ? {
          slug: ultimaVisita.id,
          nome: ultimaVisita.data.nome,
          data: ultimaVisita.data.dataVisita?.toISOString().slice(0, 10),
        }
      : null,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
};
