// Valida todos os .bru da coleção (ou os passados pelo lint-staged) e falha com a lista
// dos problemas. Uso: node scripts/validate-collection.mjs [arquivos...]
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { checkFile } from './collection-rules.mjs';

const ROOT = process.cwd();
const IGNORED = new Set(['node_modules', '.git']);

function bruFiles({ dir }) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORED.has(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return bruFiles({ dir: path });
    return entry.name.endsWith('.bru') ? [path] : [];
  });
}

const files = process.argv.length > 2 ? process.argv.slice(2) : bruFiles({ dir: ROOT });
let failed = false;
for (const file of files) {
  const path = relative(ROOT, file).split('\\').join('/');
  for (const problem of checkFile({ path, text: readFileSync(file, 'utf8') })) {
    failed = true;
    console.error(`${path}: ${problem}`);
  }
}
if (failed) process.exit(1);
console.log(`${files.length} arquivos .bru válidos, sem segredo versionado.`);
