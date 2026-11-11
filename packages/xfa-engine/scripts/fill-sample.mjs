// Owner/dev tool: fill a form with a fictitious-data fixture the way a user does, run the form's own Validate and
// preSave handling, and write the form's data back into the PDF as an incremental update. Lives outside src/ on
// purpose: src is runtime-neutral (no node: imports).
// Usage: pnpm --filter @expatready-eros/xfa-engine sample:fill <in.pdf> <out.pdf> <fixture.json> <pack.json> [--tz <zone>] [--clock <iso>]
//          [--host-name <s> --host-app-type <s> --host-version <s> --host-variation <s> --host-platform <s> --host-language <s>]
//   <fixture.json>  SOM path (from the root subform) -> value, fictitious data only
//   <pack.json>     the Pack form descriptor: Validate button, validated flag, first-missing-field variable, barcode container
//   --tz            the form's local time zone: UTC (default), a fixed offset such as +05:30, or an IANA zone name
//   --clock         the injected wall clock as an ISO-8601 instant with a zone (default: now)
//   --host-*        the host identity the form's scripts see (xfa.host.name/appType/version/variation/platform/language),
//                   all six or none. Default: a neutral identity that names no real product. The value to use for real
//                   output is owner decision O-1, supplied here as configuration; the engine source holds none.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { createFormRuntime, openXfaPdf, packFormDescriptorSchema } from '../dist/index.js';
import { applyFixture, fixtureSchema } from '../dist/runtime/fixture.js';
import { allHostOrNone, clockOf, hostOf, realLocation, sharedOptionShape, sharedParseArgsOptions } from './lib/sample-common.mjs';

const USAGE = 'usage: sample:fill <in.pdf> <out.pdf> <fixture.json> <pack.json> [--tz <zone>] [--clock <iso>] [all six --host-name/--host-app-type/--host-version/--host-variation/--host-platform/--host-language]';

const nonEmpty = (what) => z.string().min(1, { error: `<${what}> must not be empty` });
const positionalsSchema = z.tuple([nonEmpty('in.pdf'), nonEmpty('out.pdf'), nonEmpty('fixture.json'), nonEmpty('pack.json')], { error: 'expected exactly four paths' });
const optionsSchema = z.strictObject(sharedOptionShape).refine(...allHostOrNone);

const usageError = (message) => {
  console.error(message);
  process.exit(2);
};

let values;
let positionals;
try {
  ({ values, positionals } = parseArgs({ args: process.argv.slice(2), allowPositionals: true, strict: true, options: sharedParseArgsOptions }));
} catch (error) {
  usageError([error instanceof Error ? error.message : String(error), USAGE].join('\n'));
}
const paths = positionalsSchema.safeParse(positionals);
const options = optionsSchema.safeParse(values);
if (!paths.success || !options.success) {
  const issues = [...(paths.success ? [] : paths.error.issues), ...(options.success ? [] : options.error.issues)];
  usageError([...issues.map((i) => i.message), USAGE].join('\n'));
}
const [inArg, outArg, fixtureArg, packArg] = paths.data;

// pnpm runs scripts in the package directory; INIT_CWD is where the user typed the command.
const base = process.env.INIT_CWD ?? process.cwd();
const [inPath, outPath, fixturePath, packPath] = [inArg, outArg, fixtureArg, packArg].map((p) => resolve(base, p));

/** True when both paths are the same file: same real path (symlinks), or same device+inode (case-insensitive filesystems, hard links). */
function isSameFile(a, b) {
  if (realLocation(a) === realLocation(b)) return true;
  if (!existsSync(a) || !existsSync(b)) return false;
  const sa = statSync(a);
  const sb = statSync(b);
  return sa.dev === sb.dev && sa.ino === sb.ino;
}

if (isSameFile(inPath, outPath)) usageError('<out.pdf> must differ from <in.pdf> (the original would be overwritten)');
if (isSameFile(fixturePath, outPath) || isSameFile(packPath, outPath)) usageError('<out.pdf> must differ from <fixture.json> and <pack.json>');

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

let runtime;
try {
  const fixture = fixtureSchema.parse(JSON.parse(readFileSync(fixturePath, 'utf8')));
  const pack = packFormDescriptorSchema.parse(JSON.parse(readFileSync(packPath, 'utf8')));
  const now = clockOf(options.data);
  const pdf = await openXfaPdf(new Uint8Array(readFileSync(inPath)));
  const host = hostOf(options.data);
  runtime = await createFormRuntime(pdf, { host, clock: { now: () => now }, ...(options.data.tz === undefined ? {} : { timezone: options.data.tz }) });
  runtime.load();
  applyFixture(runtime, fixture);
  const validated = runtime.validate(pack);
  if (!validated.complete) {
    const first = validated.messages[0]?.text.replaceAll('\n', ' / ') ?? '(no message)';
    fail(`the form's own Validate did not complete (flag ${JSON.stringify(validated.flag)}); first missing field ${validated.firstMissingField ?? '(none)'}; message: ${first}`);
  }
  const encoded = runtime.encodeBarcodes(pack);
  if (!encoded.validated || encoded.payloads.some((p) => p === null)) fail('preSave did not produce every barcode payload');
  const output = await runtime.save();
  writeFileSync(outPath, output);
  const sha256 = createHash('sha256').update(output).digest('hex');
  console.log(`wrote ${outPath} (${output.length} bytes; sha256 ${sha256})`);
  console.log(`validate: complete, flag ${JSON.stringify(validated.flag)}; barcode payload lengths ${JSON.stringify(encoded.payloads.map((p) => p.length))}`);
  console.log(`unsupported members: ${runtime.unsupported.length}; notes: ${runtime.notes.length}`);
  console.log(`host identity: ${JSON.stringify(host)}`);
} catch (error) {
  console.error(error instanceof Error ? `${error.name}${error.code ? ` ${error.code}` : ''}: ${error.message}` : String(error));
  process.exitCode = 1;
} finally {
  runtime?.dispose();
}
