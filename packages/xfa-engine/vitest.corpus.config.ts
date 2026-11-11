import { defineConfig } from 'vitest/config';

// Real-file parity suite: needs XFA_CORPUS_DIR and qpdf, so it is NOT part of the default `test` run.
// Run through `pnpm test:corpus` (scripts/run-corpus.mjs), which refuses to run silently without them.
export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    include: ['src/__tests__/corpus/**/*.test.ts'],
    testTimeout: 120_000,
    // Raised from 2048 (W02-T09): the helpers keep every session of a file alive until the file ends (validate-payload holds about
    // 150 runtimes), and each runtime also holds its layout; with 2048 that file runs out of heap in its last tests. Local-only suite
    // (real PDFs), not a CI pin.
    execArgv: ['--max-old-space-size=4096'],
  },
});
