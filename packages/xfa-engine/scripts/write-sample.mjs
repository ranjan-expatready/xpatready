// Owner/dev tool: replace the FIRST occurrence of <find> in a PDF's datasets packet and write the result as an
// incremental update. Lives outside src/ on purpose: src is runtime-neutral (no node: imports).
// Usage: pnpm --filter @expatready-eros/xfa-engine sample:write <in.pdf> <out.pdf> <find> <replace>
import { existsSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import { openXfaPdf } from '../dist/index.js';

const USAGE = 'usage: sample:write <in.pdf> <out.pdf> <find> <replace>';
const argvSchema = z.tuple([
  z.string().min(1, { error: '<in.pdf> must not be empty' }),
  z.string().min(1, { error: '<out.pdf> must not be empty' }),
  z.string().min(1, { error: '<find> must not be empty' }),
  z.string(),
]);

const usageError = (message) => {
  console.error(message);
  process.exit(2);
};

const parsed = argvSchema.safeParse(process.argv.slice(2));
if (!parsed.success) {
  const detail = parsed.error.issues.map((i) => i.message).filter((m) => m.endsWith('must not be empty'));
  usageError([...detail, USAGE].join('\n'));
}
const [inArg, outArg, find, replace] = parsed.data;

// pnpm runs scripts in the package directory; INIT_CWD is where the user typed the command.
const base = process.env.INIT_CWD ?? process.cwd();
const inPath = resolve(base, inArg);
const outPath = resolve(base, outArg);

/** Real location of a path that may not exist yet: symlinks resolved, via its directory when the file is absent. */
function realLocation(path) {
  if (existsSync(path)) return realpathSync(path);
  const dir = dirname(path);
  return existsSync(dir) ? join(realpathSync(dir), basename(path)) : path;
}

/** True when both paths are the same file: same real path (symlinks), or same device+inode (case-insensitive filesystems, hard links). */
function isSameFile(a, b) {
  if (realLocation(a) === realLocation(b)) return true;
  if (!existsSync(a) || !existsSync(b)) return false;
  const sa = statSync(a);
  const sb = statSync(b);
  return sa.dev === sb.dev && sa.ino === sb.ino;
}

if (isSameFile(inPath, outPath)) usageError('<out.pdf> must differ from <in.pdf> (the original would be overwritten)');

try {
  const pdf = await openXfaPdf(new Uint8Array(readFileSync(inPath)));
  const datasets = pdf.packet('datasets');
  // Byte-level search: every other byte of the packet (BOM, whitespace) stays exactly as it was.
  const bytes = Buffer.from(datasets.bytes);
  const at = bytes.indexOf(Buffer.from(find, 'utf8'));
  if (at < 0) {
    console.error(`<find> was not found in the datasets packet of ${inPath}`);
    process.exit(1);
  }
  const edited = Buffer.concat([bytes.subarray(0, at), Buffer.from(replace, 'utf8'), bytes.subarray(at + Buffer.byteLength(find, 'utf8'))]);
  const output = await pdf.withPacket('datasets', new Uint8Array(edited));
  writeFileSync(outPath, output);
  console.log(`wrote ${outPath} (${output.length} bytes; datasets object ${datasets.ref.num} ${datasets.ref.gen}; replaced at datasets byte ${at})`);
} catch (error) {
  console.error(error instanceof Error ? `${error.name}${error.code ? ` ${error.code}` : ''}: ${error.message}` : String(error));
  process.exit(1);
}
