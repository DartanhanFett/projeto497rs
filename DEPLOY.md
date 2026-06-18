# Deploy no Netlify — Projeto 497 RS

Passo-a-passo para colocar o site no ar e habilitar o painel de edição (Decap CMS) para o seu pai. Tempo total: **~20 minutos**.

---

## Pré-requisitos

- Repositório no GitHub (você cria manualmente — push direto daqui não rola na sua máquina)
- Conta no Netlify (grátis): https://app.netlify.com/signup
- Domínio `.com.br` registrado no Registro.br (pode ser feito depois)

---

## Etapa 1 — Subir o repo no GitHub

**No seu computador (em outro terminal/máquina onde o push funciona):**

```sh
cd c:/SAPDevelop/Repos/projeto-497

# Inicializar git se ainda não foi feito
git init -b main
git add .
git commit -m "Inicialização do Projeto 497 RS"

# Conectar ao repo remoto e empurrar
git remote add origin git@github.com:SEU-USUARIO/projeto-497-rs.git
git push -u origin main
```

> **Nome sugerido do repo no GitHub:** `projeto-497-rs`
> **Visibilidade:** público (já que o Insta vai divulgar)

---

## Etapa 2 — Conectar Netlify ao GitHub

1. Acesse https://app.netlify.com/ e faça login.
2. Clique em **"Add new site" → "Import an existing project"**.
3. Escolha **GitHub** e autorize o Netlify.
4. Selecione o repo `projeto-497-rs`.
5. Configurações de build (já vêm certas, vindas do `netlify.toml`):
   - **Branch to deploy:** `main`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
6. Clique em **"Deploy site"**.

Em ~1 minuto o site sobe num domínio temporário tipo `random-name-1234.netlify.app`. Acesse pra confirmar que está funcionando.

---

## Etapa 3 — Renomear o site (opcional, mas útil)

1. **Site configuration → General → Site details → Change site name**
2. Coloque `projeto-497-rs` → fica `projeto-497-rs.netlify.app`. Use isso enquanto o `.com.br` não está pronto.

---

## Etapa 4 — Habilitar Netlify Identity (login do CMS)

> O Decap CMS usa Netlify Identity para autenticar editores (você + seu pai).

1. **Site configuration → Identity → Enable Identity**
2. Em **Registration preferences**, mude para **"Invite only"** (assim só quem você convidar consegue logar).
3. **External providers (opcional, mas recomendado):** habilite **Google** — login com 1 clique, sem senha pra esquecer (perfeito pro pai 60+).
4. **Emails → Templates:** dá pra customizar os emails de convite e confirmação. Por enquanto deixa o padrão.

---

## Etapa 5 — Habilitar Git Gateway (Decap → GitHub)

> Sem isso, o CMS não consegue salvar no repositório.

1. **Site configuration → Identity → Services → Git Gateway → Enable Git Gateway**
2. O Netlify pede autorização no GitHub — aceitar.

Pronto. Agora o CMS sabe escrever no repo, e cada edição vira um commit automático em `main`, que dispara um novo deploy.

---

## Etapa 6 — Convidar editores

1. **Identity → Invite users**
2. Coloque seu email e o do seu pai.
3. Eles recebem um link de convite por email → clicam → criam senha (ou logam com Google se você habilitou).
4. Acesso ao painel: `https://projeto-497-rs.netlify.app/admin/`

---

## Etapa 7 — Testar o fluxo do editor

1. Acesse `/admin/` no site.
2. Faça login.
3. Escolha uma cidade (ex: "Porto Alegre").
4. Mude o status, adicione uma foto, escreva algo.
5. Clique em **Save / Publish**.
6. Em ~30 segundos o site rebuilda automaticamente com a alteração.

---

## Etapa 8 — Apontar o domínio `.com.br` (quando estiver pronto)

### No Registro.br
1. Painel do domínio → **Editar zona DNS**.
2. Crie os registros conforme orientação do Netlify (próximo passo).

### No Netlify
1. **Domain management → Add custom domain** → digite `projeto497rs.com.br`.
2. O Netlify mostra os DNS records (4 nameservers ou um conjunto A/CNAME).
3. **Recomendado:** delegar nameservers pro Netlify (mais simples e usa Netlify DNS).
   - No Registro.br, troque os 2 nameservers padrão por:
     ```
     dns1.p01.nsone.net
     dns2.p01.nsone.net
     dns3.p01.nsone.net
     dns4.p01.nsone.net
     ```
     *(o Netlify mostra os exatos na tela — copie de lá)*
