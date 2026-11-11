import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createFormDom, DataNode, FormNode, type FormDom } from '../../model/form/index.js';
import { resolveNode, resolveNodes, somExpressionOf } from '../../model/som/index.js';
import { calculateOf, eventsOf, loadTemplate } from '../../model/template/index.js';
import { must } from '../../model/template/__tests__/helpers.js';
import { XfaRuntimeError } from '../../runtime/errors.js';
import { createFormRuntime } from '../../runtime/runtime.js';
import type { FormRuntime, LoadReport } from '../../runtime/options.js';
import { FIXED_CLOCK, NEUTRAL_HOST } from '../../runtime/__tests__/helpers.js';
import { XfaScriptError } from '../../script/index.js';
import { parseXml } from '../../xml/parse.js';
import { openXfaPdf, type XfaPdf } from '../../xfa-pdf.js';

// Set by scripts/run-corpus.mjs (absolute path). Running this file directly without it must fail loudly.
const dir = process.env.XFA_CORPUS_DIR;
if (dir === undefined || dir === '') throw new Error('NOT EXECUTED: XFA_CORPUS_DIR is not set; run via `pnpm test:corpus`');

const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
if (files.length === 0) throw new Error(`NOT EXECUTED: no *.pdf files in ${dir}`);

interface Subject {
  readonly pdf: XfaPdf;
  /** A form DOM used only to find nodes and their canonical SOM; the runtime owns its own. */
  readonly dom: FormDom;
}

async function open(file: string): Promise<Subject> {
  const pdf = await openXfaPdf(new Uint8Array(readFileSync(join(dir ?? '', file))));
  const dom = createFormDom(loadTemplate(pdf.packet('template').text()), parseXml(pdf.packet('datasets').text()));
  return { pdf, dom };
}

const runtimes: FormRuntime[] = [];
afterAll(() => {
  for (const rt of runtimes) rt.dispose();
});

/** Strict: any member the engine does not model fails the load (A1 needs an EMPTY unsupported log). */
async function create(pdf: XfaPdf): Promise<FormRuntime> {
  const rt = await createFormRuntime(pdf, { host: NEUTRAL_HOST, clock: FIXED_CLOCK, strict: true });
  runtimes.push(rt);
  return rt;
}

const nodesWhere = (dom: FormDom, test: (n: FormNode) => boolean): FormNode[] => {
  const out: FormNode[] = [];
  dom.walk((n) => {
    if (test(n)) out.push(n);
  });
  return out;
};
const VALUE_CLASSES = new Set(['field', 'exclGroup']);
const som = (node: FormNode): string => somExpressionOf(node);
const child = (node: FormNode, name: string): FormNode => must(node.children.find((c) => c.name === name), `${node.name}.${name}`);

