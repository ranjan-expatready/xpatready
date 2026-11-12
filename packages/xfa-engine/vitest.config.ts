import { availableParallelism } from 'node:os';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    // Scope the run to THIS package; without an explicit include vitest walks
    // up to the workspace root and picks up every test in the monorepo.
    include: ['src/**/*.test.ts'],
    // The corpus suite needs qpdf and real files; it runs only via `test:corpus` (vitest.corpus.config.ts).
    exclude: [...configDefaults.exclude, 'src/__tests__/corpus/**'],
    // Bound by real cores (a flat 4 backfires on 2-core CI runners).
    maxWorkers: Math.min(4, availableParallelism()),
    // Pin the ceiling CI runs under so a large-RAM dev box cannot hide an OOM.
    execArgv: ['--max-old-space-size=2048'],
  },
});
