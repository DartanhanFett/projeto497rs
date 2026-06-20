# Cloudflare R2 setup

Media storage. Free tier: 10 GB + unlimited egress.

Prerequisite: domain added to Cloudflare (nameservers delegated).

## Bucket

1. Cloudflare → **R2 Object Storage** → enable (asks for a card as a hold;
   no charge inside the free tier)
2. **Create bucket** → `projeto497rs-midia` → Automatic location, Standard storage

## Public domain

Bucket → **Settings → Public access → Custom domain → Connect domain**

Enter `cdn.projeto497rs.com.br`. Cloudflare creates the DNS record itself.
After 1-2 minutes, `https://cdn.projeto497rs.com.br/<file>` serves bucket content.

## API token

R2 → **Manage API tokens → Create API token**

- Permissions: **Object Read & Write**
- Specify bucket: `projeto497rs-midia` (this one only)
- TTL: Forever

Copy these (shown once):
- `Access Key ID`
- `Secret Access Key`
- `Endpoint S3` (something like `https://<account-id>.r2.cloudflarestorage.com`)

## GitHub secrets

Repo → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `R2_ACCESS_KEY_ID` | Access Key ID |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key |
| `R2_ENDPOINT` | S3 endpoint |
| `R2_BUCKET` | `projeto497rs-midia` |

Same variables in local `.env` to run scripts manually.

## Validate

```sh
node scripts/r2-diagnose.mjs
```

Should list `projeto497rs-midia` in the account.

## Costs

| Volume | /month |
|---|---|
| Up to 10 GB | R$ 0 |
| 30 GB | ~R$ 2.50 |
| 100 GB | ~R$ 11 |

Egress is always free — costs only grow with storage.
