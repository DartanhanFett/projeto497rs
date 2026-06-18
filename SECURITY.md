# Política de Segurança — Projeto 497 RS

## 📬 Reportando uma vulnerabilidade

Se você encontrou uma vulnerabilidade de segurança neste projeto:

### Use o canal privado preferencialmente

**[GitHub Security Advisory](https://github.com/DartanhanFett/projeto497rs/security/advisories/new)** — relatório privado, só os mantenedores veem.

### Por email
Se preferir email: **contato@projeto497rs.com.br**

### O que incluir
- Descrição da vulnerabilidade
- Passos pra reproduzir (de preferência com proof-of-concept não-destrutivo)
- Impacto potencial
- Se aplicável, sugestão de correção

### O que esperar
- Confirmação de recebimento em até **3 dias úteis**
- Análise inicial em até **7 dias úteis**
- Correção priorizada por severidade
- Crédito público (se você quiser) após o patch

## 🚫 Por favor NÃO

- Tente exploração ativa em produção (`projeto497rs.com.br`)
- Faça pentests automatizados sem aviso prévio (vai parecer ataque real)
- Teste vulnerabilidades em volume de tráfego que afete usuários reais
- Acesse, modifique ou exfiltre dados que não sejam públicos

## ✅ Tudo bem

- Reportar findings em ambiente isolado/local
- Análise estática de código
- Análise de configuração (headers, DNS, etc)
- Reportar dependências vulneráveis

## 🔭 Escopo

### In-scope
- Site público em `https://projeto497rs.com.br`
- Subdomínios oficiais (`cdn.projeto497rs.com.br`, `www.projeto497rs.com.br`)
- Painel admin em `/admin/`
- Repositório `github.com/DartanhanFett/projeto497rs`

### Out-of-scope
- Cloudflare, Netlify, GitHub (reporte direto a eles)
- Engenharia social contra mantenedores ou usuários
- Ataques físicos
- DoS / DDoS

## 🛡️ Hardenings já implementados

- HTTPS forçado (HSTS preload)
- Content Security Policy (em modo Report-Only durante observação)
- Subresource Integrity em scripts externos (Decap CMS)
- iframes em sandbox restrito
- Identity em modo invite-only (sem registro público)
- Secrets em GitHub Secrets (nunca em código)
- Rotação periódica de credenciais R2 (cada 6 meses)
- Dependabot habilitado pra atualizações de dependências

Veja [DEPLOY.md](DEPLOY.md#-segurança--rotina-de-manutenção) pra detalhes operacionais.
