// scripts/limpar-r2.mjs
//
// Apaga objetos do bucket R2. Pensado pra "começar do zero" antes do
// lançamento, removendo todas as fotos de teste enviadas durante o
// desenvolvimento.
//
// USO:
//   node scripts/limpar-r2.mjs --listar               # só lista (não apaga)
//   node scripts/limpar-r2.mjs --apagar-tudo --confirmar  # apaga TUDO no bucket
//   node scripts/limpar-r2.mjs --prefixo gramado/ --apagar --confirmar
//
// Por design, sem --confirmar não apaga nada (proteção dupla).
//
// Credenciais: lê de .env (mesmo padrão de migrar-uploads-r2.mjs).

import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Carrega .env (mesma lógica dos outros scripts)
if (!process.env.GITHUB_ACTIONS) {
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
}

const args = process.argv.slice(2);
const LISTAR = args.includes("--listar");
const APAGAR_TUDO = args.includes("--apagar-tudo");
const APAGAR = args.includes("--apagar") || APAGAR_TUDO;
const CONFIRMAR = args.includes("--confirmar");
const prefixoArg = args.find((a) => a.startsWith("--prefixo="))?.slice("--prefixo=".length) ?? "";

if (!LISTAR && !APAGAR) {
  console.error("✘ Esse script faz alterações destrutivas. Use uma das flags:");
  console.error("   --listar                                lista objetos (não apaga)");
  console.error("   --apagar-tudo --confirmar               apaga TUDO no bucket");
  console.error("   --prefixo=<x> --apagar --confirmar      apaga só os com esse prefixo");
  process.exit(1);
}

if (APAGAR && !CONFIRMAR) {
  console.error("✘ Apagar requer também --confirmar pra evitar acidente.");
  process.exit(1);
}

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ENDPOINT,
  R2_BUCKET,
} = process.env;

for (const [k, v] of Object.entries({
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ENDPOINT,
  R2_BUCKET,
})) {
  if (!v) {
    console.error(`✘ Variável ${k} não definida no .env`);
    process.exit(1);
  }
}

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/** Lista todos os objetos paginadamente (R2 retorna até 1000 por página). */
async function listarTodos(prefixo) {
  const objetos = [];
  let token;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: prefixo || undefined,
        ContinuationToken: token,
      })
    );
    if (res.Contents) objetos.push(...res.Contents);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return objetos;
}

async function main() {
  const prefixo = APAGAR_TUDO ? "" : prefixoArg;
  console.log(`Bucket: ${R2_BUCKET}`);
  console.log(`Prefixo: ${prefixo || "(tudo)"}`);
  console.log("─".repeat(60));

  const objetos = await listarTodos(prefixo);
  if (objetos.length === 0) {
    console.log("Nenhum objeto encontrado.");
    return;
  }

  console.log(`${objetos.length} objetos:`);
  for (const o of objetos.slice(0, 20)) {
    const tamanho = o.Size ? `${(o.Size / 1024).toFixed(0)} KB` : "?";
    console.log(`  ${o.Key.padEnd(50)} ${tamanho}`);
  }
  if (objetos.length > 20) console.log(`  … +${objetos.length - 20} outros`);

  if (LISTAR) {
    const totalSize = objetos.reduce((s, o) => s + (o.Size ?? 0), 0);
    console.log(`\nTotal: ${objetos.length} objetos, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    return;
  }

  // APAGAR
  console.log(`\n→ Apagando ${objetos.length} objetos…`);
  // R2/S3 permite até 1000 por DeleteObjects
  const chunks = [];
  for (let i = 0; i < objetos.length; i += 1000) chunks.push(objetos.slice(i, i + 1000));

  let apagados = 0;
  for (const chunk of chunks) {
    const res = await s3.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: {
          Objects: chunk.map((o) => ({ Key: o.Key })),
          Quiet: true,
        },
      })
    );
    apagados += chunk.length - (res.Errors?.length ?? 0);
    if (res.Errors?.length) {
      console.error(`  ⚠ ${res.Errors.length} falhas:`);
      for (const e of res.Errors) console.error(`    ${e.Key}: ${e.Message}`);
    }
  }

  console.log(`✔ ${apagados}/${objetos.length} apagados.`);
}

main().catch((err) => {
  console.error("✘ Falha:", err);
  process.exit(1);
});
