// Owner/dev tool (W03-T15): MEASURES the cost of the isolation design on the BUILT package: bundle sizes, cold open per corpus
// form, op-log replay time, and the peak memory of a snapshot. Nothing asserts these numbers (a wall-clock assertion is a
// flaky test); they are recorded in the evidence of card W03-T15. Lives outside src/ on purpose: src is runtime-neutral.
// Usage: XFA_CORPUS_DIR=<dir with imm1295e.pdf, imm5257e.pdf> pnpm --filter @expatready-eros/xfa-engine measure:isolation [--replay-sizes 50,200,1500] [--rss-runs 3]
//   sizes   dist bytes (JS, typings), per entry the files its static imports reach (raw and gzip), the QuickJS WASM and its glue.
//   cold    per form, in a fresh process: time from process start to `opened` (module import + WASM compile + load), and a second open.
//   replay  per form: `open` with N ops, two series: the fictitious-person fill repeated to N ops, and N ops that each change a value.
//   rss     per form, in fresh processes: maxRSS after open + fill, and after a `snapshot` (which opens the bytes a second time to
//           verify them), against a control process that does not snapshot. The fill's ops are RECORDED IN THE PARENT (a full
//           runtime in the measuring child would sit in its peak) and handed to the child on stdin, so the child only ever
//           holds what a worker holds: the session.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';
import { z } from 'zod';
import { serveFormSession } from '../dist/worker/index.js';
import { PROTOCOL_VERSION } from '../dist/worker/protocol-entry.js';
import { NEUTRAL_HOST } from './lib/sample-common.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const dist = join(here, '../dist');
const fixtures = join(here, '../src/__tests__/fixtures/form-data');
const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);
const FORMS = [
  { code: 'imm1295', file: 'imm1295e.pdf' },
  { code: 'imm5257', file: 'imm5257e.pdf' },
];
const FAMILY_NAME = 'Page1.PersonalDetails.Name.FamilyName';

const env = z.object({ XFA_CORPUS_DIR: z.string().min(1, { error: 'set XFA_CORPUS_DIR to the directory of the blank corpus forms' }) }).parse(process.env);
const corpus = resolve(process.env.INIT_CWD ?? process.cwd(), env.XFA_CORPUS_DIR);
const args = parseArgs({ allowPositionals: true, options: { 'replay-sizes': { type: 'string' }, 'rss-runs': { type: 'string' }, child: { type: 'string' } } });
const sizes = z.string().default('50,200,1500').transform((text) => text.split(',').map(Number)).pipe(z.array(z.number().int().min(1).max(1500)).min(1)).parse(args.values['replay-sizes']);
const rssRuns = z.coerce.number().int().min(1).max(20).default(3).parse(args.values['rss-runs']);

const ms = (n) => Math.round(n * 10) / 10;
const kib = (n) => `${(n / 1024).toFixed(1)} KiB`;
const mib = (n) => `${(n / 1048576).toFixed(1)} MiB`;
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

// ---- shared: a session over an in-process MessageChannel, the fixture as ops -------------------------------------------

function connect() {
  const { port1, port2 } = new MessageChannel();
  const handle = serveFormSession(port2);
  let id = 0;
  const waiting = new Map();
  port1.onmessage = (event) => {
    waiting.get(event.data.id)?.(event.data);
    waiting.delete(event.data.id);
  };
  return {
    send(body) {
      id += 1;
      const mine = id;
      return new Promise((resolveReply) => {
        waiting.set(mine, resolveReply);
        port1.postMessage({ v: PROTOCOL_VERSION, id: mine, ...body });
      });
    },
    close() {
      handle.close();
      port1.close();
      port2.close();
    },
  };
}

const must = (reply, kind) => {
  if (reply.kind !== kind) throw new Error(`expected ${kind}, got ${JSON.stringify(reply).slice(0, 300)}`);
  return reply;
};

const loadJson = (name) => JSON.parse(readFileSync(join(fixtures, name), 'utf8'));
const pdfOf = (form) => new Uint8Array(readFileSync(join(corpus, form.file)));
const openBody = (form, extra) => ({ kind: 'open', pdf: pdfOf(form), pack: loadJson(`${form.code}.pack.json`), host: NEUTRAL_HOST, timezone: 'UTC', at: NOW, ops: [], ...extra });

