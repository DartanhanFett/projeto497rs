# Security Policy

## Reporting a vulnerability

**Private:** [GitHub Security Advisory](https://github.com/DartanhanFett/projeto497rs/security/advisories/new)

**Email:** `contato@projeto497rs.com.br`

Include description, reproduction steps and impact. Reply within 7 working days.

## Scope

**In:** public site, `cdn.` and `www.` subdomains, `/admin/` panel, repository.

**Out:** Cloudflare/Netlify/GitHub (report directly), social engineering, DDoS.

## Active hardenings

- HTTPS enforced (HSTS preload)
- Content Security Policy (Report-Only during initial observation)
- Subresource Integrity on external scripts (Decap CMS pinned)
- Sandboxed iframes
- Identity in invite-only mode
- Secrets in GitHub Secrets, never in code
- Six-month rotation cycle for R2 credentials
- Dependabot + CI blocking broken builds

Operational details in [docs/operations.md](docs/operations.md).
