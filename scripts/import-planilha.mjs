// scripts/import-planilha.mjs
//
// Importa dados da planilha "Municípios RS visitados.xlsx" para os
// arquivos markdown em src/content/cidades/.
//
// Estratégia:
//   - Match por NOME (slug normalizado), pois a planilha não tem código IBGE.
//   - Atualiza apenas campos vindos da planilha: populacao, areaKm2,
//     status, dataVisita, padroeiro.
//   - Preserva todo o resto (resumo, fotos, curiosidades, body MD).
//   - Reporta cidades da planilha que não bateram com nenhum arquivo
//     (geralmente diferenças ortográficas — corrigir manualmente).
//
// Uso: node scripts/import-planilha.mjs [--dry-run]

import XLSX from "xlsx";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PLANILHA = resolve(ROOT, "reference/Municípios RS visitados.xlsx");
const CIDADES_DIR = resolve(ROOT, "src/content/cidades");

const DRY_RUN = process.argv.includes("--dry-run");

function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Aliases para diferenças entre o nome da planilha e o nome oficial do IBGE.
 * Sempre mapeie do slug-da-planilha → slug-do-IBGE.
 */
const ALIASES = {
  "santana-do-livramento": "sant-ana-do-livramento",
};

function resolveSlug(nomePlanilha) {
  const s = slugify(nomePlanilha);
  return ALIASES[s] ?? s;
}

/** Excel serial date → ISO yyyy-mm-dd. */
function excelToDate(serial) {
  if (!serial || typeof serial !== "number") return null;
  // Excel epoch: 1899-12-30. 86400000 ms/day.
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms).toISOString().slice(0, 10);
}

/** Limpa campo de igreja: trim, remove prefixos genéricos. */
function limparIgreja(s) {
  if (!s) return null;
  let limpo = s.trim().replace(/\s+/g, " ");
  // Remove "Igreja [de/do/da/dos/das] " e "Paróquia [...]" e "Matriz [...]"
  limpo = limpo.replace(
    /^(Igreja|Paróquia|Paroquia|Matriz)\s+(de\s+|do\s+|da\s+|dos\s+|das\s+)?/i,
    ""
  );
  // Casos esquisitos que viraram lixo após o strip
  if (["", "Católica", "Catolica"].includes(limpo)) return null;
  return limpo.replace(/\.+$/, "");
}

/** Atualiza ou insere uma linha no frontmatter (entre os --- ---). */
function setFrontmatterField(conteudo, chave, valor) {
  const fmMatch = conteudo.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return conteudo;

  const fm = fmMatch[1];
  const linha = `${chave}: ${valor}`;
  const re = new RegExp(`^${chave}:.*$`, "m");

  let novoFm;
  if (re.test(fm)) {
    novoFm = fm.replace(re, linha);
  } else {
    // Inserir antes da última linha do frontmatter
    novoFm = fm + "\n" + linha;
  }

  return conteudo.replace(fmMatch[0], `---\n${novoFm}\n---`);
}

function fmtYaml(valor) {
  if (valor === null || valor === undefined) return "null";
  if (typeof valor === "number") return String(valor);
  // String — sempre com aspas duplas, escapando aspas internas
  return `"${String(valor).replace(/"/g, '\\"')}"`;
}

async function main() {
  console.log("→ Lendo planilha…");
  const wb = XLSX.readFile(PLANILHA);
  const data = XLSX.utils.sheet_to_json(wb.Sheets["Página1"], { defval: null });
  console.log(`  ✓ ${data.length} linhas`);

  // Index de arquivos existentes por slug
  const arquivos = (await readdir(CIDADES_DIR)).filter((f) => f.endsWith(".md"));
  const slugsExistentes = new Set(arquivos.map((f) => f.replace(/\.md$/, "")));

  let atualizados = 0;
  let semMatch = [];
  let visitadas = 0;
  let comIgreja = 0;

  for (const row of data) {
    const cidade = row["Cidade"];
    if (!cidade) continue;

    const slug = resolveSlug(cidade);
    if (!slugsExistentes.has(slug)) {
      semMatch.push(cidade);
      continue;
    }

    const path = join(CIDADES_DIR, `${slug}.md`);
    let conteudo = await readFile(path, "utf8");

    // Mapeamento dos campos
    const populacao = row["Pop.\n(Estim. 2019)[2]"] ?? row["Pop.\n(Censo2010)[1]"] ?? null;
    const areaKm2 = row["Área (km²)"] ?? null;
    const dataVisitaIso = excelToDate(row["Visitado"]);
    const padroeiro = limparIgreja(row["Igreja visitada"]);

    // Status: se tem data → visitada. Sem data e sem igreja → pendente.
    // Edge case: tem igreja mas não tem data → marcamos como visitada também
    // (a presença de igreja confirma que estiveram lá).
    let status = "pendente";
    if (dataVisitaIso || padroeiro) status = "visitada";

    if (status === "visitada") visitadas++;
    if (padroeiro) comIgreja++;

    // Aplicar
    conteudo = setFrontmatterField(conteudo, "populacao", fmtYaml(populacao));
    conteudo = setFrontmatterField(conteudo, "areaKm2", fmtYaml(areaKm2));
    conteudo = setFrontmatterField(conteudo, "status", status);
    if (dataVisitaIso) {
      conteudo = setFrontmatterField(conteudo, "dataVisita", dataVisitaIso);
    }
    if (padroeiro) {
      conteudo = setFrontmatterField(conteudo, "padroeiro", fmtYaml(padroeiro));
    }

    if (!DRY_RUN) {
      await writeFile(path, conteudo, "utf8");
    }
    atualizados++;
  }

  console.log(`\n✔ ${atualizados} arquivos ${DRY_RUN ? "seriam " : ""}atualizados`);
  console.log(`  · ${visitadas} marcadas como visitadas`);
  console.log(`  · ${comIgreja} com padroeiro/igreja preenchido`);

  if (semMatch.length > 0) {
    console.log(`\n⚠ ${semMatch.length} cidades da planilha sem match no IBGE:`);
    semMatch.forEach((c) => console.log(`  - ${c} (slug tentado: ${resolveSlug(c)})`));
    console.log(
      "  (verifique grafias com acento ou diferenças. Ex: 'Sant'Ana do Livramento' vs 'Santana do Livramento')"
    );
  }

  if (DRY_RUN) {
    console.log("\n(dry-run: nenhum arquivo foi escrito)");
  }
}

main().catch((err) => {
  console.error("✘ Falha:", err);
  process.exit(1);
});