4. Aguarde **1-24h** pela propagação DNS.
5. SSL/HTTPS automático (Let's Encrypt) — Netlify provisiona sozinho assim que o domínio resolve.

### `www` ou raiz?
Recomendo `projeto497rs.com.br` (sem www), e configurar o `www` como redirect. Netlify faz isso automaticamente quando você adiciona o domínio.

---

## Etapa 9 — Atualizar `astro.config.mjs` com o domínio final

Depois que o domínio funcionar, edite [astro.config.mjs](astro.config.mjs) e confirme que `site` está apontando pro domínio final. Já está como `https://projeto497rs.com.br` — se for outro, ajuste e faça commit.

---

## ⚠️ Observações importantes

### Custos
Tudo no **free tier** enquanto o site for pequeno:
- Netlify Free: 100 GB bandwidth/mês, 300 build minutes/mês
- Netlify Identity Free: 5 users (suficiente — você e seu pai usam 2)
- Domínio: ~R$ 40/ano

### O que NÃO fazer
- ❌ Não habilite **Netlify Forms** (paga e não precisamos)
- ❌ Não suba imagens grandes (>2 MB) sem otimizar — o CMS aceita, mas vai pesar o repo
- ❌ Não delete o arquivo `public/admin/config.yml` — é o coração do CMS

### Próxima fase (Cloudinary)
Quando vocês começarem a subir muitas fotos pelo CMS, vale conectar o Cloudinary direto na config (campo `media_library`). Isso descarrega as fotos do repo Git e otimiza automático. Posso configurar quando vocês estiverem nesse momento.

---

## 🔐 Segurança — Rotina de manutenção

### Rotação de credenciais R2 (a cada 6 meses)

O API Token do Cloudflare R2 dá acesso de leitura/escrita ao bucket. Se vazar (commit acidental, log esquecido, máquina comprometida), atacante pode subir/sobrescrever/apagar mídia. **Boa prática:** rotacionar a cada 6 meses ou imediatamente em caso de suspeita.

**Quando rotacionar:**
- 📅 A cada 6 meses (calendário fixo — última rotação: ____/____/____)
- 🚨 Imediatamente se: secret apareceu em commit, log, screenshot público, ou máquina foi comprometida
- 🔄 Quando ex-colaborador tinha acesso

**Como rotacionar (passo a passo, ~5 min):**

1. **Cloudflare → R2 → Manage API tokens**
2. Clica nos 3 pontinhos do token atual → **Roll** (gera novo Secret, mantém o Access Key ID)
   - **Ou** **Revoke** + **Create API token** novo
3. Copia os novos valores
4. **GitHub → Settings → Secrets and variables → Actions:**
   - Atualiza `R2_ACCESS_KEY_ID` (se mudou)
   - Atualiza `R2_SECRET_ACCESS_KEY`
5. **`.env` local** (na sua máquina):
   - Atualiza os mesmos valores
6. **Roda diagnóstico** pra confirmar:
   ```sh
   node scripts/r2-diagnose.mjs
   ```
   Deve listar o bucket `projeto497rs-midia`.

### Atualizar Decap CMS

A versão do Decap CMS está pinada com SRI em [src/pages/admin/index.astro](src/pages/admin/index.astro). **Nunca atualize sem recomputar o hash** — caso contrário o browser bloqueia o script.

```sh
# 1. Achar a versão atual
grep "decap-cms@" src/pages/admin/index.astro

# 2. Computar hash da nova versão
curl -sL https://unpkg.com/decap-cms@<NOVA_VERSAO>/dist/decap-cms.js \
  | openssl dgst -sha384 -binary | openssl base64 -A

# 3. Atualizar versão E hash em src/pages/admin/index.astro
```

### Monitorar Content Security Policy

CSP está em modo **Report-Only** ([netlify.toml](netlify.toml)). Após 1-2 semanas no ar:

1. Abre o site em modo dev (F12 → Console)
2. Se não tiver mensagens "Refused to load..." em cidades reais (não em developer tools), é seguro ativar
3. Em [netlify.toml](netlify.toml), troca:
   ```
   Content-Security-Policy-Report-Only = "..."
   ```
   por:
   ```
   Content-Security-Policy = "..."
   ```

### Atualização de dependências

Dependabot está habilitado em [.github/dependabot.yml](.github/dependabot.yml). PRs aparecem automaticamente. **Sempre revisar antes de fazer merge** — minor/patch geralmente seguros, major pode quebrar build.

---

## Resumo visual do fluxo

```
Você edita .md localmente               Pai edita pelo /admin
        │                                       │
        └────────► GitHub (main) ◄──────────────┘
                        │
                        ▼
                  Netlify Build
                        │
                        ▼
              projeto497rs.com.br
```

Cada commit → novo deploy. Tudo versionado, tudo reversível.
