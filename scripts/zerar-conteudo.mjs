// scripts/zerar-conteudo.mjs
//
// Reset do CONTEÚDO EDITORIAL das cidades + apaga curiosidades.
//
// O QUE ZERA (cidades):
//   - status → pendente
//   - dataVisita → removido
//   - resumo, capa → vazio
//   - fotos, reels, curiosidades, atracoes, ondeComer, ondeDormir, festas → []
//   - secretariaTurismo → removido
//   - body markdown → comentário padrão "<!-- escreva aqui... -->"
//
// O QUE PRESERVA (cidades):
//   - codigo, nome, microrregiao, mesorregiao (IBGE)
//   - populacao, areaKm2 (planilha)
//   - padroeiro (planilha)
//   - historiaResumo, fundacao, gentilico (Wikipedia)
//
// O QUE FAZ (curiosidades):
//   - Apaga TODOS os arquivos em src/content/curiosidades/
//
// USO:
//   node scripts/zerar-conteudo.mjs --dry-run   # mostra o que vai mudar
//   node scripts/zerar-conteudo.mjs --confirmar # executa
//
// Por design, sem nenhuma das flags ele NÃO faz nada (proteção contra
// rodar sem querer).

import { readFile, writeFile, readdir, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CIDADES_DIR = resolve(ROOT, "src/content/cidades");
const CURIOSIDADES_DIR = resolve(ROOT, "src/content/curiosidades");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const CONFIRMAR = args.includes("--confirmar");

if (!DRY_RUN && !CONFIRMAR) {
  console.error("✘ Esse script faz alterações destrutivas. Use uma das flags:");
  console.error("   node scripts/zerar-conteudo.mjs --dry-run    (simula, não escreve)");
  console.error("   node scripts/zerar-conteudo.mjs --confirmar  (executa de verdade)");
  process.exit(1);
}

// ─── Cidades ────────────────────────────────────────────────────────

/** Campos do frontmatter que serão preservados do arquivo original. */
const CAMPOS_PRESERVADOS = [
  "codigo",
  "nome",
  "microrregiao",
  "mesorregiao",
  "populacao",
  "areaKm2",
  "padroeiro",
  "historiaResumo",
  "fundacao",
  "gentilico",
  "toponimia",
  "aniversario",
  "siteOficial",
];

function fmtYaml(valor) {
  if (valor === null || valor === undefined || valor === "") return '""';
  if (typeof valor === "number") return String(valor);
  if (typeof valor === "boolean") return String(valor);
  // Datas no formato yyyy-mm-dd ficam sem aspas
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  return `"${String(valor).replace(/"/g, '\\"')}"`;
}

/** Extrai o valor de um campo do frontmatter (linha simples). */
function getField(fm, chave) {
  const re = new RegExp(`^${chave}:\\s*(.*)$`, "m");
  const m = fm.match(re);
  if (!m) return null;
  let v = m[1].trim();
  if (v === "null" || v === '""' || v === "") return null;
  // Remove aspas se for string entre aspas
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\"/g, '"');
  return v;
}

/** Reconstrói o arquivo da cidade do zero, preservando só os campos selecionados. */
function reconstruirCidade(conteudoOriginal) {
  const fmMatch = conteudoOriginal.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return conteudoOriginal;
  const fm = fmMatch[1];

  // Coleta os valores preservados
  const preservados = {};
  for (const c of CAMPOS_PRESERVADOS) {
    const v = getField(fm, c);
    if (v !== null) preservados[c] = v;
  }

  const nome = preservados.nome ?? "Cidade";
  const populacao = preservados.populacao ? Number(preservados.populacao) : null;
  const areaKm2 = preservados.areaKm2 ? Number(preservados.areaKm2) : null;

  // Constrói novo frontmatter na ordem canônica
  const linhas = [
    "---",
    `codigo: ${fmtYaml(preservados.codigo)}`,
    `nome: ${fmtYaml(preservados.nome)}`,
    `microrregiao: ${preservados.microrregiao ? fmtYaml(preservados.microrregiao) : "null"}`,
    `mesorregiao: ${preservados.mesorregiao ? fmtYaml(preservados.mesorregiao) : "null"}`,
    `status: pendente`,
    `resumo: ""`,
    `capa: ""`,
    `fotos: []`,
    `reels: []`,
    `curiosidades: []`,
    `atracoes: []`,
    `ondeComer: []`,
    `ondeDormir: []`,
    `festas: []`,
    `populacao: ${populacao ?? "null"}`,
    `areaKm2: ${areaKm2 ?? "null"}`,
  ];

  if (preservados.padroeiro) linhas.push(`padroeiro: ${fmtYaml(preservados.padroeiro)}`);
  if (preservados.historiaResumo) linhas.push(`historiaResumo: ${fmtYaml(preservados.historiaResumo)}`);
  if (preservados.fundacao) linhas.push(`fundacao: ${preservados.fundacao}`);
  if (preservados.aniversario) linhas.push(`aniversario: ${fmtYaml(preservados.aniversario)}`);
  if (preservados.gentilico) linhas.push(`gentilico: ${fmtYaml(preservados.gentilico)}`);
  if (preservados.toponimia) linhas.push(`toponimia: ${fmtYaml(preservados.toponimia)}`);
  if (preservados.siteOficial) linhas.push(`siteOficial: ${fmtYaml(preservados.siteOficial)}`);

  linhas.push("---", "", `<!-- Escreva aqui as curiosidades, histórias e relatos da visita a ${nome}. -->`, "");

  return linhas.join("\n");
}

async function zerarCidades() {
  const arquivos = (await readdir(CIDADES_DIR)).filter((f) => f.endsWith(".md"));
  let processados = 0;
  let inalterados = 0;

  for (const file of arquivos) {
    const path = join(CIDADES_DIR, file);
    const original = await readFile(path, "utf8");
    const novo = reconstruirCidade(original);

    if (novo === original) {
      inalterados++;
      continue;
    }

    if (!DRY_RUN) {
      await writeFile(path, novo, "utf8");
    }
    processados++;
  }

  return { processados, inalterados, total: arquivos.length };
}

async function apagarCuriosidades() {
  const arquivos = (await readdir(CURIOSIDADES_DIR).catch(() => [])).filter((f) => f.endsWith(".md"));
  if (!DRY_RUN) {
    for (const f of arquivos) {
      await unlink(join(CURIOSIDADES_DIR, f));
    }
  }
  return arquivos;
}

async function main() {
  console.log(`\n${DRY_RUN ? "DRY-RUN " : ""}Reset de conteúdo do Projeto 497 RS`);
  console.log("─".repeat(60));

  console.log("\n→ Cidades…");
  const stats = await zerarCidades();
  console.log(`  ${DRY_RUN ? "Seriam processadas" : "Processadas"}: ${stats.processados}/${stats.total}`);
  console.log(`  Já estavam zeradas: ${stats.inalterados}`);

  console.log("\n→ Curiosidades…");
  const apagadas = await apagarCuriosidades();
  if (apagadas.length === 0) {
    console.log("  (nenhuma curiosidade pra apagar)");
  } else {
    console.log(`  ${DRY_RUN ? "Seriam apagadas" : "Apagadas"}: ${apagadas.length}`);
    for (const f of apagadas) console.log(`    - ${f}`);
  }

  if (DRY_RUN) {
    console.log("\n(dry-run: nada foi escrito)");
    console.log("Pra executar: node scripts/zerar-conteudo.mjs --confirmar");
  } else {
    console.log("\n✔ Reset concluído.");
    console.log("Próximo passo: roda `npm run dev` e começa a documentar a 1ª cidade!");
  }
}

main().catch((err) => {
  console.error("✘ Falha:", err);
  process.exit(1);
});
