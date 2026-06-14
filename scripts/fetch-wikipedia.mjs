// scripts/fetch-wikipedia.mjs
//
// Busca dados de cada cidade na Wikipedia (pt) e Wikidata, e popula
// os campos auto-populáveis nos arquivos markdown:
//   - historiaResumo  — extrato (1-2 parágrafos) do artigo da Wikipedia
//   - gentilico       — Wikidata (P1549)
//   - aniversario     — Wikidata (P837 "day in year for periodic occurrence")
//   - fundacao        — Wikidata (P571 inception)
//
// Estratégia:
//   - Match pelo código IBGE → Wikidata (Q-id) via SPARQL
//   - Da Q-id, extrai gentilico, fundacao e o nome do artigo na Wikipedia pt
//   - Da Wikipedia pt, extrai resumo via REST API
//
// PRESERVA campos já preenchidos manualmente — só escreve onde está vazio.
//
// Uso:
//   node scripts/fetch-wikipedia.mjs                  # todos os 497
//   node scripts/fetch-wikipedia.mjs --slug=gramado   # uma cidade
//   node scripts/fetch-wikipedia.mjs --limit=10       # só 10 (teste)
//   node scripts/fetch-wikipedia.mjs --force          # sobrescreve mesmo se já preenchido

import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CIDADES_DIR = resolve(ROOT, "src/content/cidades");

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const slugArg = args.find((a) => a.startsWith("--slug="))?.slice("--slug=".length);
const limitArg = args.find((a) => a.startsWith("--limit="))?.slice("--limit=".length);
const LIMIT = limitArg ? parseInt(limitArg, 10) : Infinity;

const USER_AGENT = "Projeto497RS/0.1 (https://projeto497rs.com.br; contato@projeto497rs.com.br)";

/** sleep (ms) — respeitar rate limits */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

/**
 * Busca a Q-id da cidade no Wikidata via código IBGE (P1585).
 * Também retorna gentílico (P1549), fundação (P571) e título da Wikipedia pt.
 */
async function buscarWikidata(codigoIbge) {
  // SPARQL endpoint do Wikidata
  const sparql = `
    SELECT ?cidade ?gentilicoLabel ?fundacao ?wikipediaPt WHERE {
      ?cidade wdt:P1585 "${codigoIbge}" .
      OPTIONAL { ?cidade wdt:P1549 ?gentilico . FILTER(LANG(?gentilico) = "pt") }
      OPTIONAL { ?cidade wdt:P571 ?fundacao . }
      OPTIONAL {
        ?wikipediaPt schema:about ?cidade ;
                     schema:isPartOf <https://pt.wikipedia.org/> .
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "pt". ?gentilico rdfs:label ?gentilicoLabel . }
    }
    LIMIT 1
  `;
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
  const data = await fetchJson(url);
  const b = data.results?.bindings?.[0];
  if (!b) return null;

  const wikipediaUrl = b.wikipediaPt?.value;
  const tituloArtigo = wikipediaUrl
    ? decodeURIComponent(wikipediaUrl.split("/wiki/")[1] || "")
    : null;

  return {
    qid: b.cidade?.value?.split("/").pop() ?? null,
    gentilico: b.gentilicoLabel?.value ?? null,
    fundacao: b.fundacao?.value ? b.fundacao.value.slice(0, 10) : null,
    tituloArtigo,
  };
}

/**
 * Busca o resumo do artigo da Wikipedia pt via API REST.
 * Retorna o "extract" (resumo) — 1-2 parágrafos.
 */
async function buscarResumoWikipedia(tituloArtigo) {
  const url = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(tituloArtigo)}`;
  try {
    const data = await fetchJson(url);
    return data.extract || null;
  } catch (e) {
    return null;
  }
}

/** Atualiza ou insere uma linha no frontmatter (entre --- ---). */
function setField(conteudo, chave, valor) {
  const fmMatch = conteudo.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return conteudo;
  const fm = fmMatch[1];
  const linha = `${chave}: ${valor}`;
  const re = new RegExp(`^${chave}:.*$`, "m");
  let novoFm;
  if (re.test(fm)) {
    novoFm = fm.replace(re, linha);
  } else {
    novoFm = fm + "\n" + linha;
  }
  return conteudo.replace(fmMatch[0], `---\n${novoFm}\n---`);
}

function fmtYaml(valor) {
  if (valor === null || valor === undefined) return "null";
  return `"${String(valor).replace(/"/g, '\\"')}"`;
}

