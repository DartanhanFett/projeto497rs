import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Helper de schema tolerante pra datas vindas de fontes heterogêneas.
 *
 * Aceita (e converte pra Date):
 *   - "1959-02-16"             — ISO sem hora (formato canônico)
 *   - "1959-02-16T10:30:00Z"   — ISO com hora (Decap CMS às vezes salva assim)
 *   - "16/02/1959"             — DD/MM/YYYY (fallback se alguém salvar manualmente)
 *   - "16-02-1959"             — DD-MM-YYYY (raro mas possível)
 *   - Date | número            — pass-through
 *
 * Rejeita (mantém o erro original do Zod) qualquer outra coisa,
 * preservando feedback útil. Strings vazias e null viram undefined.
 *
 * Por que isso? Postel's Law aplicado ao build pipeline: o site não
 * deve quebrar porque alguém digitou data num formato regional que
 * humanos consideram correto. Normalizamos no parse, não no commit.
 */
const dataFlexivel = z.preprocess((val) => {
  if (val === null || val === undefined || val === "") return undefined;
  if (val instanceof Date || typeof val === "number") return val;
  if (typeof val !== "string") return val;

  const s = val.trim();
  if (!s || s === "null") return undefined;

  // Já parseável pelo construtor Date (ISO com ou sem hora) → deixa o coerce trabalhar
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;

  // DD/MM/YYYY ou DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  // Devolve original — Zod vai rejeitar e mostrar erro amigável
  return s;
}, z.coerce.date().optional());

const cidades = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/cidades" }),
  schema: z.object({
    // Identificação (vem do IBGE, não editar manualmente)
    codigo: z.string(),
    nome: z.string(),
    microrregiao: z.string().nullable(),
    mesorregiao: z.string().nullable(),

    // Dados de referência (planilha / IBGE)
    populacao: z.number().nullable().optional(),
    areaKm2: z.number().nullable().optional(),

    // Status da visita
    status: z.enum(["visitada", "em-progresso", "pendente"]).default("pendente"),
    dataVisita: dataFlexivel,

    // Última edição — gerenciado automaticamente pela GitHub Action
    // .github/workflows/update-timestamps.yml. Não editar manualmente.
    atualizadoEm: dataFlexivel,

    // Padroeiro / igreja matriz — eixo cultural do projeto
    padroeiro: z.string().optional(),

    // ─── Sobre a cidade (auto-populado de Wikipedia / preenchido manualmente) ──
    fundacao: dataFlexivel,                       // data de fundação
    aniversario: z.string().optional(),           // dia/mês do aniversário (ex: "20 de setembro")
    toponimia: z.string().optional(),             // origem do nome
    historiaResumo: z.string().optional(),        // 1-2 parágrafos
    siteOficial: z.string().url().optional(),     // site da prefeitura
    gentilico: z.string().optional(),             // ex: "porto-alegrense"

    // ─── O que vimos / experiência (preenchido manualmente) ────────────────────
    atracoes: z.array(z.string()).default([]),    // o que ver
    ondeComer: z.array(z.string()).default([]),
    ondeDormir: z.array(z.string()).default([]),
    festas: z.array(z.string()).default([]),      // festas tradicionais
    secretariaTurismo: z
      .object({
        endereco: z.string().optional(),
        telefone: z.string().optional(),
        email: z.string().optional(),
        site: z.string().url().optional(),
      })
      .optional(),

    // Conteúdo editorial
    resumo: z.string().optional(),
    capa: z.string().optional(),         // URL da foto de capa
    fotos: z.array(z.string()).default([]),
    reels: z.array(z.string()).default([]), // URLs de Reels do Instagram

    // Curiosidades como bullets rápidos (opcional, além do corpo MD)
    curiosidades: z.array(z.string()).default([]),
  }),
});

const TAGS_CURIOSIDADES = [
  "padroeiros",
  "religiao",
  "historia",
  "geografia",
  "natureza",
  "festas",
  "gastronomia",
  "imigracao",
  "arquitetura",
  "musica-cultura",
  "estatisticas",
  "pontos-turisticos",
] as const;

const curiosidades = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/curiosidades" }),
  schema: z.object({
    titulo: z.string(),
    data: dataFlexivel,                     // quando foi descoberta/registrada
    atualizadoEm: dataFlexivel,             // gerenciado pela GH Action
    tags: z.array(z.enum(TAGS_CURIOSIDADES)).default([]),
    capa: z.string().optional(),            // foto opcional
    cidades: z.array(z.string()).default([]), // slugs de cidades relacionadas
    destaque: z.boolean().default(false),   // pode aparecer como card de destaque na home
  }),
});

export const collections = { cidades, curiosidades };
