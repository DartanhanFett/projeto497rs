/**
 * Mapa centralizado das tags de curiosidades — slug → label visível.
 *
 * Sempre que adicionar uma tag nova:
 *   1. Adicionar no array TAGS_CURIOSIDADES de src/content.config.ts
 *   2. Adicionar a entrada aqui
 *   3. Adicionar no select do public/admin/config.yml
 *
 * As 3 fontes precisam concordar — Zod valida no build.
 */
export const TAG_LABELS: Record<string, string> = {
  padroeiros: "Padroeiros",
  religiao: "Religião",
  historia: "História",
  geografia: "Geografia",
  natureza: "Natureza",
  festas: "Festas e eventos",
  gastronomia: "Gastronomia",
  imigracao: "Imigração",
  arquitetura: "Arquitetura",
  "musica-cultura": "Música e cultura",
  estatisticas: "Estatísticas",
  "pontos-turisticos": "Pontos turísticos",
};
