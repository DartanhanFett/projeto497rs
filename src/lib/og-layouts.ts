/**
 * Layouts pré-construídos pra OG images.
 *
 * Reutilizados pelas rotas em src/pages/og/. Cada função recebe os
 * dados específicos e retorna a árvore Satori (via h() de og.ts).
 */

import { h, COLORS } from "./og.js";

const PROJECT_LABEL = "PROJETO 497 RS";
const SITE_LABEL = "projeto497rs.com.br";

/**
 * Layout base — frame creme com decoração lateral e marca do projeto.
 */
function frame(children: any) {
  return h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: COLORS.bg,
        position: "relative",
        fontFamily: "Inter",
      },
    },
    // Faixa lateral primary (estética de revista)
    h("div", {
      style: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 16,
        backgroundColor: COLORS.primary,
      },
    }),
    children
  );
}

function header(label = PROJECT_LABEL) {
  return h(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "40px 60px 0 76px",
        fontSize: 22,
        fontWeight: 600,
        letterSpacing: 4,
        color: COLORS.primary,
      },
    },
    label
  );
}

function footer(text = SITE_LABEL) {
  return h(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 60px 36px 76px",
        marginTop: "auto",
        fontSize: 22,
        color: COLORS.textMuted,
      },
    },
    h("span", {}, text),
    h(
      "span",
      {
        style: {
          color: COLORS.textFaint,
          fontStyle: "italic",
        },
      },
      "Conhecendo o Brasil"
    )
  );
}

function statusBadge(status: "visitada" | "em-progresso" | "pendente") {
  const map = {
    visitada: { label: "✓ Visitada", color: COLORS.accent, bg: "#DDEDE2" },
    "em-progresso": { label: "● Em progresso", color: COLORS.highlight, bg: "#F5E6C5" },
    pendente: { label: "○ Pendente", color: COLORS.textMuted, bg: COLORS.surface2 },
  };
  const cfg = map[status];
  return h(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        padding: "8px 18px",
        borderRadius: 999,
        backgroundColor: cfg.bg,
        color: cfg.color,
        fontSize: 22,
        fontWeight: 600,
        border: `1px solid ${cfg.color}40`,
      },
    },
    cfg.label
  );
}

// ─────────────────────────────────────────────────────────────────────
// Layout: cidade
// ─────────────────────────────────────────────────────────────────────

export interface OgCidadeProps {
  nome: string;
  status: "visitada" | "em-progresso" | "pendente";
  mesorregiao?: string | null;
  padroeiro?: string;
  populacao?: number | null;
  dataVisita?: string; // formatada
}

export function ogCidade(props: OgCidadeProps) {
  const { nome, status, mesorregiao, padroeiro, populacao, dataVisita } = props;

  const meta: { label: string; value: string }[] = [];
  if (padroeiro) meta.push({ label: "Padroeiro", value: padroeiro });
  if (populacao) meta.push({ label: "População", value: `${populacao.toLocaleString("pt-BR")} hab.` });
  if (dataVisita) meta.push({ label: "Visitada em", value: dataVisita });

  // Nomes muito longos precisam de tamanho menor
  const nameSize = nome.length > 18 ? 96 : nome.length > 13 ? 116 : 138;

  return frame(
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "40px 60px 0 76px",
          gap: 0,
        },
      },
      header(),

      // Espaçamento elástico
      h("div", { style: { flex: 1, display: "flex" } }),

      // Nome da cidade (display)
      h(
        "div",
        {
          style: {
            display: "flex",
            fontFamily: "Fraunces",
            fontSize: nameSize,
            lineHeight: 1.0,
            color: COLORS.text,
            marginBottom: 18,
            letterSpacing: -2,
          },
        },
        nome
      ),

      // Linha mesorregião
      mesorregiao
        ? h(
            "div",
            {
              style: {
                display: "flex",
                fontSize: 30,
                color: COLORS.textMuted,
                marginBottom: 24,
              },
            },
            mesorregiao
          )
        : null,

      // Linha status + meta
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
            marginBottom: 8,
          },
        },
        statusBadge(status),
        meta.slice(0, 2).map((m) =>
          h(
            "div",
            {
              style: {
                display: "flex",
                fontSize: 24,
                color: COLORS.text,
                padding: "8px 18px",
                borderRadius: 999,
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
              },
            },
            m.value
          )
        )
      ),

      h("div", { style: { flex: 1, display: "flex" } }),

      footer()
    )
  );
}

