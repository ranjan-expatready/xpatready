import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Element } from '@xmldom/xmldom';
import { createFormDom, type FormDom, type FormNode } from '../../model/form/index.js';
import { MAX_MERGE_CHILD_VISITS } from '../../model/form/limits.js';
import { loadTemplate, variablesOf, type Manifest } from '../../model/template/index.js';
import { must } from '../../model/template/__tests__/helpers.js';
import { parseXml } from '../../xml/parse.js';
import { serializeXml } from '../../xml/serialize.js';
import { countNodes, structureOf } from '../../xml/__tests__/structure.js';
import { openXfaPdf } from '../../xfa-pdf.js';

// Set by scripts/run-corpus.mjs (absolute path). Running this file directly without it must fail loudly.
const dir = process.env.XFA_CORPUS_DIR;
if (dir === undefined || dir === '') throw new Error('NOT EXECUTED: XFA_CORPUS_DIR is not set; run via `pnpm test:corpus`');

const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
if (files.length === 0) throw new Error(`NOT EXECUTED: no *.pdf files in ${dir}`);

interface Loaded {
  readonly dom: FormDom;
  readonly datasets: ReturnType<typeof parseXml>;
  readonly before: string;
}

async function load(file: string): Promise<Loaded> {
  const pdf = await openXfaPdf(new Uint8Array(readFileSync(join(dir ?? '', file))));
  const model = loadTemplate(pdf.packet('template').text());
  const datasets = parseXml(pdf.packet('datasets').text());
  const before = serializeXml(datasets);
  return { dom: createFormDom(model, datasets), datasets, before };
}

/** `name[i]` segments from the root subform, as the manifest refs write them (test-only walker; W01-T04 owns real SOM). */
function walk(dom: FormDom, path: string): FormNode {
  let current: FormNode = dom.root;
  for (const segment of path.split('.')) {
    const m = /^([^[\]]+)(?:\[(\d+)\])?$/.exec(segment);
    if (m === null) throw new Error(`bad segment ${segment}`);
    current = must(current.children.filter((c) => c.name === m[1])[Number(m[2] ?? '0')], segment);
  }
  return current;
}

const manifestsOf = (dom: FormDom): readonly Manifest[] => variablesOf(must(dom.model.root.firstChild('subform'), 'root subform')).manifests;

const FORM_PREFIX = 'xfa[0].form[0].form1[0].';

const containers = (dom: FormDom): FormNode[] => {
  const out: FormNode[] = [];
  dom.walk((n) => {
    if ((n.className === 'field' || n.className === 'exclGroup') && n.parent?.className !== 'exclGroup') out.push(n);
  });
  return out;
};

