// scripts/generate-cidades.mjs
//
// Gera (ou atualiza) os 497 arquivos markdown em src/content/cidades/,
// um por município, a partir de src/data/municipios-rs.json.
//
// Por padrão, NÃO sobrescreve arquivos existentes — só preserva e
// atualiza os campos identificadores do frontmatter (codigo, nome,
// microrregiao, mesorregiao). Isso permite rodar o script de novo
// sem perder conteúdo já editado.
//
// Use --force para regenerar tudo do zero (apaga conteúdo).

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CIDADES_DIR = resolve(ROOT, "src/content/cidades");
const DATA_FILE = resolve(ROOT, "src/data/municipios-rs.json");

const FORCE = process.argv.includes("--force");

/** Renderiza o frontmatter do zero (cidade nova ou --force). */
function novoArquivo(m) {
  return `---
codigo: "${m.codigo}"
nome: "${m.nome}"
microrregiao: ${m.microrregiao ? `"${m.microrregiao}"` : "null"}
mesorregiao: ${m.mesorregiao ? `"${m.mesorregiao}"` : "null"}
status: pendente
resumo: ""
capa: ""
fotos: []
reels: []
curiosidades: []
---

<!-- Escreva aqui as curiosidades, histórias e relatos da visita a ${m.nome}. -->
`;
}

/**
 * Atualiza apenas os campos identificadores em um arquivo existente,
 * preservando todo o resto. Usa regex linha-a-linha para não depender
 * de parser YAML.
 */
function atualizarFrontmatter(conteudo, m) {
  const setLine = (texto, chave, valor) => {
    const re = new RegExp(`^${chave}:.*$`, "m");
    const linha = `${chave}: ${valor}`;
    return re.test(texto) ? texto.replace(re, linha) : texto;
  };

  let out = conteudo;
  out = setLine(out, "codigo", `"${m.codigo}"`);
  out = setLine(out, "nome", `"${m.nome}"`);
  out = setLine(out, "microrregiao", m.microrregiao ? `"${m.microrregiao}"` : "null");
  out = setLine(out, "mesorregiao", m.mesorregiao ? `"${m.mesorregiao}"` : "null");
  return out;
}

async function main() {
  const municipios = JSON.parse(await readFile(DATA_FILE, "utf8"));
  await mkdir(CIDADES_DIR, { recursive: true });

  const existentes = new Set(
    (await readdir(CIDADES_DIR).catch(() => [])).filter((f) => f.endsWith(".md"))
  );

  let criados = 0;
  let atualizados = 0;
  let preservados = 0;

  for (const m of municipios) {
    const file = `${m.slug}.md`;
    const path = join(CIDADES_DIR, file);

    if (FORCE || !existsSync(path)) {
      await writeFile(path, novoArquivo(m), "utf8");
      criados++;
    } else {
      const atual = await readFile(path, "utf8");
      const novo = atualizarFrontmatter(atual, m);
      if (novo !== atual) {
        await writeFile(path, novo, "utf8");
        atualizados++;
      } else {
        preservados++;
      }
    }

    existentes.delete(file);
  }

  console.log(`✔ ${criados} criados`);
  console.log(`↻ ${atualizados} atualizados (campos identificadores)`);
  console.log(`= ${preservados} já estavam em dia`);

  if (existentes.size > 0) {
    console.log(`\n⚠ ${existentes.size} arquivos órfãos em src/content/cidades/:`);
    for (const f of existentes) console.log(`  - ${f}`);
    console.log("  (não removidos automaticamente — verifique manualmente)");
  }
}

main().catch((err) => {
  console.error("✘ Falha:", err);
  process.exit(1);
});
