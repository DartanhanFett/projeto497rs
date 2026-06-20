// scripts/zerar-conteudo.mjs
//
// Reset do conteúdo editorial das cidades + apaga curiosidades.
// Pensado pra "começar do zero" mantendo dados-base do IBGE/Wikipedia.
//
// O QUE ZERA (cidades):
//   - status → pendente
//   - dataVisita, atualizadoEm → removido
//   - resumo, capa → vazio
//   - fotos, reels, curiosidades, atracoes, ondeComer, ondeDormir, festas → []
//   - secretariaTurismo → removido
//   - body markdown → comentário padrão
//
// O QUE PRESERVA (cidades):
//   - codigo, nome, microrregiao, mesorregiao (IBGE)
//   - populacao, areaKm2 (planilha)
//   - padroeiro (planilha)
//   - historiaResumo, fundacao, gentilico, toponimia, aniversario, siteOficial (Wikipedia)
//
// O QUE FAZ EM CURIOSIDADES:
//   - Apaga TODOS os arquivos em src/content/curiosidades/
//
// O QUE APAGA EM MÍDIA LOCAL (com --com-uploads):
//   - public/uploads/ inteiro (incluindo subpastas por cidade)
//
// USO:
//   node scripts/zerar-conteudo.mjs --dry-run        # simula
//   node scripts/zerar-conteudo.mjs --confirmar      # aplica conteúdo
//   node scripts/zerar-conteudo.mjs --confirmar --com-uploads  # aplica + apaga uploads
//
// Sem flag de ação ele NÃO faz nada (proteção contra rodar sem querer).
// Mídia já enviada pro R2 NÃO é apagada por aqui — usa o painel da
// Cloudflare ou um script dedicado de limpeza R2 se precisar.

import { readFile, writeFile, readdir, unlink, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CIDADES_DIR = resolve(ROOT, "src/content/cidades");
const CURIOSIDADES_DIR = resolve(ROOT, "src/content/curiosidades");
const UPLOADS_DIR = resolve(ROOT, "public/uploads");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const CONFIRMAR = args.includes("--confirmar");
const COM_UPLOADS = args.includes("--com-uploads");

if (!DRY_RUN && !CONFIRMAR) {
  console.error("✘ Esse script faz alterações destrutivas. Use uma das flags:");
  console.error("   --dry-run                          simula sem escrever");
  console.error("   --confirmar                        aplica em conteúdo");
  console.error("   --confirmar --com-uploads          aplica + apaga public/uploads/");
  process.exit(1);
}

// ─── Cidades ────────────────────────────────────────────────────────

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
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  return `"${String(valor).replace(/"/g, '\\"')}"`;
}

/** Extrai valor de campo simples do frontmatter. */
function getField(fm, chave) {
  const re = new RegExp(`^${chave}:\\s*(.*)$`, "m");
  const m = fm.match(re);
  if (!m) return null;
  let v = m[1].trim();
  if (v === "null" || v === '""' || v === "") return null;
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\"/g, '"');
  return v;
}

function reconstruirCidade(conteudoOriginal) {
  const fmMatch = conteudoOriginal.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return conteudoOriginal;
  const fm = fmMatch[1];

  const preservados = {};
  for (const c of CAMPOS_PRESERVADOS) {
    const v = getField(fm, c);
    if (v !== null) preservados[c] = v;
  }

  const nome = preservados.nome ?? "Cidade";
  const populacao = preservados.populacao ? Number(preservados.populacao) : null;
  const areaKm2 = preservados.areaKm2 ? Number(preservados.areaKm2) : null;

  // Frontmatter na ordem canônica
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

    if (!DRY_RUN) await writeFile(path, novo, "utf8");
    processados++;
  }

  return { processados, inalterados, total: arquivos.length };
}

async function apagarCuriosidades() {
  const arquivos = (await readdir(CURIOSIDADES_DIR).catch(() => [])).filter((f) => f.endsWith(".md"));
  if (!DRY_RUN) {
    for (const f of arquivos) await unlink(join(CURIOSIDADES_DIR, f));
  }
  return arquivos;
}

async function apagarUploads() {
  if (!existsSync(UPLOADS_DIR)) return { apagados: 0, total: 0 };
  // Conta arquivos antes de apagar (pra reportar)
  let total = 0;
  const stack = [UPLOADS_DIR];
  while (stack.length) {
    const dir = stack.pop();
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else total++;
    }
  }

  if (!DRY_RUN && total > 0) {
    // Apaga só conteúdo, mantém o diretório raiz
    for (const e of await readdir(UPLOADS_DIR)) {
      await rm(join(UPLOADS_DIR, e), { recursive: true, force: true });
    }
  }
  return { apagados: total, total };
}

async function main() {
  console.log(`\n${DRY_RUN ? "DRY-RUN " : ""}Reset de conteúdo do Projeto 497 RS`);
  console.log("─".repeat(60));

  console.log("\n→ Cidades…");
  const stats = await zerarCidades();
  console.log(`  ${DRY_RUN ? "Seriam zeradas" : "Zeradas"}: ${stats.processados}/${stats.total}`);
  console.log(`  Já estavam zeradas: ${stats.inalterados}`);

  console.log("\n→ Curiosidades…");
  const apagadas = await apagarCuriosidades();
  if (apagadas.length === 0) {
    console.log("  (nenhuma curiosidade pra apagar)");
  } else {
    console.log(`  ${DRY_RUN ? "Seriam apagadas" : "Apagadas"}: ${apagadas.length}`);
    for (const f of apagadas) console.log(`    - ${f}`);
  }

  if (COM_UPLOADS) {
    console.log("\n→ public/uploads/…");
    const r = await apagarUploads();
    if (r.total === 0) {
      console.log("  (nada pra apagar)");
    } else {
      console.log(`  ${DRY_RUN ? "Seriam apagados" : "Apagados"}: ${r.total} arquivos`);
    }
    console.log("  ⚠ Mídia já enviada pro R2 NÃO é apagada — limpe pelo painel Cloudflare se necessário");
  }

  if (DRY_RUN) {
    console.log("\n(dry-run: nada foi escrito)");
    console.log("Pra executar:");
    console.log("  node scripts/zerar-conteudo.mjs --confirmar");
    if (!COM_UPLOADS) {
      console.log("  node scripts/zerar-conteudo.mjs --confirmar --com-uploads  (também limpa public/uploads/)");
    }
  } else {
    console.log("\n✔ Reset concluído.");
    console.log("Próximo passo: `npm run dev` e começa a documentar a 1ª cidade!");
  }
}

main().catch((err) => {
  console.error("✘ Falha:", err);
  process.exit(1);
});