describe.each(files)('form merge on real form %s', (file) => {
  it('a blank form ships fully merged data: merging creates and changes nothing (any new data node would mean the binding order differs from the form producer)', async () => {
    const { datasets, before } = await load(file);
    expect(serializeXml(datasets)).toBe(before);
  });

  it('A1: every field and exclusion group is bound to a data node except the match="none" ones, and every barcode manifest ref resolves to a bound data node', async () => {
    const { dom } = await load(file);
    const all = containers(dom);
    const bound = all.filter((n) => n.dataNode !== null);
    const unbound = all.filter((n) => n.dataNode === null);
    expect(unbound.length).toBeGreaterThan(0);
    for (const n of unbound) expect(n.template.firstChild('bind')?.attr('match'), `${n.className} ${n.name}`).toBe('none');
    // Evidence line for the task card.
    console.log(`${file}: ${bound.length} bound, ${unbound.length} unbound (all match="none"); ${all.length} named fields and exclusion groups`);

    let refs = 0;
    for (const manifest of manifestsOf(dom)) {
      for (const ref of manifest.refs) {
        if (!ref.endsWith('.dataNode')) continue;
        expect(ref.startsWith(FORM_PREFIX), ref).toBe(true);
        const node = walk(dom, ref.slice(FORM_PREFIX.length, -'.dataNode'.length));
        expect(['field', 'exclGroup']).toContain(node.className);
        expect(node.dataNode, ref).not.toBeNull();
        refs += 1;
      }
    }
    expect(refs).toBe(186);
  });

  it('A3: a second same-name exclusion group binds the second same-name data group child, not the first', async () => {
    const { dom } = await load(file);
    const secondRefs = manifestsOf(dom)
      .flatMap((m) => m.refs)
      .filter((r) => r.includes('Choice[1].') && r.endsWith('.dataNode'));
    expect(secondRefs.length).toBeGreaterThan(0);
    for (const ref of secondRefs) {
      const node = walk(dom, ref.slice(FORM_PREFIX.length, -'.dataNode'.length));
      const data = must(node.dataNode);
      const siblings = must(data.parent).children.filter((c) => c.name === data.name);
      expect(siblings.indexOf(data), ref).toBeGreaterThan(0);
      const tpl = must(node.parent).children.filter((c) => c.name === node.name);
      expect(siblings.indexOf(data), ref).toBe(tpl.indexOf(node));
    }
  });

  it('A2: a rawValue write on a text field and an exclusion-group choice reach the datasets DOM and survive serialize and re-parse', async () => {
    const { dom, datasets } = await load(file);
    const family = walk(dom, 'Page1[0].PersonalDetails[0].Name[0].FamilyName[0]');
    expect(family.rawValue).toBeNull();
    family.rawValue = 'Testfamily';
    const group = walk(dom, 'Page1[0].PersonalDetails[0].AliasName[0].AliasNameIndicator[0].AliasNameIndicator[0]');
    expect(group.className).toBe('exclGroup');
    group.rawValue = 'Y';
    expect(group.rawValue).toBe('Y');
    const reparsed = parseXml(serializeXml(datasets));
    expect(countNodes(reparsed)).toBe(countNodes(datasets));
    expect(structureOf(reparsed)).toEqual(structureOf(datasets));
    const text = (name: string): string | undefined => reparsed.getElementsByTagName(name)[0]?.textContent ?? undefined;
    expect(text('FamilyName')).toBe('Testfamily');
    expect(group.dataNode?.value).toBe('Y');
    group.rawValue = 'N';
    expect(walk(dom, 'Page1[0].PersonalDetails[0].AliasName[0].AliasNameIndicator[0].AliasNameIndicator[0].Yes[0]').rawValue).toBeNull();
  });

  it('A4: a country drop-down lists the list-of-values labels with the code as its value, and the label shows as the formatted value', async () => {
    const { dom } = await load(file);
    const field = walk(dom, 'Page1[0].PersonalDetails[0].PlaceBirthCountry[0]');
    const lov = must(dom.datasets.child('LOVFile')?.child('LOV')?.child('CountryOfBirthList'));
    const entries = lov.children;
    expect(entries.length).toBeGreaterThan(100);
    const [display, save] = field.childrenOfClass('items');
    expect(display?.children).toHaveLength(entries.length);
    expect(save?.children).toHaveLength(entries.length);
    const sample = must(entries[Math.min(5, entries.length - 1)]);
    const code = must(sample.child('lic')).value;
    expect(code).not.toBe('');
    field.rawValue = code;
    expect(field.rawValue).toBe(code);
    expect(field.formattedValue).toBe(sample.value);
    expect(field.selectedIndex).toBe(entries.indexOf(sample));
    expect(field.boundItem(sample.value)).toBe(code);
    field.selectedIndex = -1;
    expect(field.isNull).toBe(true);
  });

  it('every field answers the property chain the form scripts walk at load (ui.oneOfChild, border edge/corner/fill colours, caption, validate.nullTest) and a colour write round-trips verbatim', async () => {
    const { dom } = await load(file);
    let fields = 0;
    for (const node of containers(dom).filter((n) => n.className === 'field')) {
      fields += 1;
      const widget = must(must(node.property('ui'), `ui of ${node.name}`).oneOfChild, `widget of ${node.name}`);
      const border = must(widget.property('border'), `border of ${node.name}`);
      for (const side of [0, 1, 2, 3]) {
        expect(must(must(must(border.element('edge', side)).property('color')).attr('value'))).toMatch(/^\d+ *, *\d+ *, *\d+$/);
        expect(must(border.element('corner', side)).attr('radius')).toBeDefined();
      }
      expect(must(must(border.property('fill')).property('color')).attr('value')).toMatch(/^\d/);
      expect(must(node.property('caption')).className).toBe('caption');
      expect(['disabled', 'error', 'warning']).toContain(node.mandatory);
    }
    expect(fields).toBe(284 - 42);
    const sample = must(containers(dom).find((n) => n.className === 'field'));
    const color = must(must(must(must(sample.property('ui')).oneOfChild).property('border')).element('edge', 3));
    must(color.property('color')).setAttr('value', '231, 6, 6');
    expect(must(color.property('color')).attr('value')).toBe('231, 6, 6');
  });

  it('every rich-text caption keeps its exact markup through the read, prefix a marker, strip the marker, write cycle the required-field colouring performs', async () => {
    const { dom } = await load(file);
    let rich = 0;
    dom.walk((n) => {
      if (n.className !== 'exData') return;
      const original = n.nodeValue;
      expect(original.startsWith('<body')).toBe(true);
      n.nodeValue = `*${original}`;
      n.nodeValue = n.nodeValue.replace(/^\*+|\*+$/g, '');
      expect(n.nodeValue).toBe(original);
      rich += 1;
    });
    expect(rich).toBeGreaterThan(30);
  });

  it('F1: the list-of-values library call sequence (resolve LOVFile, loadXML of the LOV script object) leaves the datasets list equivalent and the drop-downs bound', async () => {
    const { dom } = await load(file);
    // The LOV script string spells some label spaces as no-break spaces where the shipped datasets has plain ones; that is the only difference.
    const strip = (text: string): string => text.replace(/>\s+</g, '><').replaceAll('\u00a0', ' ');
    const lovFile = must(dom.datasets.child('LOVFile'));
    const before = strip(serializeXml(lovFile.element));
    const country = walk(dom, 'Page1[0].PersonalDetails[0].PlaceBirthCountry[0]');
    const counts = (): number[] => country.childrenOfClass('items').map((i) => i.children.length);
    const listed = counts();

    const first = must(dom.form.nodes.item(0));
    const script = dom.get(first, 'LOV');
    expect(script.kind).toBe('value');
    const text = script.kind === 'value' && script.value !== null && typeof script.value === 'object' && !Array.isArray(script.value) ? dom.get(script.value as never, 'value') : undefined;
    expect(text?.kind === 'value' && typeof text.value === 'string' && text.value.length).toBeGreaterThan(100_000);
    if (text?.kind !== 'value') throw new Error('LOV has no value');
    dom.call(lovFile, 'loadXML', [text.value, 0, 1]);

    expect(strip(serializeXml(must(dom.datasets.child('LOVFile')).element as never))).toBe(before);
    expect(dom.mergeCount).toBe(1);
    expect(counts()).toEqual(listed);
    dom.remerge();
    expect(counts()).toEqual(listed);
  });

  it('F2: the Clear sequence (remove the form data root) leaves a blank bound form and the saved datasets holds form1 again with the same element structure and no duplicated list items', async () => {
    const { dom, datasets } = await load(file);
    // The shipped data also holds one `TextField` per page area instance the layout created (nine against three bound in
    // the template); a merge cannot know those, so they are left out of the comparison.
    const pageInstances = '/data/form1/TextField';
    const names = (el: Element): string[] => {
      const out: string[] = [];
      const pending: { e: Element; path: string }[] = [{ e: el, path: '' }];
      for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
        const path = `${next.path}/${next.e.localName ?? next.e.nodeName}`;
        out.push(path);
        for (let c = next.e.lastChild; c !== null; c = c.previousSibling) if (c.nodeType === 1) pending.push({ e: c as Element, path });
      }
      return out.filter((path) => path !== pageInstances);
    };
    const dataElement = must(dom.dataElement);
    const before = names(dataElement);
    const family = walk(dom, 'Page1[0].PersonalDetails[0].Name[0].FamilyName[0]');
    const country = walk(dom, 'Page1[0].PersonalDetails[0].PlaceBirthCountry[0]');
    const listed = country.childrenOfClass('items').map((i) => i.children.length);
    family.rawValue = 'Testfamily';

    const oldRoot = must(dom.data.child('form1'));
    expect(dom.call(dom.data.nodes, 'remove', [oldRoot]).kind).toBe('value');

    expect(dom.mergeCount).toBe(2);
    expect(family.rawValue).toBeNull();
    expect(must(dom.data.child('form1'))).not.toBe(oldRoot);
    expect(names(must(dom.dataElement))).toEqual(before);
    expect(country.childrenOfClass('items').map((i) => i.children.length)).toEqual(listed);
    expect(serializeXml(datasets)).toContain('<form1>');
    family.rawValue = 'Again';
    expect(must(family.dataNode).value).toBe('Again');
  });
});

describe.each(files)('merge work on real form %s', (file) => {
  it('merges and remerges within a hundredth of the merge-work ceiling, and reports its usage', async () => {
    const { dom } = await load(file);
    const loaded = dom.lastMergeVisits;
    dom.remerge();
    console.log(`${file}: merge visited ${loaded} child elements, remerge ${dom.lastMergeVisits}, ceiling ${MAX_MERGE_CHILD_VISITS}`);
    expect(loaded).toBeGreaterThan(0);
    expect(loaded * 100).toBeLessThan(MAX_MERGE_CHILD_VISITS);
    expect(dom.lastMergeVisits * 100).toBeLessThan(MAX_MERGE_CHILD_VISITS);
  });
});
