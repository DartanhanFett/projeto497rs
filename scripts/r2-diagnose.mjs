// scripts/r2-diagnose.mjs
//
// Diagnóstico das credenciais R2: lista buckets acessíveis com o
// token configurado no .env. Sem escrever nada, sem efeitos colaterais.
//
// Uso: node scripts/r2-diagnose.mjs

import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Carregar .env (mesma lógica do migrar-uploads-r2.mjs)
const envPath = resolve(ROOT, ".env");
if (existsSync(envPath)) {
  for (const linha of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = linha.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim().replace(/^"(.*)"$/, "$1");
    if (!process.env[k]) process.env[k] = v;
  }
}

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ENDPOINT,
  R2_BUCKET,
} = process.env;

// Mostra um preview dos valores (mascarados) pra ajudar a debugar
function preview(s, mostrarPrimeiros = 4, mostrarUltimos = 2) {
  if (!s) return "(VAZIO)";
  if (s.length <= 8) return "*".repeat(s.length);
  return s.slice(0, mostrarPrimeiros) + "…" + s.slice(-mostrarUltimos);
}

console.log("Variáveis carregadas:");
console.log(`  R2_ACCESS_KEY_ID:     ${preview(R2_ACCESS_KEY_ID)} (length ${R2_ACCESS_KEY_ID?.length ?? 0})`);
console.log(`  R2_SECRET_ACCESS_KEY: ${preview(R2_SECRET_ACCESS_KEY, 0, 4)} (length ${R2_SECRET_ACCESS_KEY?.length ?? 0})`);
console.log(`  R2_ENDPOINT:          ${R2_ENDPOINT}`);
console.log(`  R2_BUCKET:            ${R2_BUCKET}`);

// Validações simples antes de chamar a API
const probs = [];
if (!R2_ACCESS_KEY_ID) probs.push("R2_ACCESS_KEY_ID vazio");
if (!R2_SECRET_ACCESS_KEY) probs.push("R2_SECRET_ACCESS_KEY vazio");
if (!R2_ENDPOINT) probs.push("R2_ENDPOINT vazio");
if (!R2_BUCKET) probs.push("R2_BUCKET vazio");
if (R2_ENDPOINT && !R2_ENDPOINT.startsWith("https://")) probs.push("R2_ENDPOINT deveria começar com https://");
if (R2_ENDPOINT && R2_ENDPOINT.endsWith("/")) probs.push("R2_ENDPOINT não deve terminar com /");
if (R2_ACCESS_KEY_ID && /\s/.test(R2_ACCESS_KEY_ID)) probs.push("R2_ACCESS_KEY_ID tem espaço/quebra de linha");
if (R2_SECRET_ACCESS_KEY && /\s/.test(R2_SECRET_ACCESS_KEY)) probs.push("R2_SECRET_ACCESS_KEY tem espaço/quebra de linha");

if (probs.length > 0) {
  console.error("\n✘ Problemas encontrados antes de tentar conectar:");
  for (const p of probs) console.error(`  - ${p}`);
  process.exit(1);
}

console.log("\n→ Tentando listar buckets…\n");

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

try {
  const res = await s3.send(new ListBucketsCommand({}));
  const buckets = res.Buckets ?? [];
  if (buckets.length === 0) {
    console.log("⚠ Nenhum bucket encontrado nesta conta.");
    console.log("  → Provável: o token foi gerado pra OUTRA conta, ou o");
    console.log("    bucket foi criado mas não está visível pelo token.");
  } else {
    console.log(`✔ Conexão OK. ${buckets.length} bucket(s) acessíveis:`);
    for (const b of buckets) console.log(`  - ${b.Name}`);

    if (!buckets.some((b) => b.Name === R2_BUCKET)) {
      console.warn(`\n⚠ R2_BUCKET="${R2_BUCKET}" NÃO está na lista acima.`);
      console.warn("  → Confirme o nome exato no dashboard R2 e atualize .env");
    } else {
      console.log(`\n✔ R2_BUCKET="${R2_BUCKET}" confirmado!`);
    }
  }
} catch (err) {
  console.error("✘ Falha na chamada:");
  console.error(`  Status HTTP: ${err.$metadata?.httpStatusCode}`);
  console.error(`  Mensagem:    ${err.message}`);
  console.error(`  Code:        ${err.Code ?? err.name ?? "(sem code)"}`);
  console.error("\nDiagnóstico:");
  if (err.$metadata?.httpStatusCode === 401) {
    console.error("  • 401 Unauthorized = credenciais inválidas.");
    console.error("    → Access Key ID ou Secret Access Key estão errados.");
    console.error("    → Verifique se copiou os valores certos da etapa 4 do SETUP-R2.md");
    console.error("    → Pode ter vindo um espaço ou caractere extra na cópia.");
    console.error("    → Se persistir, gera um novo API Token e tenta de novo.");
  } else if (err.$metadata?.httpStatusCode === 403) {
    console.error("  • 403 Forbidden = credenciais existem, mas sem permissão.");
    console.error("    → Verifica se o token foi criado com 'Object Read & Write'.");
  } else if (err.message?.includes("getaddrinfo")) {
    console.error("  • Erro de DNS = R2_ENDPOINT errado.");
    console.error("    → Confere o endpoint exato no painel R2.");
  }
  process.exit(1);
}