/** The synthetic person as the ops a viewer would log: `applyFixture` drives a recording stand-in. Parent process only (see the header). */
async function fixtureOps(form) {
  const { createFormRuntime, openXfaPdf } = await import('../dist/index.js');
  const { applyFixture, fixtureSchema } = await import('../dist/runtime/fixture.js');
  const runtime = await createFormRuntime(await openXfaPdf(pdfOf(form)), { host: NEUTRAL_HOST, clock: { now: () => NOW } });
  runtime.load();
  const ops = [];
  const recording = new Proxy(runtime, {
    get(target, member) {
      if (member === 'setValue') return (som, value) => (ops.push({ kind: 'setValue', som, value, at: NOW }), target.setValue(som, value));
      if (member === 'event') return (som, activity, fields) => (ops.push({ kind: 'event', som, activity, ...(fields === undefined ? {} : { fields }), at: NOW }), target.event(som, activity, fields));
      const value = Reflect.get(target, member);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  applyFixture(recording, fixtureSchema.parse(loadJson(`${form.code}.synthetic.json`)));
  runtime.dispose();
  return ops;
}

// ---- child modes ----------------------------------------------------------------------------------------------------

const opsSchema = z.array(z.looseObject({ kind: z.enum(['setValue', 'event']), som: z.string(), at: z.number() }));
const child = args.values.child;
if (child !== undefined) {
  const [mode, code] = [child, args.positionals[0]];
  const form = FORMS.find((f) => f.code === code);
  if (form === undefined) throw new Error(`unknown form ${code}`);
  if (mode === 'cold') {
    const session = connect();
    const t0 = performance.now();
    must(await session.send(openBody(form)), 'opened');
    const first = performance.now() - t0;
    session.close();
    const second = connect();
    const t1 = performance.now();
    must(await second.send(openBody(form)), 'opened');
    console.log(JSON.stringify({ sinceProcessStartMs: ms(t0 + first), firstOpenMs: ms(first), secondOpenMs: ms(performance.now() - t1) }));
    second.close();
  } else if (mode === 'rss' || mode === 'rss-plain') {
    const session = connect();
    const ops = opsSchema.parse(JSON.parse(readFileSync(0, 'utf8')));
    must(await session.send(openBody(form, { ops })), 'opened');
    const afterOpen = process.resourceUsage().maxRSS * 1024;
    if (mode === 'rss') must(await session.send({ kind: 'snapshot', at: NOW }), 'snapshotted');
    else must(await session.send({ kind: 'layout' }), 'laidOut');
    console.log(JSON.stringify({ maxRssAfterOpenAndFill: afterOpen, maxRssAtEnd: process.resourceUsage().maxRSS * 1024 }));
    session.close();
  } else throw new Error(`unknown mode ${mode}`);
  process.exit(0);
}

const runChild = (mode, form, input = '') => {
  const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--child', mode, form.code], { encoding: 'utf8', input, env: { ...process.env, XFA_CORPUS_DIR: corpus }, maxBuffer: 1 << 24 });
  if (run.status !== 0) throw new Error(`child ${mode} ${form.code} failed: ${run.stderr}`);
  return JSON.parse(run.stdout.trim().split('\n').pop());
};

// ---- sizes ----------------------------------------------------------------------------------------------------------

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)]));
}
console.log('== sizes (unbundled dist; a bundler tree-shakes and minifies, so these are upper bounds of the JS the page downloads) ==');
const all = filesUnder(dist);
const js = all.filter((f) => f.endsWith('.js'));
const dts = all.filter((f) => f.endsWith('.d.ts'));
const bytes = (files) => files.reduce((n, f) => n + statSync(f).size, 0);
console.log(`dist total: ${all.length} files, ${kib(bytes(all))}; .js: ${js.length} files ${kib(bytes(js))}; .d.ts: ${dts.length} files ${kib(bytes(dts))}`);

