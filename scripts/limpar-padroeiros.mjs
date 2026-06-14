// scripts/limpar-padroeiros.mjs
//
// Remove prefixos redundantes do campo `padroeiro` em todos os arquivos
// de cidade. O padroeiro deve ser o nome do santo/devoção apenas
// (ex: "Nossa Senhora da Conceição"), sem palavras genéricas como
// "Igreja", "Paróquia" ou "Matriz".
//
// Mantém termos legítimos como "Catedral" (que indica status especial),
// "Santuário" (idem) e "Capela" quando sozinhos não fazem sentido.
//
// Uso:
//   node scripts/limpar-padroeiros.mjs              # aplica
//   node scripts/limpar-padroeiros.mjs --dry-run    # só mostra o que mudaria

import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CIDADES_DIR = resolve(ROOT, "src/content/cidades");

const DRY_RUN = process.argv.includes("--dry-run");

/**
 * Limpa o nome do padroeiro removendo prefixos redundantes.
 * Retorna o valor limpo (string), null se ficou vazio, ou o original
 * se não tinha prefixo a remover.
 */
function limparPadroeiro(valor) {
  if (!valor) return null;

  let limpo = valor.trim();

  // Remove "Igreja [de/do/da/dos/das] " e "Paróquia [...]" e "Matriz [...]"
  limpo = limpo.replace(
    /^(Igreja|Paróquia|Paroquia|Matriz)\s+(de\s+|do\s+|da\s+|dos\s+|das\s+)?/i,
    ""
  );

  // Casos esquisitos que viraram lixo após o strip
  // (ex: "Igreja Católica" → "Católica", que não é padroeiro de verdade)
  const lixo = ["", "Católica", "Catolica"];
  if (lixo.includes(limpo)) return null;

  // Normalizações finais
  limpo = limpo.trim().replace(/\s+/g, " ").replace(/\.+$/, "");

  return limpo;
}

function setField(conteudo, chave, valor) {
  const fmMatch = conteudo.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return conteudo;
  const fm = fmMatch[1];
  const re = new RegExp(`^${chave}:.*$`, "m");
  if (!re.test(fm)) return conteudo; // campo não existe, não inventa
  const linha = `${chave}: ${valor}`;
  const novoFm = fm.replace(re, linha);
  return conteudo.replace(fmMatch[0], `---\n${novoFm}\n---`);
}

function getField(conteudo, chave) {
  const fmMatch = conteudo.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const re = new RegExp(`^${chave}:\\s*"?([^"\\n]*)"?\\s*$`, "m");
  const m = fmMatch[1].match(re);
  return m?.[1]?.trim() ?? null;
}

function fmtYaml(valor) {
  if (valor === null || valor === undefined || valor === "") return '""';
  return `"${String(valor).replace(/"/g, '\\"')}"`;
}

async function main() {
  const arquivos = (await readdir(CIDADES_DIR)).filter((f) => f.endsWith(".md"));
  let alterados = 0;
  let removidos = 0;
  const mudancas = [];

  for (const file of arquivos) {
    const path = join(CIDADES_DIR, file);
    const conteudo = await readFile(path, "utf8");
    const original = getField(conteudo, "padroeiro");
    if (!original) continue;

    const limpo = limparPadroeiro(original);
    if (limpo === original) continue; // nada a mudar

    mudancas.push({ file, original, limpo });

    if (limpo === null) {
      removidos++;
    } else {
      alterados++;
    }

    if (!DRY_RUN) {
      const novo = setField(conteudo, "padroeiro", fmtYaml(limpo));
      await writeFile(path, novo, "utf8");
    }
  }

  console.log(`\n${DRY_RUN ? "PREVIEW " : ""}Limpeza de padroeiros\n${"─".repeat(50)}`);

  for (const m of mudancas.slice(0, 50)) {
    const arrow = m.limpo === null ? "→ (removido)" : `→ "${m.limpo}"`;
    console.log(`  ${m.file.padEnd(35)} "${m.original}" ${arrow}`);
  }
  if (mudancas.length > 50) {
    console.log(`  … +${mudancas.length - 50} outros`);
  }

  console.log(`\n✔ ${alterados} simplificados`);
  console.log(`✘ ${removidos} removidos (eram só "Igreja Católica" ou similar)`);
  if (DRY_RUN) console.log("\n(dry-run: nenhum arquivo foi escrito)");
}

main().catch((err) => {
  console.error("✘ Falha:", err);
  process.exit(1);
});
