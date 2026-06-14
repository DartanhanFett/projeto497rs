import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

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
    dataVisita: z.coerce.date().optional(),

    // Padroeiro / igreja matriz — eixo cultural do projeto
    padroeiro: z.string().optional(),

    // ─── Sobre a cidade (auto-populado de Wikipedia / preenchido manualmente) ──
    fundacao: z.coerce.date().optional(),         // data de fundação
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
] as const;

const curiosidades = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/curiosidades" }),
  schema: z.object({
    titulo: z.string(),
    data: z.coerce.date().optional(),       // quando foi descoberta/registrada
    tags: z.array(z.enum(TAGS_CURIOSIDADES)).default([]),
    capa: z.string().optional(),            // foto opcional
    cidades: z.array(z.string()).default([]), // slugs de cidades relacionadas
    destaque: z.boolean().default(false),   // pode aparecer como card de destaque na home
  }),
});

export const collections = { cidades, curiosidades };