const relImport = /(?:import|export)\s[^'"]*?from\s*['"](\.[^'"]+)['"]|import\s*['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)/g;
const externalImport = /(?:import|export)\s[^'"]*?from\s*['"]([^.'"][^'"]*)['"]|import\(\s*['"]([^.'"][^'"]*)['"]\s*\)/g;
function graph(entry) {
  const seen = new Set();
  const external = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(relImport)) visit(resolve(dirname(file), m[1] ?? m[2] ?? m[3]));
    for (const m of text.matchAll(externalImport)) external.add(m[1] ?? m[2]);
  };
  visit(entry);
  const files = [...seen];
  const text = Buffer.concat(files.map((f) => readFileSync(f)));
  return { files: files.length, raw: text.length, gzip: gzipSync(text).length, external: [...external].sort() };
}
for (const [name, entry] of [['.', 'index.js'], ['./protocol', 'worker/protocol-entry.js'], ['./worker', 'worker/index.js']]) {
  const g = graph(join(dist, entry));
  console.log(`entry ${name}: ${g.files} files, ${kib(g.raw)} raw, ${kib(g.gzip)} gzip; packages: ${g.external.join(', ')}`);
}
const variantDir = dirname(fileURLToPath(import.meta.resolve('@jitl/quickjs-wasmfile-release-sync')));
const wasm = join(variantDir, 'emscripten-module.wasm');
if (existsSync(wasm)) {
  console.log(`QuickJS WASM (${wasm.split('node_modules/').pop()}): ${kib(statSync(wasm).size)} raw, ${kib(gzipSync(readFileSync(wasm)).length)} gzip`);
  const glue = join(variantDir, 'emscripten-module.browser.mjs');
  if (existsSync(glue)) console.log(`QuickJS loader glue (browser): ${kib(statSync(glue).size)}`);
}

// ---- cold ------------------------------------------------------------------------------------------------------------

console.log('\n== cold open + load, fresh process per form (blank form, no ops; ms) ==');
for (const form of FORMS) console.log(`${form.file}: ${JSON.stringify(runChild('cold', form))}`);

// ---- replay ----------------------------------------------------------------------------------------------------------

console.log('\n== replay: one `open` carrying N ops (ms total, ms per op); warm process ==');
for (const form of FORMS) {
  const fill = await fixtureOps(form);
  const warm = connect();
  must(await warm.send(openBody(form)), 'opened');
  warm.close();
  const base = connect();
  const t = performance.now();
  must(await base.send(openBody(form)), 'opened');
  console.log(`${form.file}: open with no ops ${ms(performance.now() - t)} ms; the fill is ${fill.length} ops`);
  base.close();
  for (const n of sizes) {
    const repeated = Array.from({ length: n }, (_, i) => fill[i % fill.length]);
    const changing = Array.from({ length: n }, (_, i) => ({ kind: 'setValue', som: FAMILY_NAME, value: `PERSON ${i}`, at: NOW + i * 1000 }));
    for (const [label, ops] of [['fill repeated', repeated], ['value-changing', changing]]) {
      const session = connect();
      const started = performance.now();
      const reply = await session.send(openBody(form, { ops }));
      const total = performance.now() - started;
      console.log(`  ${String(n).padStart(4)} ops, ${label.padEnd(14)}: ${reply.kind === 'opened' ? `${ms(total)} ms total, ${ms(total / n)} ms/op` : `${reply.kind} ${JSON.stringify(reply.reason ?? reply.message ?? '').slice(0, 160)} after ${ms(total)} ms`}`);
      session.close();
    }
  }
}

// ---- rss -------------------------------------------------------------------------------------------------------------

console.log(`\n== peak RSS (MiB), ${rssRuns} fresh processes per row: open + synthetic-person fill, then one more request ==`);
for (const form of FORMS) {
  const recorded = JSON.stringify(await fixtureOps(form));
  for (const [mode, label] of [['rss-plain', 'then `layout` (control)'], ['rss', 'then `snapshot` (verifies by opening the bytes again)']]) {
    const runs = Array.from({ length: rssRuns }, () => runChild(mode, form, recorded));
    console.log(`${form.file} ${label}: peak after open+fill ${mib(median(runs.map((r) => r.maxRssAfterOpenAndFill)))}, peak at end ${mib(median(runs.map((r) => r.maxRssAtEnd)))} (runs: ${runs.map((r) => mib(r.maxRssAtEnd)).join(', ')})`);
  }
}
