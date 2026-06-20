/**
 * Helpers de SEO — Schema.org JSON-LD e dados estruturados.
 *
 * Cada função recebe os dados de uma página e devolve o objeto JSON
 * pronto pra ser serializado num <script type="application/ld+json">.
 *
 * Schemas suportados:
 *   - Place (cidade) com geo, area, populacao
 *   - Article (curiosidade)
 *   - WebSite (home)
 *   - BreadcrumbList (navegação hierárquica)
 *
 * Validação manual em https://search.google.com/test/rich-results
 */

import municipios from "../data/municipios-rs.json";

const SITE_URL = "https://projeto497rs.com.br";
const SITE_NAME = "Projeto 497 RS";
const PUBLISHER_NAME = "Conhecendo o Brasil";
const PUBLISHER_URL = "https://conhecendoobrasil.com.br";

/** Mapa slug → coordenadas. Lookup O(1). */
const coordsBySlug = new Map(
  (municipios as Array<{ slug: string; lat?: number; lng?: number }>)
    .filter((m) => typeof m.lat === "number" && typeof m.lng === "number")
    .map((m) => [m.slug, { lat: m.lat as number, lng: m.lng as number }])
);

export function getCoords(slug: string) {
  return coordsBySlug.get(slug) ?? null;
}

// ─────────────────────────────────────────────────────────────────────
// Schema: Place (cidade)
// ─────────────────────────────────────────────────────────────────────

interface PlaceProps {
  slug: string;
  nome: string;
  resumo?: string;
  populacao?: number | null;
  areaKm2?: number | null;
  microrregiao?: string | null;
  mesorregiao?: string | null;
  capa?: string;
  fundacao?: Date;
}

export function placeSchema(p: PlaceProps) {
  const coords = getCoords(p.slug);
  const url = `${SITE_URL}/cidades/${p.slug}/`;

  return {
    "@context": "https://schema.org",
    "@type": "City",
    name: p.nome,
    url,
    description: p.resumo || `${p.nome}, ${p.mesorregiao ?? "Rio Grande do Sul"} — uma das 497 cidades documentadas pelo Projeto 497 RS.`,
    address: {
      "@type": "PostalAddress",
      addressRegion: "RS",
      addressCountry: "BR",
      addressLocality: p.nome,
    },
    ...(coords && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: coords.lat,
        longitude: coords.lng,
      },
    }),
    ...(p.populacao && {
      additionalProperty: [
        {
          "@type": "PropertyValue",
          name: "População",
          value: p.populacao,
          unitText: "habitantes",
        },
        ...(p.areaKm2
          ? [
              {
                "@type": "PropertyValue",
                name: "Área",
                value: p.areaKm2,
                unitCode: "KMK", // UN/CEFACT pra km²
              },
            ]
          : []),
      ],
    }),
    ...(p.fundacao && {
      foundingDate: p.fundacao.toISOString().slice(0, 10),
    }),
    ...(p.capa && {
      image: p.capa.startsWith("http") ? p.capa : `${SITE_URL}${p.capa}`,
    }),
    containedInPlace: {
      "@type": "AdministrativeArea",
      name: "Rio Grande do Sul",
    },
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────
// Schema: Article (curiosidade)
// ─────────────────────────────────────────────────────────────────────

interface ArticleProps {
  slug: string;
  titulo: string;
  data?: Date;
  atualizadoEm?: Date;
  capa?: string;
  resumo?: string;
}

export function articleSchema(a: ArticleProps) {
  const url = `${SITE_URL}/curiosidades/${a.slug}/`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.titulo,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    ...(a.resumo && { description: a.resumo }),
    ...(a.data && { datePublished: a.data.toISOString().slice(0, 10) }),
    ...(a.atualizadoEm && { dateModified: a.atualizadoEm.toISOString().slice(0, 10) }),
    ...(a.capa && {
      image: a.capa.startsWith("http") ? a.capa : `${SITE_URL}${a.capa}`,
    }),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────
// Schema: WebSite (home) com SearchAction
// ─────────────────────────────────────────────────────────────────────

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: "Projeto 497 Rio Grande do Sul",
    url: SITE_URL,
    description:
      "Documentando todas as 497 cidades do Rio Grande do Sul — fotos, padroeiros, histórias e curiosidades de cada município gaúcho.",
    inLanguage: "pt-BR",
    publisher: {
      "@type": "Organization",
      name: PUBLISHER_NAME,
      url: PUBLISHER_URL,
    },
    // Box de busca direto no Google Search Results
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────
// Schema: BreadcrumbList
// ─────────────────────────────────────────────────────────────────────

export function breadcrumbSchema(items: { nome: string; url?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.nome,
      ...(item.url && { item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}` }),
    })),
  };
}
