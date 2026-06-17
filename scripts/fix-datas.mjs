// scripts/fix-datas.mjs
//
// Normaliza datas no frontmatter dos arquivos .md de cidades e
// curiosidades para o formato YYYY-MM-DD (ISO sem hora), que é o
// que o schema Zod do Astro espera.
//
// Cobre os formatos malucos que o Decap CMS pode salvar:
//   - "16/02/1959"            (DD/MM/YYYY brasileiro)
//   - "1959-02-16T10:30:00Z"  (ISO com hora — escopo do widget datetime)
//   - "1959-02-16T10:30:00.000Z"
//   - "16-02-1959"            (DD-MM-YYYY com hífen, raro)
//
// Não toca em datas que JÁ ESTÃO em YYYY-MM-DD.
//
// USO:
//   node scripts/fix-datas.mjs --dry-run   # mostra o que vai mudar
//   node scripts/fix-datas.mjs             # aplica
//
// Saída de processo:
//   - 0  = sucesso (com ou sem mudanças)
//   - 1  = erro inesperado

import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const DRY_RUN = process.argv.includes("--dry-run");

const DIRS = [
  resolve(ROOT, "src/content/cidades"),
  resolve(ROOT, "src/content/curiosidades"),
];

// Campos que devem ser data-only no schema
const CAMPOS_DATA = ["dataVisita", "fundacao", "data"];

/**
 * Normaliza um valor possivelmente representando uma data para o
 * formato YYYY-MM-DD. Retorna null se não for reconhecível.
 */
function normalizar(s) {
  if (!s) return null;
  let v = String(s).trim();
  // Remove aspas envolventes
  v = v.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  if (!v || v === "null") return null;

  // Já em ISO yyyy-mm-dd "puro"
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // ISO com hora (yyyy-mm-ddTHH:MM:SS[.ms][Z|+offset])
  let m = v.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (m) return m[1];

  // BR DD/MM/YYYY
  m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  // DD-MM-YYYY com hífen (raro)
  m = v.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  // Tentativa final: parsing nativo
  const d = new Date(v);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return null;
}

async function processarArquivo(path) {
  const original = await readFile(path, "utf8");
  const fmMatch = original.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  let fm = fmMatch[1];
  const mudancas = [];

  for (const campo of CAMPOS_DATA) {
    // Captura o valor cru depois do "campo:" até o fim da linha
    const re = new RegExp(`^(${campo}:\\s*)(.+)$`, "m");
    const linha = fm.match(re);
    if (!linha) continue;

    const valorCru = linha[2].trim();
    if (!valorCru || valorCru === "null") continue;

    // Se já está exatamente em YYYY-MM-DD sem aspas/hora, pula
    if (/^\d{4}-\d{2}-\d{2}$/.test(valorCru)) continue;

    const normalizado = normalizar(valorCru);
    if (!normalizado) {
      console.warn(`  ⚠ ${path}: não consegui normalizar "${campo}: ${valorCru}"`);
      continue;
    }

    if (normalizado === valorCru) continue;
    fm = fm.replace(re, `$1${normalizado}`);
    mudancas.push({ campo, de: valorCru, para: normalizado });
  }

  if (mudancas.length === 0) return null;
  return { novo: original.replace(fmMatch[0], `---\n${fm}\n---`), mudancas };
}

async function main() {
  console.log(`${DRY_RUN ? "DRY-RUN " : ""}Normalização de datas → YYYY-MM-DD`);
  console.log("─".repeat(60));

  let total = 0;
  let totalMudancas = 0;

  for (const dir of DIRS) {
    let arquivos;
    try {
      arquivos = (await readdir(dir)).filter((f) => f.endsWith(".md"));
    } catch {
      continue;
    }

    for (const file of arquivos) {
      const path = join(dir, file);
      const result = await processarArquivo(path);
      if (!result) continue;

      total++;
      totalMudancas += result.mudancas.length;
      console.log(`\n  ${dir.split(/[\\/]/).slice(-2).join("/")}/${file}`);
      for (const m of result.mudancas) {
        console.log(`    ${m.campo}: "${m.de}" → ${m.para}`);
      }
      if (!DRY_RUN) {
        await writeFile(path, result.novo, "utf8");
      }
    }
  }

  if (total === 0) {
    console.log("\n✔ Nenhuma data fora do padrão.");
  } else {
    console.log(
      `\n${DRY_RUN ? "Seriam" : "✔"} ${total} arquivo(s) ${DRY_RUN ? "" : "atualizado(s)"} (${totalMudancas} alterações)`
    );
    if (DRY_RUN) console.log("Pra aplicar: node scripts/fix-datas.mjs");
  }
}

main().catch((err) => {
  console.error("✘ Falha:", err);
  process.exit(1);
});
