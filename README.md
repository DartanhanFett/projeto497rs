# Projeto 497 RS

Interactive map and guide for the **497 cities of Rio Grande do Sul** (Brazil's southernmost state), with photos, patron saints, history and curiosities for each municipality.

🌐 [projeto497rs.com.br](https://projeto497rs.com.br) · 📷 [@projeto497rs](https://instagram.com/projeto497rs)

The Rio Grande do Sul chapter of the broader [Conhecendo o Brasil](https://conhecendoobrasil.com.br) project.

## Stack

- **Astro 6** (SSG) + **Tailwind CSS v4** + **TypeScript**
- **MapLibre GL JS** with official IBGE GeoJSON
- **Decap CMS** with Netlify Identity + Git Gateway
- **Satori** for build-time per-page OG images
- **Cloudflare R2** for media (CDN, unlimited egress)
- **Netlify** for hosting + Identity + CI

## Architecture

```
GitHub repo ─────► Netlify Build ─────► CDN (HTML/CSS/JS, OG images)
     ▲                                        │
     │                                        ▼
     │                              cdn.projeto497rs.com.br
Decap CMS                           (Cloudflare R2 — photos)
(/admin)                                    ▲
     │                                      │
     ▼                              GitHub Action moves
Action updates timestamps          public/uploads/ → R2
and rewrites media URLs            and rewrites markdown
```

City content lives in markdown (`src/content/cidades/`), validated by a Zod schema with permissive date parsing. OG images, sitemap and search index are generated at build time.

## Notable decisions

- **Light "Pampa Quente" palette** instead of dark mode — colorful photos pop better on warm cream background, travel-magazine vibe
- **Zod schema with `z.preprocess`** accepting ISO/BR/datetime dates — Postel's Law applied so the build doesn't fail on quirky CMS input
- **Client-side image compression** in `/admin` (1600px / JPEG 80%) before upload — typical smartphone photos drop from 8MB to ~300KB with no visible quality loss
- **Per-page OG images** (501 PNGs generated via Satori at build) — beautiful preview cards on WhatsApp/Instagram with name, patron, status
- **Automatic internal linking** — each city lists its 6 nearest neighbors (Haversine over GeoJSON-derived lat/lng)
- **JSON-LD with GeoCoordinates** — Google understands each page as a `City` schema, ranks better for geographic queries

## Running locally

```sh
npm install
npm run dev    # http://localhost:4321
```

To use the `/admin` panel locally without deploying:

```sh
npm run cms    # in another terminal
```

Setup, data scripts, deploy and operations: [docs/operations.md](docs/operations.md).

## Layout

```
src/
├── components/         # MapaRS, BuscaCidades, SiteHeader, Compartilhar
├── content/cidades/    # 497 .md files (one per municipality)
├── content/curiosidades/
├── data/municipios-rs.json   # IBGE: name, regions, lat/lng
├── lib/                # seo.ts (JSON-LD), vizinhas.ts, og.ts
├── pages/
│   ├── cidades/[slug].astro
│   ├── curiosidades/
│   ├── regioes/
│   ├── og/             # .png.ts endpoints (Satori)
│   ├── api/stats.json.ts
│   └── search-index.json.ts
└── styles/global.css   # Pampa Quente palette
public/
├── admin/config.yml    # Decap CMS
├── geo/municipios-rs.geojson
└── robots.txt
scripts/                # data:fetch, data:import, media:migrate-r2, etc.
.github/workflows/      # ci, migrate-media, update-timestamps
```

Security policy: [SECURITY.md](SECURITY.md).
