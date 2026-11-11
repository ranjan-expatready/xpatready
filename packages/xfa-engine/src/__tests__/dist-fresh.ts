import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Fails with an instruction when `dist` is missing or older than the newest non-test source file. Tests that run the BUILT package
 * (the worker harness, the sample tools) call it so they never pass or skip against a build that is not of the current source.
 * `built` is a file of the build, relative to the package root; every `tsc` build rewrites all of them.
 */
export function assertDistFresh(built = 'dist/worker/session.js'): void {
  const srcDir = fileURLToPath(new URL('../', import.meta.url));
  const distFile = fileURLToPath(new URL(`../../${built}`, import.meta.url));
  let builtAt: number;
  try {
    builtAt = statSync(distFile).mtimeMs;
  } catch {
    throw new Error(`${built} is missing: run \`pnpm --filter @expatready-eros/xfa-engine build\` first (these tests run the built package)`);
  }
  const newest = (dir: string): number =>
    readdirSync(dir, { withFileTypes: true }).reduce((max, entry) => {
      if (entry.name === '__tests__') return max;
      const path = `${dir}${entry.name}`;
      if (entry.isDirectory()) return Math.max(max, newest(`${path}/`));
      return entry.name.endsWith('.ts') ? Math.max(max, statSync(path).mtimeMs) : max;
    }, 0);
  if (newest(srcDir) > builtAt) throw new Error('dist is older than src: run `pnpm --filter @expatready-eros/xfa-engine build` first (these tests run the built package)');
}