// ─────────────────────────────────────────────────────────────────────
// Layout: home
// ─────────────────────────────────────────────────────────────────────

export interface OgHomeProps {
  visitadas: number;
  total: number;
  pct: string;
}

export function ogHome(props: OgHomeProps) {
  const { visitadas, total, pct } = props;

  return frame(
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "40px 60px 0 76px",
        },
      },
      header(),

      h("div", { style: { flex: 1, display: "flex" } }),

      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            fontFamily: "Fraunces",
            fontSize: 92,
            lineHeight: 1.05,
            color: COLORS.text,
            letterSpacing: -2,
          },
        },
        h("div", { style: { display: "flex" } }, "Cada cidade do"),
        h(
          "div",
          { style: { display: "flex", color: COLORS.primary } },
          "Rio Grande do Sul"
        )
      ),

      h(
        "div",
        {
          style: {
            display: "flex",
            fontSize: 32,
            color: COLORS.textMuted,
            marginTop: 24,
            maxWidth: 900,
          },
        },
        "Documentando todos os 497 municípios gaúchos — uma cidade de cada vez."
      ),

      h(
        "div",
        {
          style: {
            display: "flex",
            gap: 16,
            marginTop: 36,
          },
        },
        [
          { label: "Visitadas", value: String(visitadas), color: COLORS.accent },
          { label: "Total", value: String(total), color: COLORS.text },
          { label: "Concluído", value: `${pct}%`, color: COLORS.primary },
        ].map((s) =>
          h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                padding: "16px 28px",
                borderRadius: 14,
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
              },
            },
            h(
              "div",
              {
                style: {
                  display: "flex",
                  fontFamily: "Fraunces",
                  fontSize: 48,
                  color: s.color,
                  lineHeight: 1,
                },
              },
              s.value
            ),
            h(
              "div",
              {
                style: {
                  display: "flex",
                  fontSize: 18,
                  color: COLORS.textMuted,
                  marginTop: 6,
                },
              },
              s.label
            )
          )
        )
      ),

      h("div", { style: { flex: 1, display: "flex" } }),
      footer()
    )
  );
}

// ─────────────────────────────────────────────────────────────────────
// Layout: curiosidade
// ─────────────────────────────────────────────────────────────────────

export interface OgCuriosidadeProps {
  titulo: string;
  data?: string;
  tags: string[];
}

export function ogCuriosidade(props: OgCuriosidadeProps) {
  const { titulo, data, tags } = props;

  // Título longo → fonte menor
  const tSize = titulo.length > 60 ? 56 : titulo.length > 40 ? 70 : 86;

  return frame(
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "40px 60px 0 76px",
        },
      },
      header("CADERNO DE VIAGEM"),

      // tags em chips
      tags.length > 0
        ? h(
            "div",
            {
              style: {
                display: "flex",
                gap: 10,
                marginTop: 28,
              },
            },
            tags.map((t) =>
              h(
                "div",
                {
                  style: {
                    display: "flex",
                    padding: "6px 14px",
                    borderRadius: 999,
                    backgroundColor: COLORS.surface2,
                    color: COLORS.textMuted,
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    border: `1px solid ${COLORS.border}`,
                  },
                },
                t
              )
            )
          )
        : null,

      h("div", { style: { flex: 1, display: "flex" } }),

      h(
        "div",
        {
          style: {
            display: "flex",
            fontFamily: "Fraunces",
            fontSize: tSize,
            lineHeight: 1.1,
            color: COLORS.text,
            letterSpacing: -1,
            maxWidth: 1080,
          },
        },
        titulo
      ),

      data
        ? h(
            "div",
            {
              style: {
                display: "flex",
                fontSize: 24,
                color: COLORS.textFaint,
                marginTop: 18,
              },
            },
            data
          )
        : null,

      h("div", { style: { flex: 1, display: "flex" } }),
      footer()
    )
  );
}
