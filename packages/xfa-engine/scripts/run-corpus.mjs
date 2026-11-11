// Entry point for `pnpm test:corpus`. A corpus run that cannot execute must say so and fail, never pass silently.
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const notExecuted = (reason) => {
  console.error(`NOT EXECUTED: ${reason}`);
  process.exit(2);
};

const envSchema = z.object({ XFA_CORPUS_DIR: z.string().trim().min(1) });
const env = envSchema.safeParse(process.env);
if (!env.success) notExecuted('XFA_CORPUS_DIR is not set (point it at a directory of *.pdf files)');
const raw = env.data.XFA_CORPUS_DIR;
// pnpm runs scripts in the package directory; INIT_CWD is where the user typed the command.
const dir = resolve(process.env.INIT_CWD ?? process.cwd(), raw);
let isDir = false;
try {
  isDir = statSync(dir).isDirectory();
} catch {
  isDir = false;
}
if (!isDir) notExecuted(`XFA_CORPUS_DIR does not exist or is not a directory: ${dir}`);
if (!readdirSync(dir).some((f) => f.toLowerCase().endsWith('.pdf'))) notExecuted(`no *.pdf files in ${dir}`);

const probe = spawnSync('qpdf', ['--version'], { encoding: 'utf8' });
if (probe.error !== undefined || probe.status !== 0) notExecuted('qpdf is not available on PATH');

const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', 'vitest.corpus.config.ts'], {
  stdio: 'inherit',
  env: { ...process.env, XFA_CORPUS_DIR: dir },
});
process.exit(run.status ?? 1);