/** Verifica se um campo já está preenchido no frontmatter. */
function temCampo(conteudo, chave) {
  const fmMatch = conteudo.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return false;
  const re = new RegExp(`^${chave}:\\s*"?([^"\\n]+)"?\\s*$`, "m");
  const m = fmMatch[1].match(re);
  if (!m) return false;
  const v = m[1].trim();
  return v && v !== "null" && v !== '""';
}

function getCampo(conteudo, chave) {
  const fmMatch = conteudo.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const re = new RegExp(`^${chave}:\\s*"?([^"\\n]+)"?\\s*$`, "m");
  const m = fmMatch[1].match(re);
  return m?.[1]?.trim() ?? null;
}

async function main() {
  const arquivos = (await readdir(CIDADES_DIR)).filter((f) => f.endsWith(".md"));
  const alvo = slugArg
    ? arquivos.filter((f) => f === `${slugArg}.md`)
    : arquivos.slice(0, LIMIT);

  if (alvo.length === 0) {
    console.error(`Nenhum arquivo encontrado para o filtro fornecido.`);
    process.exit(1);
  }

  console.log(`→ Processando ${alvo.length} cidades…`);
  let atualizados = 0;
  let semDados = 0;
  let pulados = 0;

  for (const file of alvo) {
    const path = join(CIDADES_DIR, file);
    let conteudo = await readFile(path, "utf8");
    const codigo = getCampo(conteudo, "codigo");
    const nome = getCampo(conteudo, "nome");
    if (!codigo) {
      console.warn(`  ! ${file}: sem código IBGE`);
      continue;
    }

    // Pular se já tem todos os campos auto (a menos que --force)
    const camposAuto = ["historiaResumo", "gentilico", "fundacao"];
    const todosPreenchidos = camposAuto.every((c) => temCampo(conteudo, c));
    if (todosPreenchidos && !FORCE) {
      pulados++;
      continue;
    }

    try {
      process.stdout.write(`  · ${nome}… `);
      const wd = await buscarWikidata(codigo);
      if (!wd) {
        console.log("sem Wikidata");
        semDados++;
        continue;
      }

      let resumo = null;
      if (wd.tituloArtigo) {
        resumo = await buscarResumoWikipedia(wd.tituloArtigo);
      }

      let mudou = false;
      if (resumo && (FORCE || !temCampo(conteudo, "historiaResumo"))) {
        conteudo = setField(conteudo, "historiaResumo", fmtYaml(resumo));
        mudou = true;
      }
      if (wd.gentilico && (FORCE || !temCampo(conteudo, "gentilico"))) {
        conteudo = setField(conteudo, "gentilico", fmtYaml(wd.gentilico));
        mudou = true;
      }
      if (wd.fundacao && (FORCE || !temCampo(conteudo, "fundacao"))) {
        conteudo = setField(conteudo, "fundacao", wd.fundacao);
        mudou = true;
      }

      if (mudou) {
        await writeFile(path, conteudo, "utf8");
        atualizados++;
        console.log("✓");
      } else {
        console.log("nada novo");
      }
    } catch (err) {
      console.log(`erro: ${err.message}`);
    }

    // Rate limit polite — Wikidata pede 1 req/seg, Wikipedia REST aceita mais
    await sleep(1100);
  }

  console.log(`\n✔ ${atualizados} atualizados`);
  console.log(`= ${pulados} já preenchidos (use --force pra sobrescrever)`);
  console.log(`? ${semDados} sem dados na Wikidata`);
}

main().catch((err) => {
  console.error("✘ Falha:", err);
  process.exit(1);
});