describe.each(files)('form runtime on real form %s', (file) => {
  it('A1: load() completes in strict mode with an empty unsupported log and no message box, and the initialize effects are visible', async () => {
    const { pdf, dom } = await open(file);
    const rt = await create(pdf);
    const report: LoadReport = rt.load();
    // Evidence line for the task card.
    console.log(
      `${file}: load ${report.elapsedMs.toFixed(0)} ms, ${report.scriptObjects} script objects, ${report.scriptsRun} scripts ${JSON.stringify(report.byPhase)}, ${report.calcPasses} calculate pass(es), unsupported=${rt.unsupported.length}, messageBox=${rt.messages.length}, console=${rt.console.length}`,
    );
    expect(rt.unsupported).toEqual([]);
    expect(rt.messages).toEqual([]);
    expect(report.scriptObjects).toBeGreaterThanOrEqual(9);
    expect(report.scriptsRun).toBeGreaterThan(10);
    // UCIClientID.JavaScriptMessage is hidden by the form's own initialize script.
    const message = must(nodesWhere(dom, (n) => n.name === 'JavaScriptMessage')[0], 'JavaScriptMessage');
    expect(rt.getProperty(som(message), 'presence')).toBe('hidden');
  });

  it('A1: the form\'s own initialize scripts empty a province list whose country is blank, and choosing a country then re-initialising fills it again', async () => {
    const { pdf, dom } = await open(file);
    const rt = await create(pdf);
    // The list-of-values code of the first real entry (entry 0 is the empty choice).
    const entry = resolveNode(dom.root, 'xfa.datasets.LOVFile.LOV.ProvinceAbbrevList.ProvinceAbbrev[1].lic');
    const code = entry instanceof DataNode ? entry.value : '';
    expect(code).not.toBe('');
    // A country field whose initialize script fills the list `target` from the province list when the country is the one it names.
    const driven = nodesWhere(dom, (n) => n.className === 'field' && n.name === 'Country')
      .flatMap((country) => {
        const script = eventsOf(country.template).find((e) => e.activity === 'initialize' && /ProvinceAbbrevList/.test(e.script?.text ?? ''))?.script?.text;
        const target = script === undefined ? undefined : /setDDLFromLOV\(\s*([A-Za-z_.]+)\s*,\s*"ProvinceAbbrevList/.exec(script)?.[1];
        const list = target === undefined ? null : resolveNode(country, target);
        return list instanceof FormNode ? [{ country, list }] : [];
      })[0];
    const { country, list } = must(driven, 'a country field that drives a province list');
    // Before the load the merge has filled the list from its bindItems: the code is selectable.
    list.rawValue = code;
    expect(list.selectedIndex).toBeGreaterThanOrEqual(0);
    rt.load();
    rt.setValue(som(list), code);
    expect(rt.getProperty(som(list), 'selectedIndex'), 'the blank-country initialize emptied the list').toBe(-1);
    // The code the form compares the country against is the one in its own script.
    const countryCode = must(/rawValue == "(\d+)"/.exec(eventsOf(country.template).find((e) => e.activity === 'initialize')?.script?.text ?? '')?.[1], 'country code in the script');
    rt.setValue(som(country), countryCode);
    rt.event(som(country), 'initialize');
    rt.setValue(som(list), code);
    expect(Number(rt.getProperty(som(list), 'selectedIndex'))).toBeGreaterThanOrEqual(0);
  });

  it('A2: setting the phone parts through setValue updates every computed ActualNumber (host-triggered recalculation)', async () => {
    const { pdf, dom } = await open(file);
    const rt = await create(pdf);
    rt.load();
    const computed = nodesWhere(dom, (n) => n.className === 'field' && n.name === 'ActualNumber');
    expect(computed.length).toBeGreaterThanOrEqual(3);
    for (const actual of computed) {
      const phone = must(actual.parent);
      const base = som(phone);
      rt.setValue(`${base}.CanadaUS`, '1');
      rt.setValue(`${base}.NANumber.AreaCode`, '555');
      rt.setValue(`${base}.NANumber.FirstThree`, '010');
      rt.setValue(`${base}.NANumber.LastFive`, '1234');
      expect(rt.getValue(som(actual)), base).toBe('5550101234');
    }
  });

  it('A2: assigning a JavaScript calculate\'s completion value changes no calculated field on a blank form, because every calculate ends in an explicit write or an untaken if', async () => {
    const { pdf, dom } = await open(file);
    const rt = await create(pdf);
    const calculated = nodesWhere(dom, (n) => VALUE_CLASSES.has(n.className) && calculateOf(n.template)?.script?.kind === 'javascript');
    expect(calculated.length).toBeGreaterThanOrEqual(10);
    const before = calculated.map((n) => n.rawValue);
    rt.load();
    expect(calculated.map((n) => rt.getValue(som(n)))).toEqual(before);
  });

  it('A3: a change event whose newText has four characters moves focus (recorded) to the month field of the date of birth', async () => {
    const { pdf, dom } = await open(file);
    const rt = await create(pdf);
    rt.load();
    const year = must(nodesWhere(dom, (n) => n.className === 'field' && n.name === 'DOBYear' && n.parent?.name === 'PersonalDetails')[0], 'DOBYear');
    const month = child(must(year.parent), 'DOBMonth');
    rt.event(som(year), 'change', { newText: '2000' });
    expect(rt.focus).toEqual([som(month)]);
    rt.event(som(year), 'change', { newText: '200' });
    expect(rt.focus).toHaveLength(1);
  });

  it('A4: the FormCalc bare references on Page5.TextField1[*] evaluate to the barcode fields\' values', async () => {
    const { pdf, dom } = await open(file);
    const rt = await create(pdf);
    rt.load();
    const targets = resolveNodes(dom.root, 'Page5.TextField1[*]').filter((n): n is FormNode => 'template' in n);
    expect(targets).toHaveLength(5);
    for (const t of targets) expect(calculateOf(t.template)?.script?.kind).toBe('formcalc');
    const barcodes = [1, 2, 3, 4, 5].map((i) => som(must(resolveNodes(dom.root, `Barcodes.PaperFormsBarcode${i}`)[0] as FormNode)));
    barcodes.forEach((b, i) => rt.setValue(b, `payload-${i + 1}`));
    targets.forEach((t, i) => expect(rt.getValue(som(t)), `TextField1[${i}]`).toBe(`payload-${i + 1}`));
  });

  it('A5: a script error in one real-form event is a typed error with the event, the node SOM and the guest stack, and the run aborts', async () => {
    const { pdf, dom } = await open(file);
    const anchor = 'JavaScriptMessage.presence = "hidden";';
    const original = pdf.packet('template').text();
    expect(original.split(anchor)).toHaveLength(2);
    const broken = await openXfaPdf(await pdf.withPacket('template', new TextEncoder().encode(original.replace(anchor, 'throw new Error("injected failure");'))));
    const rt = await create(broken);
    let caught: unknown;
    try {
      rt.load();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(XfaScriptError);
    const typed = caught as XfaScriptError;
    expect(typed.code).toBe('SCRIPT_ERROR');
    expect(typed.event).toBe('initialize');
    const owner = must(nodesWhere(dom, (n) => n.className === 'field' && n.name === 'UCIClientID')[0], 'UCIClientID');
    expect(typed.nodeSom).toBe(som(owner));
    expect(typed.guestStack).toBeDefined();
    expect(typed.message).toContain('injected failure');
    expect(rt.state).toBe('aborted');
    expect(() => rt.event(som(owner), 'exit')).toThrow(XfaRuntimeError);
  });
});
