// scripts/migrar-uploads-r2.mjs
//
// Sobe arquivos de public/uploads/ pro Cloudflare R2 e reescreve
// referências (de "/uploads/foo.jpg" para "https://cdn.../foo.jpg")
// em todos os markdowns/astro do projeto.
//
// Pensado pra rodar dentro de uma GitHub Action — depende das envs:
//   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET, R2_PUBLIC_URL
//
// Uso local (precisa setar essas envs):
//   node scripts/migrar-uploads-r2.mjs
//   node scripts/migrar-uploads-r2.mjs --dry-run

import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { lookup as lookupMime } from "mime-types";
import { readFile, writeFile, readdir, stat, unlink, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, relative } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const UPLOADS_DIR = resolve(ROOT, "public/uploads");

const DRY_RUN = process.argv.includes("--dry-run");

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ENDPOINT,
  R2_BUCKET,
  R2_PUBLIC_URL = "https://cdn.projeto497rs.com.br",
} = process.env;

if (!DRY_RUN) {
  for (const [k, v] of Object.entries({
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_ENDPOINT,
    R2_BUCKET,
  })) {
    if (!v) {
      console.error(`✘ Variável de ambiente ${k} não definida.`);
      process.exit(1);
    }
  }
}

const s3 = !DRY_RUN
  ? new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

/** Lista todos os arquivos em public/uploads/ recursivamente. */
async function listarUploads(dir = UPLOADS_DIR, prefix = "") {
  const entradas = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const arquivos = [];
  for (const e of entradas) {
    const path = join(dir, e.name);
    const key = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) {
      arquivos.push(...(await listarUploads(path, key)));
    } else if (e.isFile()) {
      arquivos.push({ path, key });
    }
  }
  return arquivos;
}

/** Verifica se objeto já existe no bucket. */
async function existeNoR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch (err) {
    if (err.$metadata?.httpStatusCode === 404 || err.name === "NotFound") return false;
    throw err;
  }
}

/** Upload de um arquivo pro R2. */
async function uploadArquivo({ path, key }) {
  const body = await readFile(path);
  const contentType = lookupMime(key) || "application/octet-stream";
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Cache agressivo — fotos são imutáveis (mesmo nome = mesmo conteúdo)
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
}

/** Lista arquivos de texto onde podem aparecer referências a /uploads/. */
async function listarTextos(dir = ROOT, ignorar = new Set([".git", "node_modules", "dist", ".astro", ".netlify", "public"])) {
  const arquivos = [];
  const entradas = await readdir(dir, { withFileTypes: true });
  for (const e of entradas) {
    if (ignorar.has(e.name)) continue;
    const path = join(dir, e.name);
    if (e.isDirectory()) {
      arquivos.push(...(await listarTextos(path, ignorar)));
    } else if (e.isFile()) {
      if (/\.(md|astro|ts|tsx|js|jsx|mjs|json|yml|yaml)$/i.test(e.name)) {
        arquivos.push(path);
      }
    }
  }
  return arquivos;
}

/**
 * Reescreve "/uploads/foo.jpg" → "https://cdn.projeto497rs.com.br/foo.jpg"
 * Suporta caminhos com aspas, em listas YAML, etc.
 */
function reescreverConteudo(texto, publicUrl) {
  // Match simples: /uploads/<algo-sem-espaço-ou-aspas>
  return texto.replace(/(?<![:/\w])\/uploads\/([^\s"'`]+)/g, (_, file) => {
    return `${publicUrl}/${file}`;
  });
}

async function main() {
  console.log(`${DRY_RUN ? "DRY-RUN " : ""}Migração public/uploads/ → R2`);
  console.log("─".repeat(60));

  const uploads = await listarUploads();
  if (uploads.length === 0) {
    console.log("Nada em public/uploads/. Nada a fazer.");
    return;
  }
  console.log(`Encontrados ${uploads.length} arquivos pra migrar.`);

  let enviados = 0;
  let pulados = 0;

  for (const arq of uploads) {
    const tamanho = (await stat(arq.path)).size;
    const tamanhoFmt = `${(tamanho / 1024).toFixed(0)} KB`;

    if (DRY_RUN) {
      console.log(`  [dry] ${arq.key.padEnd(40)} ${tamanhoFmt}`);
      enviados++;
      continue;
    }

    try {
      const ja = await existeNoR2(arq.key);
      if (ja) {
        console.log(`  = ${arq.key.padEnd(40)} ${tamanhoFmt} (já existia)`);
        pulados++;
      } else {
        await uploadArquivo(arq);
        console.log(`  ✓ ${arq.key.padEnd(40)} ${tamanhoFmt}`);
        enviados++;
      }
    } catch (err) {
      console.error(`  ✘ ${arq.key}: ${err.message}`);
      throw err;
    }
  }

  // Reescrever referências
  console.log(`\nReescrevendo referências em arquivos do projeto…`);
  const textos = await listarTextos();
  let atualizados = 0;
  for (const path of textos) {
    const original = await readFile(path, "utf8");
    const novo = reescreverConteudo(original, R2_PUBLIC_URL);
    if (novo !== original) {
      if (!DRY_RUN) await writeFile(path, novo, "utf8");
      atualizados++;
      console.log(`  ↻ ${relative(ROOT, path)}`);
    }
  }

  // Apagar local
  if (!DRY_RUN) {
    console.log(`\nLimpando public/uploads/…`);
    for (const arq of uploads) {
      await unlink(arq.path);
    }
    // Limpa subpastas vazias
    try {
      const restantes = await readdir(UPLOADS_DIR);
      for (const sub of restantes) {
        const subPath = join(UPLOADS_DIR, sub);
        const st = await stat(subPath);
        if (st.isDirectory()) {
          await rm(subPath, { recursive: true, force: true });
        }
      }
    } catch {}
  }

  console.log(`\n✔ ${enviados} enviados pro R2`);
  console.log(`= ${pulados} já existiam no R2`);
  console.log(`↻ ${atualizados} arquivos atualizados`);
  if (DRY_RUN) console.log("\n(dry-run: nada foi enviado nem apagado)");
}

main().catch((err) => {
  console.error("✘ Falha:", err);
  process.exit(1);
});
