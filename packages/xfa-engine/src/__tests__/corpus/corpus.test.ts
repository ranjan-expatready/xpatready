import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parse as parseJs } from 'acorn';
import { DEFAULT_SANDBOX_LIMITS } from '../../script/limits.js';
import { longestRegexLiteral } from '../../script/regex-literals.js';
import { assertSupported, calculateOf, diagnosticPath, eventsOf, getElement, getProperty, isBareSomReference, loadTemplate, validateOf, variablesOf, type TemplateModel } from '../../model/template/index.js';
import { must } from '../../model/template/__tests__/helpers.js';
import { parseXml } from '../../xml/parse.js';
import { serializeXml } from '../../xml/serialize.js';
import { countElements, countNodes, structureOf } from '../../xml/__tests__/structure.js';
import { openXfaPdf } from '../../xfa-pdf.js';

// Set by scripts/run-corpus.mjs (absolute path). Running this file directly without it must fail loudly.
const dir = process.env.XFA_CORPUS_DIR;
if (dir === undefined || dir === '') throw new Error('NOT EXECUTED: XFA_CORPUS_DIR is not set; run via `pnpm test:corpus`');

const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
if (files.length === 0) throw new Error(`NOT EXECUTED: no *.pdf files in ${dir}`);

const REAL_FORM = 'imm1295e.pdf';
const REAL_FORM_PACKETS = ['xdp:xdp', 'config', 'template', 'localeSet', 'datasets', 'xmpmeta', 'xfdf', 'PDFSecurity', 'form', '</xdp:xdp>'];

