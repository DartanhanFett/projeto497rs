# Operations

Practical notes on deploy and maintenance. For local dev only, see the [README](../README.md).

## Local setup

```sh
npm install
npm run dev      # http://localhost:4321
npm run cms      # local proxy to edit via /admin (port 8081)
```

In local mode, Decap connects directly to the filesystem — no login, no GitHub.

## Data scripts

```sh
npm run data:fetch              # download IBGE list + GeoJSON (rare)
npm run data:generate           # generate the 497 .md files in src/content/cidades
npm run data:import             # import visits/patrons from the spreadsheet
npm run data:wikipedia          # populate historical summaries from Wikipedia
npm run data:limpar-padroeiros  # strip "Igreja " prefix from patron field
npm run data:zerar              # reset editorial content (--confirmar)
npm run data:fix-datas          # normalize BR-format dates to ISO in frontmatter
npm run data:timestamps         # update atualizadoEm from git log
npm run media:migrate-r2        # upload local media to R2 and rewrite URLs
```

The reference spreadsheet at `reference/Municípios RS visitados.xlsx` requires
`xlsx` installed (kept as an optional dependency due to known CVEs — run
`npm install xlsx` before `data:import`).

## Netlify deploy

1. **Add new site → Import existing project**, pick the repo
2. Build settings come from `netlify.toml` (`npm run build` → `dist/`)
3. **Site config → Identity → Enable** → registration: **Invite only**
4. **Identity → Services → Git Gateway → Enable**
5. **Identity → Invite users** with editor emails
6. **Domain management → Add custom domain** → follow DNS instructions

DNS is delegated to Cloudflare. To point `projeto497rs.com.br` at Netlify,
create an A record to the Netlify load balancer IP (or a CNAME to the
Netlify subdomain) with **DNS-only** proxy (gray cloud, not orange) —
otherwise Netlify can't verify the domain.

## Cloudflare R2 (media)

Initial setup in [setup-r2.md](setup-r2.md).

Photos are uploaded to `public/uploads/` via Decap CMS. The
`.github/workflows/migrate-media.yml` action moves them to R2 and rewrites
the URLs in markdown. Result: the repo never accumulates media; photos are
served via `cdn.projeto497rs.com.br`.

Credentials live in GitHub Secrets (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_ENDPOINT`, `R2_BUCKET`) and in a local `.env` for running scripts manually.

To run the credentials diagnostic:

```sh
node scripts/r2-diagnose.mjs
```

## Maintenance routine

### Rotate R2 credentials (every 6 months)

1. Cloudflare → R2 → **Manage API tokens** → Roll, or Revoke + Create
2. Update `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` in GitHub Secrets
3. Update local `.env`
4. `node scripts/r2-diagnose.mjs` to confirm

### Update Decap CMS

The version is pinned with SRI in `src/pages/admin/index.astro`. To bump:

```sh
curl -sL https://unpkg.com/decap-cms@<VERSION>/dist/decap-cms.js \
  | openssl dgst -sha384 -binary | openssl base64 -A
```

Update both the version **and** the hash. Without the new hash, the browser
will block the script.

### CSP in production

Currently in `Report-Only` mode in `netlify.toml`. After 1-2 weeks live with
no violations on real routes, switch to `Content-Security-Policy` (without
`-Report-Only`) to enforce it.

### Decap CMS gotchas

- **Dates:** the config forces `format: 'YYYY-MM-DD'`. The Zod schema
  (`src/content.config.ts`) also has a fallback that accepts BR-format
  dates so the build doesn't break if anything slips through.
- **Photo gallery:** `image` widget with `multiple: true`. Multiple files
  selected at upload become a list of URLs in frontmatter.
- **Auto compression:** `/admin` intercepts uploads and compresses them to
  1600px / JPEG 80% before the CMS sends them. Typical smartphone photos
  (3-8MB) drop to ~300KB.

## Manual editing via markdown

A city's frontmatter:

```yaml
---
codigo: "4314902"
nome: "Porto Alegre"
microrregiao: "Porto Alegre"
mesorregiao: "Metropolitana de Porto Alegre"
status: visitada                # pendente | em-progresso | visitada
dataVisita: 2025-08-15
padroeiro: "São Pedro"
resumo: "Capital, ponto de partida e chegada de toda viagem."
capa: "https://cdn.projeto497rs.com.br/poa-orla.jpg"
fotos:
  - "https://cdn.projeto497rs.com.br/poa-1.jpg"
reels:
  - "https://www.instagram.com/reel/ABC123/"
curiosidades:
  - "Only Brazilian capital bathed by a delta."
---

Free markdown content about the visit.
```

Full schema in `src/content.config.ts`.
