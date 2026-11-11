import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as worker from '../index.js';
import * as protocol from '../protocol-entry.js';
import * as main from '../../index.js';
import { opSchema, parseRequest, parseResponse, PROTOCOL_VERSION, requestSchema, responseSchema } from '../protocol.js';
import { openBody, syntheticPdf, T0 } from './support.js';

/** The whole surface of the `./worker` subpath, values and types. A name added or removed here is a deliberate API change (W03-T14). */
const WORKER_VALUES = ['MIN_FORM_RUN_DEADLINE_MS', 'serveFormSession'];
const WORKER_TYPES = ['FormSessionHandle', 'FormSessionOptions', 'SessionPort'];
/** The surface of the `./protocol` subpath: what a page needs to talk to the worker, and nothing that runs a form. */
const PROTOCOL_VALUES = [
  'MAX_ANSWERS_PER_OP', 'MAX_ANSWER_VALUE', 'MAX_OPS_PER_OPEN', 'MAX_OPS_TEXT_CHARS', 'MIN_FORM_RUN_DEADLINE_MS', 'PROTOCOL_VERSION',
  'opSchema', 'parseRequest', 'parseResponse', 'requestSchema', 'responseSchema',
];
const PROTOCOL_TYPES = ['FailedResponse', 'MessageBoxCallData', 'Op', 'OpenRequest', 'ParsedRequest', 'Request', 'Response'];

const here = new URL('../', import.meta.url);

function exportedNames(file = 'index.ts'): string[] {
  const names: string[] = [];
  for (const match of readFileSync(new URL(file, here), 'utf8').matchAll(/export\s+(?:type\s+)?\{([^}]*)\}\s*from/g)) {
    for (const part of (match[1] ?? '').split(',')) {
      const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()?.trim();
      if (name !== undefined && name !== '') names.push(name);
    }
  }
  return names.sort();
}

describe('the ./worker subpath (W03-T14)', () => {
  it('exports exactly the agreed values and types; no engine internal leaks through it', () => {
    expect(Object.keys(worker).sort()).toEqual(WORKER_VALUES);
    expect(exportedNames()).toEqual([...WORKER_VALUES, ...WORKER_TYPES].sort());
    for (const internal of ['FormSession', 'createFormRuntime', 'openXfaPdf', 'XfaAnswerRequiredError', 'XfaRuntimeError', 'opTextChars', 'peekId']) {
      expect(Object.keys(worker)).not.toContain(internal);
    }
  });

  it('the ./protocol subpath exports exactly the agreed values and types; the session code is not among them', () => {
    expect(Object.keys(protocol).sort()).toEqual(PROTOCOL_VALUES);
    expect(exportedNames('protocol-entry.ts')).toEqual([...PROTOCOL_VALUES, ...PROTOCOL_TYPES].sort());
    for (const internal of ['serveFormSession', 'FormSession', 'peekId', 'opTextChars', 'peekPdfBytes']) expect(Object.keys(protocol)).not.toContain(internal);
  });

  it('the main entry is unchanged by the worker: its values are still the agreed set and the worker adds none', () => {
    expect(Object.keys(main).sort()).toEqual(['MAX_PDF_BYTES', 'RENDER_TREE_VERSION', 'XfaPdfError', 'createFormRuntime', 'dashArrayOf', 'openXfaPdf', 'packFormDescriptorSchema', 'renderTreeSchema']);
  });

  it('package.json maps ./worker to the built worker entry with types, beside the main entry', () => {
    const pkg: unknown = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));
    expect(pkg).toMatchObject({
      exports: {
        '.': { types: './dist/index.d.ts', import: './dist/index.js' },
        './protocol': { types: './dist/worker/protocol-entry.d.ts', import: './dist/worker/protocol-entry.js' },
        './worker': { types: './dist/worker/index.d.ts', import: './dist/worker/index.js' },
      },
    });
  });

  it('the worker source is runtime-neutral: no node: import, no DOM global, no `any`', () => {
    const files = readdirSync(here).filter((name) => name.endsWith('.ts'));
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const file of files) {
      const source = readFileSync(new URL(file, here), 'utf8');
      expect(source, file).not.toMatch(/from\s+'node:/);
      expect(source, file).not.toMatch(/\b(?:window|document|self|MessagePort|MessageEvent|Worker)\b\s*[.(:<]/);
      expect(source, file).not.toMatch(/:\s*any\b|<any>|\bas any\b/);
    }
  });
});

describe('the protocol schemas', () => {
  it('the version is 2 and a request is accepted only with it', () => {
    expect(PROTOCOL_VERSION).toBe(2);
    expect(parseRequest({ v: 2, id: 0, kind: 'dispose' })).toMatchObject({ ok: true });
    expect(parseRequest({ id: 0, kind: 'dispose' })).toMatchObject({ ok: false, code: 'UNSUPPORTED_VERSION', id: 0 });
  });

  it('every request kind and every op kind parses, and the schemas are strict (no stray key)', () => {
    const pdf = syntheticPdf();
    const bodies = [openBody(pdf), openBody(pdf, { answers: [1, 2] }), { kind: 'op', op: { kind: 'validate', at: T0 } }, { kind: 'layout' }, { kind: 'download', at: T0 }, { kind: 'snapshot', at: T0 }, { kind: 'problems' }, { kind: 'dispose' }];
    for (const body of bodies) {
      expect(requestSchema.safeParse({ v: 2, id: 3, ...body }).success, String(body['kind'])).toBe(true);
      expect(requestSchema.safeParse({ v: 2, id: 3, ...body, extra: 1 }).success, String(body['kind'])).toBe(false);
    }
    expect(opSchema.safeParse({ kind: 'event', som: 'a', activity: 'click', fields: { newText: 'x' }, at: T0, answers: [1, 2] }).success).toBe(true);
    expect(opSchema.safeParse({ kind: 'event', som: 'a', activity: 'click', fields: { nope: 1 }, at: T0 }).success).toBe(false);
  });

  it('responses are checked by the same package: a reply with a stray key or a wrong id type is refused by the client parse', () => {
    expect(parseResponse({ v: 2, id: 1, kind: 'disposed' }).success).toBe(true);
    expect(parseResponse({ v: 2, id: 1, kind: 'disposed', extra: 1 }).success).toBe(false);
    expect(parseResponse({ v: 2, id: 'one', kind: 'disposed' }).success).toBe(false);
    expect(parseResponse({ v: 2, id: null, kind: 'failed', code: 'X', message: 'm' }).success).toBe(true);
    expect(responseSchema.safeParse({ v: 2, id: 1, kind: 'aborted', reason: { code: 'X', message: 'm' }, opIndex: null }).success).toBe(true);
    const call = { text: 't', title: 't', icon: 0, buttons: 1 };
    expect(responseSchema.safeParse({ v: 2, id: 1, kind: 'answerRequired', call, opIndex: null }).success).toBe(true);
    expect(responseSchema.safeParse({ v: 2, id: 1, kind: 'answerRequired', call, opIndex: 3 }).success).toBe(true);
    expect(responseSchema.safeParse({ v: 2, id: 1, kind: 'snapshotted', bytes: new Uint8Array(1), faithful: true }).success).toBe(true);
    expect(responseSchema.safeParse({ v: 2, id: 1, kind: 'snapshotted', bytes: new Uint8Array(1) }).success).toBe(false);
    expect(responseSchema.safeParse({ v: 2, id: 1, kind: 'snapshotted', bytes: new Uint8Array(1), faithful: true, extra: 1 }).success).toBe(false);
  });
});