const scratch = mkdtempSync(join(tmpdir(), 'xfa-corpus-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

interface QpdfResult {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

/** `qpdf --check` via execFileSync with an argument array (no shell). qpdf exits 2 on errors and 3 on warnings. */
function qpdfCheck(path: string): QpdfResult {
  try {
    const stdout = execFileSync('qpdf', ['--check', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { status: 0, stdout, stderr: '' };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? -1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

describe.each(files)('real-world XFA corpus: %s', (file) => {
  const path = join(dir, file);

  it('every packet is byte-equal to qpdf decrypted+decoded output (engine decoding drift or wrong packet object)', async () => {
    const pdf = await openXfaPdf(new Uint8Array(readFileSync(path)));
    expect(pdf.packets.length).toBeGreaterThan(0);
    for (const p of pdf.packets) {
      const expected = execFileSync('qpdf', [`--show-object=${p.ref.num}`, '--filtered-stream-data', path], { maxBuffer: 512 * 1024 * 1024 });
      expect(Buffer.from(p.bytes).equals(expected), `packet "${p.name}" (object ${p.ref.num}) differs from qpdf`).toBe(true);
    }
  });

  it.runIf(file === REAL_FORM)('real-world dynamic XFA form keeps its 10 packets in order and flags dynamic + usage rights', async () => {
    const pdf = await openXfaPdf(new Uint8Array(readFileSync(path)));
    expect(pdf.packets.map((p) => p.name)).toEqual(REAL_FORM_PACKETS);
    const datasets = pdf.packet('datasets').text().trim();
    expect(datasets.startsWith('<xfa:datasets')).toBe(true);
    // XML allows whitespace before the closing `>`; the real file writes `</xfa:datasets` + newline + `>`.
    expect(datasets).toMatch(/<\/xfa:datasets\s*>$/);
    expect(pdf.isDynamic).toBe(true);
    expect(pdf.hasUsageRights).toBe(true);
  });

  it('a datasets rewrite passes qpdf --check with no errors or warnings, keeps the original bytes, and re-opens with the new datasets (A3: a malformed xref stream or stale /Length would fail here)', async () => {
    const original = new Uint8Array(readFileSync(path));
    const pdf = await openXfaPdf(original);
    const target = pdf.packets.find((p) => p.name === 'datasets') ?? pdf.packets[0];
    if (target === undefined) throw new Error('corpus file has no packets');
    const marker = '<!-- xfa-engine write test -->';
    const newBytes = new TextEncoder().encode(`${target.text()}${marker}`);

    const output = await pdf.withPacket(target.name, newBytes);
    expect(Buffer.from(output.subarray(0, original.length)).equals(original), 'original bytes must stay an exact prefix').toBe(true);

    const outPath = join(scratch, `rewritten-${file}`);
    writeFileSync(outPath, output);
    const check = qpdfCheck(outPath);
    expect({ status: check.status, stderr: check.stderr }).toEqual({ status: 0, stderr: '' });
    expect(check.stdout).not.toMatch(/WARNING/);
    expect(check.stdout).toContain('No syntax or stream encoding errors found');

    const shown = execFileSync('qpdf', [`--show-object=${target.ref.num}`, '--filtered-stream-data', outPath], { maxBuffer: 512 * 1024 * 1024 });
    expect(Buffer.from(newBytes).equals(shown), `qpdf decodes object ${target.ref.num} to different bytes than were written`).toBe(true);

    const reopened = await openXfaPdf(output);
    expect(Buffer.from(reopened.packet(target.name).bytes).equals(newBytes)).toBe(true);
    expect(reopened.packets.map((p) => p.name)).toEqual(pdf.packets.map((p) => p.name));
    for (const p of pdf.packets) {
      if (p.name === target.name) continue;
      expect(Buffer.from(reopened.packet(p.name).bytes).equals(p.bytes), `packet "${p.name}" changed`).toBe(true);
    }
    expect(reopened.hasUsageRights).toBe(pdf.hasUsageRights);
    expect(reopened.isDynamic).toBe(pdf.isDynamic);
  });
});

/** UTF-8 text of the file's datasets packet, or undefined when the file has none (the CLI edits that packet only). */
async function datasetsTextOf(path: string): Promise<string | undefined> {
  const pdf = await openXfaPdf(new Uint8Array(readFileSync(path)));
  return pdf.packets.some((p) => p.name === 'datasets') ? Buffer.from(pdf.packet('datasets').bytes).toString('utf8') : undefined;
}

/** The owner-facing CLI (`sample:write`) runs from dist; build first so the test never exercises a stale bundle. */
describe.each(files)('sample:write CLI on %s', (file) => {
  const path = join(dir, file);
  const pkgDir = fileURLToPath(new URL('../../../', import.meta.url));
  const run = (args: string[]): { status: number; stderr: string } => {
    try {
      execFileSync(process.execPath, ['scripts/write-sample.mjs', ...args], { cwd: pkgDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      return { status: 0, stderr: '' };
    } catch (e) {
      const err = e as { status?: number; stderr?: string };
      return { status: err.status ?? -1, stderr: err.stderr ?? '' };
    }
  };

  beforeAll(() => {
    execFileSync('pnpm', ['run', 'build'], { cwd: pkgDir, stdio: 'ignore' });
  }, 120_000);

  it('rejects a wrong argument count or an empty <find> with exit 2 and no output file (argv is schema-validated, not trusted)', () => {
    const out = join(scratch, `cli-argv-${file}`);
    for (const args of [[], [path], [path, out, 'x'], [path, out, 'x', 'y', 'extra']]) {
      const result = run(args);
      expect({ args: args.length, status: result.status }).toEqual({ args: args.length, status: 2 });
      expect(result.stderr).toContain('usage');
    }
    const empty = run([path, out, '', 'x']);
    expect(empty.status).toBe(2);
    expect(empty.stderr).toContain('<find> must not be empty');
    expect(existsSync(out)).toBe(false);
  });

  it('refuses to write over its own input whether <out> is the same path, a symlink to it, or the same file under different letter case (the owner\'s original would be destroyed)', () => {
    const input = join(scratch, `cli-self-${file}`);
    copyFileSync(path, input);
    const before = readFileSync(input);
    const link = join(scratch, `cli-self-link-${file}`);
    symlinkSync(input, link);
    const candidates = [input, link];
    const upper = join(scratch, `CLI-SELF-${file}`);
    if (existsSync(upper)) candidates.push(upper);
    else console.warn('letter-case variant skipped: this filesystem is case-sensitive');
    for (const out of candidates) {
      const result = run([input, out, '<', '<']);
      expect({ out, status: result.status }).toEqual({ out, status: 2 });
      expect(readFileSync(input).equals(before), `input changed when <out> was ${out}`).toBe(true);
    }
  });

  it('exits non-zero and writes nothing when <find> is absent from the datasets text (a silent no-op would hand the owner an unmodified file)', async (ctx) => {
    if ((await datasetsTextOf(path)) === undefined) {
      console.warn(`skipped ${file}: no "datasets" packet`);
      ctx.skip(`${file} has no datasets packet`);
    }
    const out = join(scratch, `cli-absent-${file}`);
    const result = run([path, out, 'ABSENT-NEEDLE-\u00ff-not-in-any-form', 'x']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('not found');
    expect(existsSync(out)).toBe(false);
  });

  it('replaces only the FIRST occurrence of <find> in the datasets packet, leaves the rest byte-equal, and the file passes qpdf --check', async (ctx) => {
    const oldText = await datasetsTextOf(path);
    const at = oldText?.indexOf('<xfa:datasets') ?? -1;
    if (oldText === undefined || at < 0) {
      console.warn(`skipped ${file}: no datasets packet containing "<xfa:datasets"`);
      ctx.skip(`${file} has no datasets packet containing <xfa:datasets`);
      return;
    }
    const out = join(scratch, `cli-edit-${file}`);
    const marker = '<!--cli-marker-->';
    const result = run([path, out, '<xfa:datasets', `${marker}<xfa:datasets`]);
    expect(result).toEqual({ status: 0, stderr: '' });

    const before = await openXfaPdf(new Uint8Array(readFileSync(path)));
    const after = await openXfaPdf(new Uint8Array(readFileSync(out)));
    const newText = Buffer.from(after.packet('datasets').bytes).toString('utf8');
    expect(newText).toBe(`${oldText.slice(0, at)}${marker}${oldText.slice(at)}`);
    for (const p of before.packets) {
      if (p.name !== 'datasets') expect(Buffer.from(after.packet(p.name).bytes).equals(p.bytes), `packet "${p.name}" changed`).toBe(true);
    }
    expect(qpdfCheck(out).status).toBe(0);
  });
});

/** The XDP packets whose content is one XML document the runtime models (the others are fragments, XMP or opaque). */
const MODELLED_PACKETS = ['template', 'datasets', 'config', 'form'] as const;

describe.each(files)('XML DOM of the modelled packets: %s', (file) => {
  const path = join(dir, file);

  it('every template/datasets/config/form packet parses, and its element count is recorded (A1: a parser that failed on a real processing instruction, namespace or size would fail here)', async () => {
    const pdf = await openXfaPdf(new Uint8Array(readFileSync(path)));
    const counts: Record<string, { elements: number; nodes: number }> = {};
    for (const name of MODELLED_PACKETS) {
      if (!pdf.packets.some((p) => p.name === name)) continue;
      const doc = parseXml(pdf.packet(name).text());
      const measured = { elements: countElements(doc), nodes: countNodes(doc) };
      counts[name] = measured;
      expect(measured.elements, `packet "${name}" has no elements`).toBeGreaterThan(0);
    }
    expect(Object.keys(counts).length, 'no modelled packet found').toBeGreaterThan(0);
    console.info(`xml-evidence ${file} ${JSON.stringify(counts)}`);
  });

  it('each modelled packet survives serialize then parse with an equal structure (A2: namespaces, attributes, text, comment and PI positions)', async () => {
    const pdf = await openXfaPdf(new Uint8Array(readFileSync(path)));
    for (const name of MODELLED_PACKETS) {
      if (!pdf.packets.some((p) => p.name === name)) continue;
      const doc = parseXml(pdf.packet(name).text());
      const again = parseXml(serializeXml(doc));
      expect(structureOf(again) as unknown, `packet "${name}" changed in the round trip`).toEqual(structureOf(doc));
    }
  });

  it('a serialized datasets DOM written through withPacket and re-opened has the same structure (A2: the written bytes, not just the string, must round-trip)', async (ctx) => {
    const pdf = await openXfaPdf(new Uint8Array(readFileSync(path)));
    if (!pdf.packets.some((p) => p.name === 'datasets')) ctx.skip(`${file} has no datasets packet`);
    const doc = parseXml(pdf.packet('datasets').text());
    const written = await pdf.withPacket('datasets', new TextEncoder().encode(serializeXml(doc)));
    const reopened = await openXfaPdf(written);
    expect(structureOf(parseXml(reopened.packet('datasets').text())) as unknown).toEqual(structureOf(doc));
    for (const p of pdf.packets) {
      if (p.name !== 'datasets') expect(Buffer.from(reopened.packet(p.name).bytes).equals(p.bytes), `packet "${p.name}" changed`).toBe(true);
    }
  });
});

interface TemplateExpectation {
  readonly subforms: number;
  readonly fields: number;
  readonly exclGroups: number;
  readonly draws: number;
  readonly scriptObjects: number;
  readonly textVariables: number;
  readonly manifestRefs: Readonly<Record<string, number>>;
}

/**
 * Regression guards, not independent derivations: counts measured from the two real forms' own packets by the
 * discovery pass (2026-10-18). A file with no row here is checked generically only.
 */
const MANIFEST_REFS = { barcode1: 61, barcode2: 46, barcode3: 37, barcode4: 13, barcode5: 29 } as const;
const TEMPLATE_EXPECTED: Readonly<Record<string, TemplateExpectation>> = {
  'imm1295e.pdf': {
    subforms: 155,
    fields: 284,
    exclGroups: 21,
    draws: 220,
    scriptObjects: 10,
    textVariables: 3,
    manifestRefs: MANIFEST_REFS,
  },
  'imm5257e.pdf': {
    subforms: 150,
    fields: 284,
    exclGroups: 21,
    draws: 213,
    scriptObjects: 9,
    textVariables: 3,
    manifestRefs: MANIFEST_REFS,
  },
};

describe.each(files)('typed template model: %s', (file) => {
  const path = join(dir, file);
  const load = async (): Promise<TemplateModel> => loadTemplate((await openXfaPdf(new Uint8Array(readFileSync(path)))).packet('template').text());
  const countOf = (model: TemplateModel, className: string): number => model.nodes.filter((n) => n.className === className).length;

  it('loads through the feature gate, and the container, script-object, text-variable and manifest counts match the measured forms (A1: a dropped or doubled node changes a count)', async () => {
    const model = await load();
    const vars = variablesOf(must(model.root.firstChild('subform')));
    const counts = {
      subforms: countOf(model, 'subform'),
      fields: countOf(model, 'field'),
      exclGroups: countOf(model, 'exclGroup'),
      draws: countOf(model, 'draw'),
      scriptObjects: vars.scriptObjects.length,
      textVariables: vars.textVariables.length,
      manifestRefs: Object.fromEntries(vars.manifests.map((m) => [m.name, m.refs.length])),
    };
    console.info(`template-evidence ${file} ${JSON.stringify(counts)}`);
    expect(counts.fields).toBeGreaterThan(0);
    const expected = TEMPLATE_EXPECTED[file];
    if (expected === undefined) return;
    expect(counts).toEqual({
      subforms: expected.subforms,
      fields: expected.fields,
      exclGroups: expected.exclGroups,
      draws: expected.draws,
      scriptObjects: expected.scriptObjects,
      textVariables: expected.textVariables,
      manifestRefs: expected.manifestRefs,
    });
    for (const manifest of vars.manifests) for (const ref of manifest.refs) expect(ref.endsWith('.dataNode')).toBe(true);
  });

  it('every event element in the packet text is modelled: per-activity counts from an independent regular expression over the raw template equal the model (A1: an event lost under a nested property would silently stop a handler)', async () => {
    const text = (await openXfaPdf(new Uint8Array(readFileSync(path)))).packet('template').text();
    const fromText: Record<string, number> = {};
    for (const match of text.matchAll(/<event\b[^>]*?\bactivity="([^"]*)"/g)) {
      const activity = match[1] ?? '';
      fromText[activity] = (fromText[activity] ?? 0) + 1;
    }
    const model = await load();
    const byActivity: Record<string, number> = {};
    for (const node of model.nodes) for (const event of eventsOf(node)) byActivity[event.activity] = (byActivity[event.activity] ?? 0) + 1;
    expect(byActivity).toEqual(fromText);
    expect(Object.keys(byActivity).length).toBeGreaterThan(0);
  });

  it('the data-valued script object is classified data and every JavaScript script object is non-empty ES3 (A2: XML text evaluated as code, or text lost to entity handling, fails here)', async () => {
    const model = await load();
    const objects = variablesOf(must(model.root.firstChild('subform'))).scriptObjects;
    const data = objects.filter((o) => o.kind === 'data');
    expect(data.map((o) => o.name)).toEqual(['LOV']);
    expect(data[0]?.text.length ?? 0).toBeGreaterThan(100_000);
    const javascript = objects.filter((o) => o.kind === 'javascript');
    expect(javascript.length).toBeGreaterThan(0);
    for (const o of javascript) {
      expect(o.text.trim().length, `script object "${o.name}" is empty`).toBeGreaterThan(0);
      expect(() => parseJs(o.text, { ecmaVersion: 3 }), `script object "${o.name}" is not ES3`).not.toThrow();
      expect(longestRegexLiteral(o.text), `script object "${o.name}" holds a regex literal the sandbox would refuse`).toBeLessThanOrEqual(DEFAULT_SANDBOX_LIMITS.regexpSourceChars);
    }
  });

  it('every client JavaScript event and calculate script parses as ES3 and every FormCalc script is a bare SOM reference (A2/A4: the sandbox and D5 assume exactly this)', async () => {
    const model = await load();
    let javascript = 0;
    let formcalc = 0;
    for (const node of model.nodes) {
      const scripts = [...eventsOf(node).map((e) => e.script), calculateOf(node)?.script, validateOf(node)?.script];
      for (const script of scripts) {
        if (script === undefined || script.runAt === 'server' || script.text.trim() === '') continue;
        if (script.kind === 'formcalc') {
          formcalc += 1;
          expect(isBareSomReference(script.text.trim()), `FormCalc script "${script.text.trim().slice(0, 60)}"`).toBe(true);
        } else {
          javascript += 1;
          expect(script.kind).toBe('javascript');
          expect(() => parseJs(script.text, { ecmaVersion: 3, allowReturnOutsideFunction: true }), `script of ${diagnosticPath(node)}`).not.toThrow();
          expect(longestRegexLiteral(script.text), `script of ${diagnosticPath(node)} holds a regex literal the sandbox would refuse`).toBeLessThanOrEqual(DEFAULT_SANDBOX_LIMITS.regexpSourceChars);
        }
      }
    }
    console.info(`script-evidence ${file} javascript=${javascript} formcalc=${formcalc}`);
    expect(javascript).toBeGreaterThan(0);
  });

  it('passes the feature gate when asserted explicitly (A4: the real forms use none of the refused features)', async () => {
    const model = await load();
    expect(() => assertSupported(model)).not.toThrow();
  });

  it('every field answers ui.oneOfChild.border.getElement("edge"|"corner", 0..3).color.value and border.fill.color.value from the template or the defaults (A3: the load-time script walk must find a node, never null)', async () => {
    const model = await load();
    let fields = 0;
    for (const field of model.nodes.filter((n) => n.className === 'field')) {
      fields += 1;
      const widget = must(must(field.firstChild('ui'), `ui of ${diagnosticPath(field)}`).oneOfChild, `widget of ${diagnosticPath(field)}`);
      const validate = must(getProperty(field, 'validate'), `validate of ${diagnosticPath(field)}`);
      expect(['disabled', 'warning', 'error']).toContain(validate.attr('nullTest') ?? 'disabled');
      expect(validate.attr('scriptTest') ?? 'error').toMatch(/^(disabled|warning|error)$/);
      const border = must(getProperty(widget, 'border'), `border of ${diagnosticPath(field)}`);
      for (let i = 0; i < 4; i += 1) {
        for (const side of ['edge', 'corner']) {
          const color = must(getProperty(must(getElement(border, side, i), `${side} ${i}`), 'color'), `${side} ${i} color`);
          expect(color.attr('value'), `${side} ${i} of ${diagnosticPath(field)}`).toMatch(/^\d+,\s*\d+,\s*\d+$/);
        }
      }
      expect(must(getProperty(must(getProperty(border, 'fill')), 'color')).attr('value')).toMatch(/^\d+,\s*\d+,\s*\d+$/);
    }
    expect(fields).toBeGreaterThan(0);
  });

  it('identity holds across the whole template: id equals index, parent and child links agree, nodes are frozen (T03/T04 key on these)', async () => {
    const model = await load();
    expect(model.nodes.length).toBeGreaterThan(1000);
    model.nodes.forEach((node, i) => {
      expect(node.id).toBe(i);
      expect(Object.isFrozen(node)).toBe(true);
      if (node.parent !== null) expect(node.parent.children[node.index]).toBe(node);
    });
  });
});

describe('run-corpus entry point keeps its NOT EXECUTED contract', () => {
  const pkgDir = fileURLToPath(new URL('../../../', import.meta.url));
  const runCorpus = (env: Record<string, string>): { status: number; stderr: string } => {
    try {
      execFileSync(process.execPath, ['scripts/run-corpus.mjs'], { cwd: pkgDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: process.env.PATH ?? '', ...env } });
      return { status: 0, stderr: '' };
    } catch (e) {
      const err = e as { status?: number; stderr?: string };
      return { status: err.status ?? -1, stderr: err.stderr ?? '' };
    }
  };

  it('exits 2 with NOT EXECUTED when XFA_CORPUS_DIR is unset, blank or not a directory (a corpus run that cannot run must never look like a pass)', () => {
    const unset = runCorpus({});
    expect(unset.status).toBe(2);
    expect(unset.stderr).toContain('NOT EXECUTED: XFA_CORPUS_DIR is not set');
    const blank = runCorpus({ XFA_CORPUS_DIR: '   ' });
    expect(blank.status).toBe(2);
    expect(blank.stderr).toContain('NOT EXECUTED: XFA_CORPUS_DIR is not set');
    const missing = runCorpus({ XFA_CORPUS_DIR: join(scratch, 'does-not-exist') });
    expect(missing.status).toBe(2);
    expect(missing.stderr).toContain('NOT EXECUTED: XFA_CORPUS_DIR does not exist or is not a directory');
  });
});
