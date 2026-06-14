# Setup do Cloudflare R2 — Projeto 497 RS

Guia passo-a-passo pra configurar o storage de fotos. Tempo total: **~15 min**.

> **O que é R2?** Storage de objetos da Cloudflare, similar ao S3 da AWS, mas
> com **bandwidth ilimitado de saída grátis** (zero egress fee). Único no
> mercado. Free tier: 10 GB de storage. Depois disso, ~$0.015/GB/mês
> (≈ R$ 0,08/GB/mês).

---

## Pré-requisitos

- Conta Cloudflare (grátis): https://dash.cloudflare.com/sign-up
- Domínio `projeto497rs.com.br` adicionado à Cloudflare
  *(se ainda não, faz isso primeiro: Add a Site → digita o domínio → seleciona Free → Cloudflare te dá nameservers pra trocar no Registro.br)*

---

## Etapa 1 — Habilitar R2

1. Login na Cloudflare → **R2 Object Storage** no menu lateral.
2. Vai aparecer "Subscribe to R2" — aceite. **Não cobra nada**, mas precisa de cartão cadastrado pra "garantia" (cobrança só acontece se passar do free tier).
3. Cartão de crédito → preencher e confirmar.

> Sem cadastrar cartão, R2 não libera. É a única chatice — mas a Cloudflare não cobra surpresa: se passar dos 10 GB e tu não tiver alertado, eles te avisam por email antes.

---

## Etapa 2 — Criar o bucket

1. Em **R2 Object Storage** → **Create bucket**.
2. **Bucket name:** `projeto497rs-midia`
3. **Location:** Automatic (vai escolher a região mais próxima).
4. **Storage class:** Standard
5. **Create bucket**.

---

## Etapa 3 — Tornar o bucket público (com domínio próprio)

Por padrão R2 é privado. Vamos expor via subdomínio `cdn.projeto497rs.com.br`.

1. Dentro do bucket recém-criado → aba **Settings**.
2. Em **Public access** → **Custom domain** → **Connect domain**.
3. Digite: `cdn.projeto497rs.com.br`
4. Clique **Continue** → confirma.

A Cloudflare cria automaticamente o DNS pra esse subdomínio (precisa que `projeto497rs.com.br` já esteja na Cloudflare). Em ~1-2 min, `https://cdn.projeto497rs.com.br/<arquivo>` já serve o conteúdo do bucket.

---

## Etapa 4 — Criar API Token (pra GitHub Actions usar)

1. R2 → **Manage API tokens** (canto superior direito da seção R2).
2. **Create API token**.
3. **Token name:** `projeto-497-rs github actions`
4. **Permissions:** **Object Read & Write**
5. **Specify bucket:** seleciona apenas `projeto497rs-midia`
6. **TTL:** Forever (deixa a cargo do nosso uso — pode revogar depois)
7. **Create API Token**.

A tela vai mostrar (anote, não vai aparecer de novo):

```
Access Key ID:        XXXXXXXXXXXXXX
Secret Access Key:    YYYYYYYYYYYYYY
Endpoint S3:          https://<account-id>.r2.cloudflarestorage.com
```

> **IMPORTANTE:** Esses 3 valores vão como secrets no GitHub. Não compartilhe
> em chat, screenshot, ou qualquer lugar público.

---

## Etapa 5 — Adicionar secrets no GitHub

No repositório `projeto-497-rs` no GitHub:

1. **Settings → Secrets and variables → Actions → New repository secret**
2. Cria 4 secrets:

| Nome do secret | Valor |
|---|---|
| `R2_ACCESS_KEY_ID` | Access Key ID da etapa 4 |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key da etapa 4 |
| `R2_ENDPOINT` | Endpoint S3 (ex: `https://abc123.r2.cloudflarestorage.com`) |
| `R2_BUCKET` | `projeto497rs-midia` |

---

## Etapa 6 — Confirmar o domínio público

Abre `https://cdn.projeto497rs.com.br/` no navegador. Deve dar erro **404** (e não erro de DNS) — isso é correto, significa que o subdomínio resolve, mas o bucket está vazio.

Se der **erro de DNS** ("não foi possível encontrar"), espera mais 5 min e tenta de novo. Se persistir, volta na Etapa 3.

---

## ✅ Pronto na sua parte

Volta pro Claude e diz **"R2 configurado"**. Ele vai:
1. Criar a GitHub Action que migra automaticamente as fotos pro R2
2. Atualizar o template das cidades pra suportar URLs absolutas
3. Documentar o fluxo no README
4. Fazer um teste end-to-end

---

## 💰 Custos esperados

- **Hoje (0 fotos):** R$ 0
- **Daqui 6 meses (~5 GB de fotos):** R$ 0
- **Daqui 2 anos (~30 GB):** ~R$ 2,50/mês (20 GB acima do free × $0.015)
- **Cenário viralizando (~100 GB):** ~R$ 11/mês

A bandwidth (gente acessando o site e baixando as fotos) é **sempre gratuita** no R2, então mesmo se viralizar, o custo só aumenta com o storage.
