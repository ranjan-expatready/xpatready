// Owner/dev tool (W02-T13): write the engine's pages as static, self-contained HTML (one file per page plus an index) so the
// owner can put them next to Acrobat's rendering of the same form. Read-only on the PDF: nothing is written back to it.
// Usage: pnpm --filter @expatready-eros/xfa-engine sample:render <in.pdf> <out-dir> [--fixture <json>] [--pack <json>] [--validate] [--force]
//          [--tz <zone>] [--clock <iso>]
//          [--host-name <s> --host-app-type <s> --host-version <s> --host-variation <s> --host-platform <s> --host-language <s>]
//   <in.pdf>     a blank form, or a form Acrobat saved (opened as it is: its saved data is what the engine lays out)
//   <out-dir>    receives page-01.html ... and index.html; it must lie outside the repository or under its git-ignored
//                .superpowers/xfa-render/ directory; earlier page-NN.html / index.html files in it are replaced; a directory
//                holding any other file or folder is refused (exit 2) unless --force is given (the other files are left alone)
//   --force      write into a directory that holds files other than a previous dump's
//   --fixture    fictitious values (SOM path -> value) written into the form the way sample:fill does, before the layout
//   --pack       the Pack form descriptor; needed by --validate (nothing else reads it)
//   --validate   also run the form's own Validate button (needs --pack); the layout shows the result, complete or not
//   --tz, --clock, --host-*   as sample:fill (clock default: now; host default: a neutral identity naming no product)
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { createFormRuntime, dashArrayOf, openXfaPdf, packFormDescriptorSchema, renderTreeSchema } from '../dist/index.js';
import { applyFixture, fixtureSchema } from '../dist/runtime/fixture.js';
import { isDumpFile, outDirAllowed, renderDump } from './lib/render-html.mjs';
import { allHostOrNone, clockOf, hostOf, realLocation, repoRootOf, sharedOptionShape, sharedParseArgsOptions } from './lib/sample-common.mjs';

const USAGE = 'usage: sample:render <in.pdf> <out-dir> [--fixture <json>] [--pack <json>] [--validate] [--force] [--tz <zone>] [--clock <iso>] [all six --host-name/--host-app-type/--host-version/--host-variation/--host-platform/--host-language]';

const nonEmpty = (what) => z.string().min(1, { error: `<${what}> must not be empty` });
const positionalsSchema = z.tuple([nonEmpty('in.pdf'), nonEmpty('out-dir')], { error: 'expected exactly two paths: <in.pdf> <out-dir>' });
const optionsSchema = z
  .strictObject({
    ...sharedOptionShape,
    fixture: z.string().min(1, { error: '--fixture must not be empty' }).optional(),
    pack: z.string().min(1, { error: '--pack must not be empty' }).optional(),
    validate: z.boolean().optional(),
    force: z.boolean().optional(),
  })
  .refine(...allHostOrNone)
  .refine((o) => o.validate !== true || o.pack !== undefined, { error: '--validate needs --pack <json> (the form descriptor names its Validate button)' });

const usageError = (message) => {
  console.error(message);
  process.exit(2);
};

let values;
let positionals;
try {
  ({ values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    strict: true,
    options: { ...sharedParseArgsOptions, fixture: { type: 'string' }, pack: { type: 'string' }, validate: { type: 'boolean' }, force: { type: 'boolean' } },
  }));
} catch (error) {
  usageError([error instanceof Error ? error.message : String(error), USAGE].join('\n'));
}
const paths = positionalsSchema.safeParse(positionals);
const options = optionsSchema.safeParse(values);
if (!paths.success || !options.success) {
  const issues = [...(paths.success ? [] : paths.error.issues), ...(options.success ? [] : options.error.issues)];
  usageError([...issues.map((i) => i.message), USAGE].join('\n'));
}

// pnpm runs scripts in the package directory; INIT_CWD is where the user typed the command.
const base = process.env.INIT_CWD ?? process.cwd();
const [inPath, outDir] = paths.data.map((p) => resolve(base, p));
const fixturePath = options.data.fixture === undefined ? undefined : resolve(base, options.data.fixture);
const packPath = options.data.pack === undefined ? undefined : resolve(base, options.data.pack);

const repoRoot = repoRootOf(realLocation(dirname(fileURLToPath(import.meta.url))));
const outReal = realLocation(outDir);
if (!outDirAllowed(outReal, repoRoot, '/')) {
  usageError(`<out-dir> ${outDir} is inside the repository; use a directory outside it, or one under ${join(repoRoot, '.superpowers', 'xfa-render')}`);
}

let foreign = [];
try {
  if (existsSync(outReal)) foreign = readdirSync(outReal).filter((name) => !isDumpFile(name));
} catch (error) {
  usageError(`<out-dir> ${outDir} cannot be read as a directory: ${error instanceof Error ? error.message : String(error)}`);
}
if (foreign.length > 0 && options.data.force !== true) {
  usageError(`<out-dir> ${outDir} holds files that are not a dump's (${foreign.slice(0, 3).join(', ')}${foreign.length > 3 ? ', ...' : ''}); use an empty or new directory, or pass --force to write into it anyway`);
}

let runtime;
try {
  const fixture = fixturePath === undefined ? undefined : fixtureSchema.parse(JSON.parse(readFileSync(fixturePath, 'utf8')));
  const pack = packPath === undefined ? undefined : packFormDescriptorSchema.parse(JSON.parse(readFileSync(packPath, 'utf8')));
  const now = clockOf(options.data);
  const host = hostOf(options.data);
  const pdf = await openXfaPdf(new Uint8Array(readFileSync(inPath)));
  runtime = await createFormRuntime(pdf, { host, clock: { now: () => now }, ...(options.data.tz === undefined ? {} : { timezone: options.data.tz }) });
  runtime.load();
  if (fixture !== undefined) applyFixture(runtime, fixture);
  let validation = 'not run';
  if (options.data.validate === true) {
    const result = runtime.validate(pack);
    const first = result.messages[0]?.text.replaceAll('\n', ' / ') ?? '(no message)';
    validation = result.complete
      ? `complete (flag ${JSON.stringify(result.flag)})`
      : `NOT complete (flag ${JSON.stringify(result.flag)}); first missing field ${result.firstMissingField ?? '(none)'}; message: ${first}`;
  }
  const tree = renderTreeSchema.parse(runtime.layout());
  const args = {
    'input pdf': basename(inPath),
    fixture: fixturePath === undefined ? '(none: form as opened)' : basename(fixturePath),
    pack: packPath === undefined ? '(none)' : basename(packPath),
    validate: validation,
    'time zone': options.data.tz ?? 'UTC (engine default)',
    clock: new Date(now).toISOString(),
    'host identity': JSON.stringify(host),
    'unsupported members': String(runtime.unsupported.length),
  };
  mkdirSync(outReal, { recursive: true });
  for (const name of readdirSync(outReal)) if (isDumpFile(name)) rmSync(join(outReal, name));
  for (const { file, html } of renderDump(tree, { dashArrayOf, args })) writeFileSync(join(outReal, file), html);
  console.log(`wrote ${tree.pages.length} page(s) + index.html to ${outReal}`);
  console.log(`validate: ${validation}; layout issues: ${tree.issues.length}; items per page: ${JSON.stringify(tree.pages.map((p) => p.items.length))}`);
  console.log(`host identity: ${JSON.stringify(host)}`);
} catch (error) {
  console.error(error instanceof Error ? `${error.name}${error.code ? ` ${error.code}` : ''}: ${error.message}` : String(error));
  process.exitCode = 1;
} finally {
  runtime?.dispose();
}
