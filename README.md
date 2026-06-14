# Projeto 497 RS

> Visitando e documentando todas as **497 cidades do Rio Grande do Sul**.
> Site público com mapa interativo, página por cidade, fotos e histórias.
>
> **Acompanhe no Instagram:** [@projeto497rs](https://instagram.com/projeto497rs)
> **Site:** [projeto497rs.com.br](https://projeto497rs.com.br)

> Este projeto faz parte de **[Conhecendo o Brasil](https://conhecendoobrasil.com.br)** — um esforço maior pra documentar todas as cidades do país, capítulo por capítulo (estado por estado).

---

## 🛠️ Stack

- **[Astro 6](https://astro.build/)** — site estático, ultrarrápido, build em segundos
- **[Tailwind CSS v4](https://tailwindcss.com/)** — via PostCSS (workaround pro Astro 6 + Rolldown)
- **[MapLibre GL JS](https://maplibre.org/)** — mapa interativo dos 497 municípios
- **[Decap CMS](https://decapcms.org/)** — painel de edição (em `/admin`)
- **[Netlify](https://www.netlify.com/)** — hospedagem + Identity (login do CMS)
- **Dados oficiais do IBGE** — lista de municípios e malha geográfica

## 📂 Estrutura

```
projeto-497/
├── public/
│   ├── admin/                    ← Decap CMS (painel do editor)
│   ├── geo/municipios-rs.geojson ← polígonos dos 497 municípios
│   └── uploads/                  ← fotos enviadas pelo CMS
├── src/
│   ├── components/MapaRS.astro   ← mapa interativo
│   ├── content/cidades/          ← 497 arquivos markdown (um por cidade)
│   ├── data/municipios-rs.json   ← lista IBGE
│   ├── layouts/BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro           ← home com mapa + stats
│   │   └── cidades/[slug].astro  ← página dinâmica de cada cidade
│   └── styles/global.css         ← paleta "Pampa Moderno"
├── scripts/
│   ├── fetch-municipios.mjs      ← baixa dados do IBGE
│   └── generate-cidades.mjs      ← gera/atualiza os 497 .md
└── reference/                    ← imagens de referência (mapa pintado original)
```

## 🚀 Comandos

```sh
npm install              # instala dependências
npm run dev              # inicia o dev server em http://localhost:4321
npm run cms              # proxy local do Decap CMS (porta 8081) — ver "Testando o CMS local"
npm run build            # gera o site estático em ./dist
npm run preview          # serve o build local

npm run data:fetch       # rebaixa lista + GeoJSON do IBGE (raro)
npm run data:generate    # cria/atualiza os 497 .md em src/content/cidades
npm run data:import      # importa visitas e padroeiros da planilha
                         #   reference/Municípios RS visitados.xlsx
                         # (use -- --dry-run pra simular sem escrever)
npm run data:wikipedia   # popula resumo histórico/fundação via Wikipedia + Wikidata
                         # (use -- --slug=gramado pra uma só, --limit=10 pra teste)
```

## 🧪 Testando o CMS localmente (sem precisar fazer deploy)

O Decap CMS tem um modo "local backend" que conecta o painel `/admin` direto no
seu filesystem — sem login, sem GitHub, sem Netlify. Perfeito pra testar como
seu pai vai usar antes de tudo estar no ar.

**Em dois terminais separados, rode em paralelo:**

```sh
# Terminal 1 — site (Astro)
npm run dev

# Terminal 2 — proxy do CMS
npm run cms
```

Depois abre **http://localhost:4321/admin/** no navegador. O CMS detecta o
proxy local automaticamente (porque `local_backend: true` está em
[public/admin/config.yml](public/admin/config.yml)) e:

- ✅ Você edita uma cidade no painel → arquivo `.md` é atualizado direto
- ✅ Arrasta uma foto → vai pra `public/uploads/` automaticamente
- ✅ O dev server detecta a mudança e atualiza a página em tempo real

**Em produção (Netlify)** o `local_backend: true` é ignorado e o CMS cai no
`git-gateway` — fluxo normal com login.

## 🔄 Atualizando dados da planilha

Sempre que atualizar `reference/Municípios RS visitados.xlsx` (datas novas,
padroeiros corrigidos, etc), basta:

```sh
npm run data:import -- --dry-run    # simula, mostra o que vai mudar
npm run data:import                 # aplica
```

O script preserva todo conteúdo manual (fotos, resumo, body, curiosidades)
e atualiza apenas os campos vindos da planilha (status, data, padroeiro,
população, área).

## ✏️ Como editar uma cidade (para o editor)

Em produção, o fluxo é totalmente visual: acesse **`https://projeto497rs.com.br/admin`**, faça login, escolha a cidade e edite. Sem código, sem git.

Pra editar localmente sem o CMS, basta abrir o arquivo correspondente em `src/content/cidades/<slug>.md`. Exemplo (`porto-alegre.md`):

```yaml
---
codigo: "4314902"
nome: "Porto Alegre"
microrregiao: "Porto Alegre"
mesorregiao: "Metropolitana de Porto Alegre"
status: visitada              # pendente | em-progresso | visitada
dataVisita: 2025-08-15
resumo: "Capital, ponto de partida e chegada de toda viagem."
capa: "https://cdn.projeto497rs.com.br/poa-orla.jpg"
fotos:
  - "https://cdn.projeto497rs.com.br/poa-1.jpg"
  - "https://cdn.projeto497rs.com.br/poa-2.jpg"
reels:
  - "https://www.instagram.com/reel/ABC123/"
curiosidades:
  - "É a única capital do Brasil banhada por um delta."
  - "Casa do primeiro arquibanco coberto da América do Sul."
---

Conteúdo livre em **markdown** sobre a visita à cidade.
```

## 🎨 Paleta — "Pampa Moderno"

| Token            | Cor       | Uso                              |
| ---------------- | --------- | -------------------------------- |
| `--color-bg`     | `#0F1419` | Fundo principal                  |
| `--color-primary`| `#C8472D` | Acentos, links, destaque         |
| `--color-accent` | `#2D8659` | Cidades **visitadas**            |
| `--color-highlight` | `#E8B948` | Cidades **em progresso**     |
| `--color-pending`| `#3A4A5C` | Cidades **pendentes**            |

Tipografia: **Fraunces** (display) + **Inter** (corpo).

## 🌐 Deploy (Netlify)

Veja o passo-a-passo completo em [DEPLOY.md](DEPLOY.md).

## 📝 Status do projeto

- ✅ Base Astro + Tailwind + paleta
- ✅ Dados oficiais do IBGE (497 municípios + GeoJSON)
- ✅ 497 arquivos markdown gerados
- ✅ Importação da planilha pessoal (322 visitadas, 308 com padroeiro)
- ✅ Mapa interativo (hover, clique, status colorido)
- ✅ Home com stats, últimas visitas e seção de padroeiros
- ✅ Template de página de cidade (ficha rápida + galeria + Reels embedados)
- ✅ Decap CMS configurado em PT-BR
- ⏳ Deploy + domínio + Netlify Identity → ver [DEPLOY.md](DEPLOY.md)
- ⏳ Logo final + OG image automática por cidade
- ⏳ Conexão Cloudinary (futuro, quando volume de fotos crescer)
