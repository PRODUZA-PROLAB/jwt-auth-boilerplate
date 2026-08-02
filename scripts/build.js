/**
 * Build script. Syntax-checks every `.js` file under `src/` with `node --check`.
 *
 * @module scripts/build
 */

import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const srcDir = join(root, 'src');

const files = [];

/**
 * Recursively collects `.js` files under a directory into the shared `files`
 * array.
 *
 * @param {string} dir - The directory to walk.
 * @returns {void}
 */
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name.endsWith('.js')) {
      files.push(full);
    }
  }
}

walk(srcDir);

for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

console.log(
  `[build] ${files.length} arquivos verificados com sucesso. JavaScript puro — sem etapa de transpilação.`
);
