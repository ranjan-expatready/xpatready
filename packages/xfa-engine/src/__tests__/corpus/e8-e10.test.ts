import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tokenizer } from 'acorn';
import { DOMParser, type Element } from '@xmldom/xmldom';
import { afterAll, describe, expect, it } from 'vitest';
import { connect, expectKind, openBody } from '../../worker/__tests__/support.js';
import { loadPack } from '../fixtures/form-data/apply.js';
import { SUBJECTS } from './acrobat-copies.js';
import { expectedProblems } from './problems-oracle.js';
import { blankSession, canonicalSom, corpusPdf, filledOutcome, FORM_CASES, NOON_UTC, TEST_HOST, type FormCase } from './form-cases.js';
import { createFormRuntime } from '../../runtime/runtime.js';
import { openXfaPdf } from '../../xfa-pdf.js';

/**
 * E8 to E10 on the two real forms. Every expectation comes from the PDFs: the forms' own template and saved `form` packet read as
 * XML (E9, E10), their scripts tokenised with a JavaScript tokenizer and the file decompressed by qpdf (E8), and the Acrobat-saved
 * copies. None comes from the code under test.
 */

const scratch = mkdtempSync(join(tmpdir(), 'xfa-e8-e10-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));
const BUDGET_MS = 300_000;
const AT = NOON_UTC;
const dir = process.env.XFA_CORPUS_DIR ?? '';

const elementsOf = (parent: Element, name?: string): Element[] => Array.from(parent.childNodes).filter((n): n is Element => n.nodeType === 1 && (name === undefined || n.nodeName === name));

/** The scripts the form runs: every JavaScript `script` of the template (a `script` that holds data and does not tokenise is returned apart). */
function scriptsOf(templateXml: string): { readonly code: string[]; readonly data: string[] } {
  const doc = new DOMParser().parseFromString(templateXml, 'text/xml');
  const code: string[] = [];
  const data: string[] = [];
  const all = doc.getElementsByTagName('script');
  for (let i = 0; i < all.length; i += 1) {
    const element = all.item(i);
    if (element === null || !(element.getAttribute('contentType') ?? '').includes('javascript')) continue;
    const text = element.textContent ?? '';
    try {
      for (const _token of tokenizer(text, { ecmaVersion: 'latest' })) void _token;
      code.push(text);
    } catch {
      data.push(text);
    }
  }
  return { code, data };
}

/** The names a script reaches under `app.`, `xfa.host.` and so on, read from tokens, so a call inside a comment or a string is not counted. */
function membersUnder(sources: readonly string[], root: readonly string[]): string[] {
  const found = new Set<string>();
  for (const source of sources) {
    const tokens = [...tokenizer(source, { ecmaVersion: 'latest' })];
    for (let i = 0; i < tokens.length; i += 1) {
      const names: string[] = [];
      let j = i;
      while (j < tokens.length && names.length < root.length + 1) {
        const token = tokens[j];
        if (token === undefined || token.type.label !== 'name') break;
        names.push(String(Reflect.get(token, 'value')));
        const dot = tokens[j + 1];
        if (dot === undefined || dot.type.label !== '.') break;
        j += 2;
      }
      const previous = tokens[i - 1];
      if (previous?.type.label === '.') continue;
      if (names.length === root.length + 1 && root.every((r, k) => names[k] === r)) found.add(names[root.length] ?? '');
    }
  }
  return [...found].sort();
}

const templateText = async (c: FormCase): Promise<string> => (await corpusPdf(c.file)).packet('template').text();

describe.each(FORM_CASES)('E8: reachability of the unbound host and app members, real form $file', (c) => {
  it('the template scripts the engine runs name only members it binds: no print, alert, response, launchURL or viewerType call', async () => {
    const { code, data } = scriptsOf(await templateText(c));
    expect(code.length).toBeGreaterThan(500);
    // The one JavaScript-typed script that does not tokenise is the form's list-of-values data, which holds no calls.
    expect(data).toHaveLength(1);
    expect(data[0]).not.toMatch(/\bapp\.|xfa\.host\./);
    expect(membersUnder(code, ['app'])).toEqual(['runtimeHighlight', 'runtimeHighlightColor']);
    expect(membersUnder(code, ['xfa', 'host'])).toEqual(['appType', 'language', 'messageBox', 'name', 'platform', 'setFocus', 'variation', 'version']);
    expect(membersUnder(code, ['console'])).toEqual(['println', 'show']);
    for (const wanted of ['print', 'alert', 'response', 'launchURL', 'viewerType', 'resetData']) {
      expect(membersUnder(code, ['app']).concat(membersUnder(code, ['xfa', 'host'])), wanted).not.toContain(wanted);
    }
  });

  it('where the raw text names one of them it is in a comment (one app.alert in one form, behind //), never a statement', async () => {
    const text = await templateText(c);
    const raw = (needle: string): number => text.split(needle).length - 1;
    expect(raw('app.alert')).toBe(c.form === 'imm1295' ? 1 : 0);
    for (const line of text.split('\n').filter((l) => l.includes('app.alert'))) expect(line.trimStart().startsWith('//'), line).toBe(true);
    expect(raw('launchURL') + raw('viewerType') + raw('app.response') + raw('.print(')).toBe(0);
    // xfa.host.resetData appears only on lines whose first non-space characters are `//`, once or twice per form.
    const lines = text.split('\n').filter((line) => line.includes('resetData'));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line.trimStart().startsWith('//'), line).toBe(true);
  });

  it('the four app members the task names are in the PDF\'s document-level JavaScript (the stock viewer-version check), which the engine never runs', () => {
    const out = join(scratch, `qdf-${c.file}`);
    execFileSync('qpdf', ['--qdf', '--object-streams=disable', join(dir, c.file), out]);
    const text = readFileSync(out, 'latin1');
    // Oracle: qpdf's own decompressed output. The code sits in the /Names /JavaScript tree entry below.
    expect(text).toContain('(!ADBE::0200_VersChkCode_XFACheck)');
    for (const member of ['app.launchURL(', 'app.response({', 'app.alert(', 'app.viewerType']) expect(text, member).toContain(member);
    // It runs only when the viewer has no XFA plug-in of version 2.6 or later.
    expect(text).toContain('typeof(xfa_installed) == "undefined" || typeof(xfa_version) == "undefined" || xfa_version < 2.6');
  });

  it('so running the form (load, the whole fixture, Validate) makes no request, raises none of that code\'s boxes and touches no unmodelled app member', async () => {
    const outcome = await filledOutcome(c);
    const { runtime } = outcome.session;
    expect(runtime.requests).toEqual([]);
    expect(outcome.validated.complete).toBe(true);
    expect(runtime.unsupported.filter((u) => u.class === 'app' || u.class === 'host')).toEqual([]);
    expect(runtime.messages.some((m) => /newer version of Adobe/i.test(m.text))).toBe(false);
  }, BUDGET_MS);
});

/** The fixture fields to leave alone and the two the partial fill writes. */
const PARTIAL = [
  ['Page1.PersonalDetails.Name.FamilyName', 'Testperson'],
  ['Page1.PersonalDetails.DOBYear', '1990'],
] as const;

describe.each(FORM_CASES)('E10: the full problem list, real form $file', (c) => {
  const pack = loadPack(c.form);

  it('the blank form lists exactly the fields its own template and saved state make mandatory, empty and visible, in document order, with the form\'s own text', async () => {
    const pdf = await corpusPdf(c.file);
    const expected = expectedProblems(pdf);
    const { runtime } = await blankSession(c);
    const listed = runtime.problems();
    expect(expected.length).toBeGreaterThan(30);
    expect(listed.truncated).toBe(false);
    expect(listed.problems.map((p) => ({ som: p.som, kind: p.kind, severity: p.severity, message: p.message }))).toEqual(
      expected.map((e) => ({ som: e.som, kind: 'nullTest', severity: e.severity, message: e.message })),
    );
  });

  it('a partial fill removes exactly the fields filled and nothing else', async () => {
    const pdf = await corpusPdf(c.file);
    const filled = new Set(PARTIAL.map(([som]) => canonicalSom(som)));
    const expected = expectedProblems(pdf).filter((e) => !filled.has(e.som));
    const { runtime } = await blankSession(c);
    const before = runtime.problems().problems.map((p) => p.som);
    for (const [som, value] of PARTIAL) runtime.setValue(canonicalSom(som), value);
    expect(before.filter((som) => filled.has(som))).toHaveLength(filled.size);
    expect(runtime.problems().problems.map((p) => p.som)).toEqual(expected.map((e) => e.som));
  });

  it('the form\'s own first missing field is in the list: on the blank form, and after a partial fill', async () => {
    const { runtime } = await blankSession(c);
    const blank = runtime.validate(pack);
    expect(blank.complete).toBe(false);
    expect(blank.firstMissingField).toBe(canonicalSom(c.firstMissingBlank));
    expect(runtime.problems().problems.map((p) => p.som)).toContain(blank.firstMissingField);
    for (const [som, value] of PARTIAL) runtime.setValue(canonicalSom(som), value);
    runtime.event(canonicalSom(PARTIAL[0][0]), 'exit');
    const next = runtime.validate(pack);
    expect(next.complete).toBe(false);
    expect(next.firstMissingField).not.toBeNull();
    expect(runtime.problems().problems.map((p) => p.som)).toContain(next.firstMissingField);
    // The form's own list stops at one; this one is longer.
    expect(runtime.problems().problems.length).toBeGreaterThan(1);
  }, BUDGET_MS);

  it('an unanswered exclusion group is one problem under the group\'s SOM, which covers the radio field the form names as its first missing field', async () => {
    const consent = c.invalid.find((i) => i.label === 'an unanswered consent question');
    if (consent === undefined) throw new Error('the case table has no consent question');
    const { session, validated } = await filledOutcome(c, {
      afterFixture: (runtime) => {
        runtime.setValue(consent.som, consent.value);
        runtime.event(consent.som, 'exit');
      },
    });
    const first = canonicalSom(consent.first);
    expect(validated).toMatchObject({ complete: false, firstMissingField: first });
    const group = canonicalSom(consent.som);
    expect(session.runtime.problems().problems).toEqual([{ som: group, kind: 'nullTest', severity: 'error', message: null, access: 'open' }]);
    expect(first.startsWith(`${group}.`)).toBe(true);
  }, BUDGET_MS);

  it('when the form\'s own Validate reports complete the list is empty', async () => {
    const outcome = await filledOutcome(c);
    expect(outcome.validated).toMatchObject({ complete: true, firstMissingField: null });
    expect(outcome.session.runtime.problems()).toEqual({ problems: [], truncated: false });
  }, BUDGET_MS);

  it('listing changes nothing: data, layout, flag, barcode container, recorded output and the form\'s own result are the same before and after', async () => {
    const { runtime } = await blankSession(c);
    runtime.validate(pack);
    const state = () => ({
      data: runtime.saveDatasets(),
      flag: runtime.getValue(pack.validatedFlag),
      barcodes: runtime.getProperty(pack.barcodes, 'presence'),
      payloads: runtime.encodeBarcodes(pack).payloads,
      messages: runtime.messages.length,
      focus: runtime.focus.length,
      requests: runtime.requests.length,
    });
    const tree = runtime.layout();
    const before = state();
    runtime.problems();
    runtime.problems();
    // `encodeBarcodes` is the form's own save handling and is not part of "listing": compare the rest, then the form's own re-run.
    expect({ ...state(), payloads: null, messages: 0, focus: 0 }).toEqual({ ...before, payloads: null, messages: 0, focus: 0 });
    expect(runtime.layout()).toBe(tree);
    expect(runtime.validate(pack)).toMatchObject({ complete: false, flag: 'No', firstMissingField: canonicalSom(c.firstMissingBlank) });
  }, BUDGET_MS);

  it('over the worker protocol: the same list, and it follows the ops without being one', async () => {
    const pdf = await corpusPdf(c.file);
    const expected = expectedProblems(pdf).map((e) => e.som);
    const client = connect();
    const opened = expectKind(await client.send(openBody(pdf.source, { pack, at: AT })), 'opened');
    expect(expectKind(await client.send({ kind: 'problems' }), 'problemList').problems.map((p) => p.som)).toEqual(expected);
    const [som, value] = PARTIAL[0];
    const applied = expectKind(await client.send({ kind: 'op', op: { kind: 'setValue', som, value, at: AT } }), 'applied');
    const after = expectKind(await client.send({ kind: 'problems' }), 'problemList');
    expect(after.problems.map((p) => p.som)).toEqual(expected.filter((s) => s !== canonicalSom(som)));
    expect(applied.opCount).toBe(opened.opCount + 1);
    // Neither form asks anything of its host while it loads.
    expect(Object.keys(opened)).not.toContain('requests');
  }, BUDGET_MS);
});

const VALIDATED = SUBJECTS.filter((s) => s.kind === 'validated');

describe.each(VALIDATED)('E10: Acrobat-validated copy $label lists no problem', (copy) => {
  it('Acrobat\'s own Validate set the form\'s flag (read from the saved data), and the engine lists nothing', async () => {
    const pdf = await openXfaPdf(new Uint8Array(readFileSync(copy.path)));
    const c = FORM_CASES.find((f) => copy.label.startsWith(f.form));
    if (c === undefined) throw new Error(`no corpus form for ${copy.label}`);
    const flag = loadPack(c.form).validatedFlag.split('.').pop() ?? '';
    const data = new DOMParser().parseFromString(pdf.packet('datasets').text(), 'text/xml').getElementsByTagName(flag);
    expect(data.length).toBeGreaterThan(0);
    expect((data.item(0)?.textContent ?? '').trim()).toBe(loadPack(c.form).validatedValue);
    const runtime = await createFormRuntime(pdf, { host: TEST_HOST, clock: { now: () => AT }, strict: c.strict });
    try {
      runtime.load();
      expect(runtime.problems()).toEqual({ problems: [], truncated: false });
    } finally {
      runtime.dispose();
    }
  }, BUDGET_MS);
});

describe.each(FORM_CASES)('E9: the clear button of real form $file', (c) => {
  const pack = loadPack(c.form);

  it('the descriptor fixture names the button whose caption is "Clear Form" in the template (not the Validate button beside it, nor the section button)', async () => {
    const doc = new DOMParser().parseFromString(await templateText(c), 'text/xml');
    const header = Array.from(doc.getElementsByTagName('subform')).find((s) => s.getAttribute('name') === 'ButtonsHeader');
    if (header === undefined) throw new Error('no ButtonsHeader subform');
    const buttons = elementsOf(header, 'field').filter((f) => f.getAttribute('name') === 'ValidateButton');
    const captions = buttons.map((b) => (elementsOf(b, 'caption')[0]?.textContent ?? '').trim());
    expect(captions).toEqual(['Validate', 'Clear Form']);
    expect(pack.clearButton).toBe(`Page1.ButtonsHeader.ValidateButton[${captions.indexOf('Clear Form')}]`);
    expect(pack.clearButton).not.toBe(pack.validateButton);
  });

  it('found: the engine resolves it to the canonical SOM of a button field', async () => {
    const { runtime } = await blankSession(c);
    expect(runtime.clearButton(pack)).toEqual({ status: 'found', som: canonicalSom(pack.clearButton ?? '') });
  });

  it('absent when the descriptor has none; an unknown SOM and a field that is not a button are typed issues, and the form still runs', async () => {
    const { runtime } = await blankSession(c);
    const { clearButton: _dropped, ...without } = pack;
    expect(runtime.clearButton(without)).toEqual({ status: 'absent' });
    expect(runtime.clearButton({ ...pack, clearButton: 'Page1.ButtonsHeader.NoSuchButton' })).toMatchObject({ status: 'issue', code: 'CLEAR_BUTTON_UNRESOLVED' });
    expect(runtime.clearButton({ ...pack, clearButton: 'Page1.PersonalDetails.Name.FamilyName' })).toMatchObject({ status: 'issue', code: 'CLEAR_BUTTON_NOT_A_BUTTON' });
    expect(runtime.clearButton({ ...pack, clearButton: 'Page1.PersonalDetails' })).toMatchObject({ status: 'issue', code: 'CLEAR_BUTTON_NOT_A_BUTTON' });
    expect(runtime.state).toBe('loaded');
    expect(runtime.validate(pack).complete).toBe(false);
  }, BUDGET_MS);

  it('over the worker protocol the open reports it, so the viewer can intercept the click; the click itself still reaches the form\'s own box', async () => {
    const pdf = await corpusPdf(c.file);
    const client = connect();
    const opened = expectKind(await client.send(openBody(pdf.source, { pack, at: AT })), 'opened');
    expect(opened.clearButton).toEqual({ status: 'found', som: canonicalSom(pack.clearButton ?? '') });
    const asked = expectKind(await client.send({ kind: 'op', op: { kind: 'event', som: pack.clearButton ?? '', activity: 'click', at: AT } }), 'answerRequired');
    expect(asked.call).toMatchObject({ title: 'Confirmation', icon: 2, buttons: 1 });
    const bad = connect();
    const issue = expectKind(await bad.send(openBody(pdf.source, { pack: { ...pack, clearButton: 'Page1.NoSuchButton' }, at: AT })), 'opened');
    expect(issue.clearButton).toMatchObject({ status: 'issue', code: 'CLEAR_BUTTON_UNRESOLVED' });
  }, BUDGET_MS);
});
