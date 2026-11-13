// B170c (P-464, P-470, P-474; design/xfa-reuse-analysis-2026-11-11.md §4.1 row c, §4.2 (4) and (6)): the child process
// the adapter (./index.ts) starts for one question to our XFA engine (packages/xfa-engine). Never imported: our code
// imports ./index.ts only, which runs this file in a separate process with a time limit.
// Reads one request from stdin, as JSON: { engine, file, descriptor, clock, timezone }
//   engine      the engine package's folder (its built dist/ is what runs)
//   file        the PDF to read
//   descriptor  the form's own Validate button, validated flag, first-missing-field variable and barcode container, as
//               data from the form's record (samples/xfa-forms.json); null asks only whether the engine reads the form
//   clock       the wall clock the form's scripts see (ms since 1970); timezone: the form's local zone
// Writes one line to stdout, as JSON: the engine's answer in the engine's own terms (raw); ./index.ts turns it into ours.
// The engine runs strict: a member it does not model stops the run, and is reported as a refusal, never skipped.
// Exit 0 whenever the engine answered, a refusal included (a refused form is an answer, never a crash); exit 1 only when
// the request itself could not be read. No form number, box name or program here (P-319, P-425): forms are data.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** A host identity that names no real product (the engine's own default rule, O-1: the identity is configuration). */
const HOST = { name: 'xfa-engine', appType: 'xfa-engine', version: '0', variation: 'headless', platform: 'unspecified', language: 'en' };

const say = (answer) => process.stdout.write(`${JSON.stringify(answer)}\n`);
const refusal = (e) => ({ kind: 'refused', code: typeof e?.code === 'string' ? e.code : (e?.name ?? 'Error'), message: String(e?.message ?? e).slice(0, 600) });

let request;
try {
  request = JSON.parse(readFileSync(0, 'utf8'));
} catch (e) {
  process.stderr.write(`run-engine: the request on stdin is not JSON: ${e?.message ?? e}\n`);
  process.exit(1);
}

let X;
try {
  X = await import(pathToFileURL(join(request.engine, 'dist', 'index.js')).href);
} catch (e) {
  say({ kind: 'no_engine', message: String(e?.message ?? e).slice(0, 300) });
  process.exit(0);
}

let descriptor = null;
try {
  descriptor = request.descriptor == null ? null : X.packFormDescriptorSchema.parse(request.descriptor);
} catch (e) {
  say({ kind: 'bad_descriptor', message: String(e?.message ?? e).slice(0, 600) });
  process.exit(0);
}

let runtime;
try {
  const pdf = await X.openXfaPdf(new Uint8Array(readFileSync(request.file)));
  // Strict (review Major 1, §4.2 (4)): a form script that touches a member the engine does not model stops the run
  // (UNSUPPORTED_MEMBER), so no answer ever rests on script the engine skipped; the engine's own real-form tests run so.
  runtime = await X.createFormRuntime(pdf, { host: HOST, clock: { now: () => request.clock }, timezone: request.timezone, strict: true });
  runtime.load();
  const pages = runtime.layout().pages.length;
  let answer;
  if (!descriptor) {
    answer = { kind: 'reads', pages };
  } else {
    const v = runtime.validate(descriptor);
    if (!v.complete) {
      answer = { kind: 'incomplete', pages, firstMissingField: v.firstMissingField, messages: v.messages.map((m) => m.text), flag: v.flag };
    } else {
      const b = runtime.encodeBarcodes(descriptor);
      answer = { kind: 'complete', pages, barcodes: b.payloads, barcodesValidated: b.validated, notes: v.notes };
    }
  }
  // And if anything was still skipped, the answer is not whole: say so, never pass it on.
  const skipped = (runtime.unsupported ?? []).map((u) => `${u.class ?? '?'}.${u.member ?? '?'}`);
  say(skipped.length ? { kind: 'refused', code: 'UNSUPPORTED_MEMBER', message: `the form's script used what the engine does not model: ${skipped.slice(0, 5).join(', ')}` } : answer);
} catch (e) {
  say(refusal(e));
} finally {
  try { runtime?.dispose(); } catch { /* the answer is already written */ }
}
