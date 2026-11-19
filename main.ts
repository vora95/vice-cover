// Vice Cover — program/v1 entrypoint (Node 22, standard library only).
// Copies app/ and screenshots/ into the output directory and writes
// dossier.json with the kit's buildDossier. Deterministic: files are copied
// in sorted order and nothing here writes a timestamp or random value.

import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const CAPS = {
  text_max_bytes: 160 * 1024,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};
const DOSSIER_MAX_BYTES = Math.floor(1.5 * 1024 * 1024);
const SCREENSHOT_MAX_BYTES = 256 * 1024;
const APP_MAX_BYTES = 48 * 1024 * 1024;

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

// Recursively list files under a directory, in code-unit path order.
function listFiles(dir: string, base: string): string[] {
  const out: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    const p = join(dir, e.name);
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...listFiles(p, rel));
    else if (e.isFile()) out.push(rel);
  }
  return out;
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const repoRoot = dirname(fileURLToPath(import.meta.url));
  const appDir = join(repoRoot, 'app');
  const shotsDir = join(repoRoot, 'screenshots');

  if (!existsSync(appDir) || !lstatSync(appDir).isDirectory()) fail('app/ is missing');
  if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing');
  if (!existsSync(shotsDir) || !lstatSync(shotsDir).isDirectory()) fail('screenshots/ is missing');

  const appFiles = listFiles(appDir, '');
  let appBytes = 0;
  for (const f of appFiles) appBytes += statSync(join(appDir, f)).size;
  if (appBytes > APP_MAX_BYTES) fail(`app/ is ${appBytes} bytes, over the ${APP_MAX_BYTES} byte cap`);

  const shots = readdirSync(shotsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();
  if (shots.length < 3) fail(`screenshots/ holds ${shots.length} files, need at least 3`);
  if (shots.length > 4) fail(`screenshots/ holds ${shots.length} files, at most 4`);
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > SCREENSHOT_MAX_BYTES) fail(`screenshots/${name} is ${size} bytes, over ${SCREENSHOT_MAX_BYTES}`);
  }

  mkdirSync(outDir, { recursive: true });
  cpSync(appDir, join(outDir, 'app'), { recursive: true });
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

  let dossier: Uint8Array;
  try {
    dossier = buildDossier(outDir, CAPS);
  } catch (err) {
    fail(`buildDossier failed: ${(err as Error).message}`);
  }
  if (dossier!.length > DOSSIER_MAX_BYTES) {
    fail(`dossier.json is ${dossier!.length} bytes, over ${DOSSIER_MAX_BYTES}`);
  }
  writeFileSync(join(outDir, 'dossier.json'), dossier!);
  console.log(`main.ts: wrote ${outDir} (app ${appFiles.length} files, ${appBytes} bytes; ${shots.length} screenshots; dossier ${dossier!.length} bytes)`);
}

main();
