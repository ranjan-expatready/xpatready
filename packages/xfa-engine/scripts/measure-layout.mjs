// Owner/dev tool (W02-T12): MEASURES the time of a full layout and the size of the render tree on the built package. Nothing
// asserts these numbers (a wall-clock assertion is a flaky test); they are recorded in the evidence of card W02-T12.
// Usage: XFA_CORPUS_DIR=<dir of the blank forms> [XFA_ACROBAT_DIR=<dir of the Acrobat copies>] pnpm --filter @expatready-eros/xfa-engine measure:layout [--runs N] [--warmup N]
//   Per form: create + load once (the cold cost), then N times: write one field (so the form changed), time the layout (pagination,
//   the form's layout scripts, text, master pages) and time the tree built from it, apart and together; p50 / p95 / max.
//   The synthetic form (fixtures/synthetic) is always measured; the corpus forms need XFA_CORPUS_DIR.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { createFormRuntime, openXfaPdf, renderTreeSchema } from '../dist/index.js';
import { layoutAccessOf } from '../dist/runtime/layout-access.js';
import { NEUTRAL_HOST } from './lib/sample-common.mjs';

const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);
const here = fileURLToPath(new URL('.', import.meta.url));

const positiveInt = (what) => z.coerce.number({ error: `--${what} must be a number` }).int().min(1).max(10_000);
const options = z
  .strictObject({ runs: positiveInt('runs').default(100), warmup: positiveInt('warmup').default(10) })
  .parse(parseArgs({ options: { runs: { type: 'string' }, warmup: { type: 'string' } } }).values);
const env = z.object({ XFA_CORPUS_DIR: z.string().optional(), XFA_ACROBAT_DIR: z.string().optional() }).parse(process.env);

/** The nodes written between layouts: a name field of each form. */
const subjects = [{ label: 'synthetic (fixtures/synthetic)', path: join(here, '../fixtures/synthetic/synthetic-form.pdf'), som: 'Details.Name', strict: true }];
const corpusSom = 'Page1.PersonalDetails.Name.FamilyName';
if (env.XFA_CORPUS_DIR) for (const file of readdirSync(resolve(env.XFA_CORPUS_DIR)).filter((f) => f.toLowerCase().endsWith('.pdf')).sort()) subjects.push({ label: `${file} (blank)`, path: join(resolve(env.XFA_CORPUS_DIR), file), som: corpusSom, strict: false });
if (env.XFA_ACROBAT_DIR) for (const file of readdirSync(resolve(env.XFA_ACROBAT_DIR)).filter((f) => f.endsWith('validated.pdf')).sort()) subjects.push({ label: `${file} (6 pages)`, path: join(resolve(env.XFA_ACROBAT_DIR), file), som: corpusSom, strict: false });

const ms = (n) => Math.round(n * 100) / 100;
const percentile = (sorted, p) => sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
const stats = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return { p50: ms(percentile(sorted, 50)), p95: ms(percentile(sorted, 95)), max: ms(sorted[sorted.length - 1]) };
};
const base64 = (_key, value) => (value instanceof Uint8Array ? Buffer.from(value).toString('base64') : value);

const rows = [];
for (const subject of subjects) {
  const pdf = await openXfaPdf(new Uint8Array(readFileSync(subject.path)));
  const started = performance.now();
  const runtime = await createFormRuntime(pdf, { host: NEUTRAL_HOST, clock: { now: () => NOW }, strict: subject.strict });
  runtime.load();
  const loadMs = performance.now() - started;
  const access = layoutAccessOf(runtime);
  const cold = performance.now();
  const tree = runtime.layout();
  const coldTreeMs = performance.now() - cold;

  const parseStart = performance.now();
  renderTreeSchema.parse(tree);
  const parseMs = performance.now() - parseStart;
  const itemCount = tree.pages.reduce((sum, page) => sum + page.items.length, 0);
  const withoutResources = Buffer.byteLength(JSON.stringify({ version: tree.version, pages: tree.pages, issues: tree.issues }));
  const withResources = Buffer.byteLength(JSON.stringify(tree, base64));
  const resourceBytes = [...tree.resources.fonts, ...tree.resources.images].reduce((sum, r) => sum + r.bytes.length, 0);

  const texts = ['AAAA', 'BBBBBBBBBB'];
  const layoutMs = [];
  const treeMs = [];
  const totalMs = [];
  for (let i = 0; i < options.warmup + options.runs; i += 1) {
    runtime.setValue(subject.som, texts[i % 2]);
    const a = performance.now();
    access.layout();
    const b = performance.now();
    runtime.layout();
    const c = performance.now();
    if (i >= options.warmup) {
      layoutMs.push(b - a);
      treeMs.push(c - b);
      totalMs.push(c - a);
    }
  }
  runtime.dispose();
  rows.push({
    form: subject.label,
    pages: tree.pages.length,
    items: itemCount,
    createAndLoadMs: ms(loadMs),
    coldTreeMs: ms(coldTreeMs),
    schemaParseMs: ms(parseMs),
    layoutMs: stats(layoutMs),
    treeMs: stats(treeMs),
    totalMs: stats(totalMs),
    jsonBytesWithoutResources: withoutResources,
    jsonBytesWithResources: withResources,
    resourceRawBytes: resourceBytes,
    fonts: tree.resources.fonts.length,
    images: tree.resources.images.length,
  });
}
console.log(JSON.stringify({ node: process.version, runs: options.runs, warmup: options.warmup, rows }, null, 1));
