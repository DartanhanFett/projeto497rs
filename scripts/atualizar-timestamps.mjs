// scripts/atualizar-timestamps.mjs
//
// Atualiza o campo `atualizadoEm` no frontmatter de todos os .md de
// cidades e curiosidades, com a data do último commit que tocou cada
// arquivo. Apenas escreve quando o valor mudaria — então é idempotente
// e não polui git com no-ops.
//
// Pensado pra rodar dentro de uma GitHub Action, mas funciona local também.
//
// USO:
//   node scripts/atualizar-timestamps.mjs              # atualiza todos
//   node scripts/atualizar-timestamps.mjs --dry-run    # mostra o que mudaria

import { readFile, writeFile, readdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, relative } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const DRY_RUN = process.argv.includes("--dry-run");

const DIRS = [
  resolve(ROOT, "src/content/cidades"),
  resolve(ROOT, "src/content/curiosidades"),
];

/**
 * Pega a data ISO (YYYY-MM-DD) do último commit que tocou o arquivo.
 * Se o arquivo não está no git ainda, retorna null.
 */
function ultimaModificacaoGit(path) {
  const rel = relative(ROOT, path).replace(/\\/g, "/");
  try {
    const out = execSync(`git log -1 --format=%cs -- "${rel}"`, {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    return out || null;          // %cs já é YYYY-MM-DD
  } catch {
    return null;
  }
}

function getField(fm, chave) {
  const re = new RegExp(`^${chave}:\\s*(.*)$`, "m");
  const m = fm.match(re);
  if (!m) return null;
  return m[1].trim().replace(/^"(.*)"$/, "$1");
}

function setField(fm, chave, valor) {
  const linha = `${chave}: ${valor}`;
  const re = new RegExp(`^${chave}:.*$`, "m");
  if (re.test(fm)) return fm.replace(re, linha);
  // Insere depois de `status:` ou no fim
  if (/^status:.*$/m.test(fm)) {
    return fm.replace(/^(status:.*)$/m, `$1\n${linha}`);
  }
  return `${fm}\n${linha}`;
}

async function processar(path) {
  const original = await readFile(path, "utf8");
  const fmMatch = original.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const data = ultimaModificacaoGit(path);
  if (!data) return null;

  const atual = getField(fmMatch[1], "atualizadoEm");
  if (atual === data) return null; // nada a mudar

  const novoFm = setField(fmMatch[1], "atualizadoEm", data);
  const novo = original.replace(fmMatch[0], `---\n${novoFm}\n---`);
  return { novo, de: atual ?? "(vazio)", para: data };
}

async function main() {
  console.log(`${DRY_RUN ? "DRY-RUN " : ""}Atualizando atualizadoEm`);
  console.log("─".repeat(60));

  let total = 0;

  for (const dir of DIRS) {
    let arquivos;
    try {
      arquivos = (await readdir(dir)).filter((f) => f.endsWith(".md"));
    } catch {
      continue;
    }

    for (const file of arquivos) {
      const path = join(dir, file);
      const result = await processar(path);
      if (!result) continue;

      total++;
      console.log(`  ${dir.split(/[\\/]/).slice(-2).join("/")}/${file}: ${result.de} → ${result.para}`);
      if (!DRY_RUN) {
        await writeFile(path, result.novo, "utf8");
      }
    }
  }

  console.log(`\n${total === 0 ? "= Nenhuma mudança" : DRY_RUN ? `Seriam ${total} atualizações` : `✔ ${total} atualizados`}`);
  if (DRY_RUN) console.log("Pra aplicar: node scripts/atualizar-timestamps.mjs");
}

main().catch((err) => {
  console.error("✘ Falha:", err);
  process.exit(1);
});
