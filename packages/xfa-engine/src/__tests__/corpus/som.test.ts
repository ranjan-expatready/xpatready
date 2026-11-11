import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createFormDom, DataNode, FormNode, type DomNode, type FormDom } from '../../model/form/index.js';
import { resolveNode, resolveNodes, somExpressionOf } from '../../model/som/index.js';
import { argumentsOfCallsTo, extractSomCalls, identifiersIn, referencesToFunction, scriptSources, type SomCall } from '../../model/som/__tests__/literals.js';
import { loadTemplate, variablesOf, type Manifest } from '../../model/template/index.js';
import { must } from '../../model/template/__tests__/helpers.js';
import { parseXml } from '../../xml/parse.js';
import { openXfaPdf } from '../../xfa-pdf.js';

// Set by scripts/run-corpus.mjs (absolute path). Running this file directly without it must fail loudly.
const dir = process.env.XFA_CORPUS_DIR;
if (dir === undefined || dir === '') throw new Error('NOT EXECUTED: XFA_CORPUS_DIR is not set; run via `pnpm test:corpus`');

const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
if (files.length === 0) throw new Error(`NOT EXECUTED: no *.pdf files in ${dir}`);

/** A place a script runs from, and what the call must produce there. */
interface Context {
  readonly from: DomNode;
  readonly label: string;
}

const widgetOf = (field: FormNode): string | undefined => field.property('ui')?.oneOfChild?.className;
const fieldsOf = (dom: FormDom): FormNode[] => {
  const out: FormNode[] = [];
  dom.walk((n) => {
    if (n.className === 'field') out.push(n);
  });
  return out;
};
const drawsOf = (dom: FormDom): FormNode[] => {
  const out: FormNode[] = [];
  dom.walk((n) => {
    if (n.className === 'draw') out.push(n);
  });
  return out;
};

/**
 * The nodes a call is made from. `xfa.resolveNode` runs from the container whose script it is. A call on a node the
 * script was handed (`oNode`, `oField`) runs from every node the calling library function is guarded to accept, which
 * the guard in the form's own code states (the comments name the guard).
 */
function contextsOf(dom: FormDom, call: SomCall): Context[] {
  const owner = must(dom.formNodeFor(call.owner), `form node of ${call.owner.className} ${call.owner.name}`);
  const key = `${call.receiver} => ${call.literal ?? ''}`;
  switch (call.receiver) {
    case 'xfa':
      return [{ from: owner, label: `${owner.className} ${owner.name} (${call.origin})` }];
    case 'xfa.datasets':
      return [{ from: dom.datasets, label: 'xfa.datasets' }];
    case 'oNode':
      // makeMultiLine / makeSingleLine: `if (oNode.ui.oneOfChild.className == "textEdit")`.
      if (call.literal === 'ui.#textEdit') return fieldsOf(dom).filter((f) => widgetOf(f) === 'textEdit').map((f) => ({ from: f, label: `field ${f.name}` }));
      break;
    case 'oNode.ui':
      // GetType / setDDLFromLOV: the node is a field whose widget is a choiceList.
      if (call.literal === '#choiceList') {
        return fieldsOf(dom)
          .filter((f) => widgetOf(f) === 'choiceList')
          .map((f) => ({ from: must(f.property('ui')), label: `ui of field ${f.name}` }));
      }
      break;
    case 'oField':
      // IsEmpty: `oField.ui.oneOfChild.className == "checkButton"`.
      if (call.literal === '#items') return fieldsOf(dom).filter((f) => widgetOf(f) === 'checkButton').map((f) => ({ from: f, label: `field ${f.name}` }));
      break;
    case 'oNode.value':
      // getCaption / setCaption `case "draw"`.
      if (call.literal === '#text') return drawsOf(dom).flatMap((d) => (d.property('value') === undefined ? [] : [{ from: must(d.property('value')), label: `value of draw ${d.name}` }]));
      break;
    case 'oNode.caption.value':
      // getCaption / setCaption `case "field"`; the `#exData` call is reached only when `#text` came back as the text variable.
      if (call.literal === '#text' || call.literal === '#exData') {
        return fieldsOf(dom)
          .map((f) => ({ f, value: f.property('caption')?.property('value') }))
          .filter(({ value }) => value !== undefined && (call.literal === '#text' || value.oneOfChild?.className === 'exData'))
          .map(({ f, value }) => ({ from: must(value), label: `caption value of field ${f.name}` }));
      }
      break;
    default:
      break;
  }
  throw new Error(`no calling context is defined for ${key}; add the guard the form's code applies`);
}

interface Loaded {
  readonly dom: FormDom;
  readonly calls: SomCall[];
}

const manifestsOf = (dom: FormDom): readonly Manifest[] => variablesOf(must(dom.model.root.firstChild('subform'), 'root subform')).manifests;

describe.each(files)('SOM resolver on real form %s', (file) => {
  let loaded: Loaded;
  beforeAll(async () => {
    const pdf = await openXfaPdf(new Uint8Array(readFileSync(join(dir, file))));
    const model = loadTemplate(pdf.packet('template').text());
    const dom = createFormDom(model, parseXml(pdf.packet('datasets').text()));
    loaded = { dom, calls: extractSomCalls(model) };
  });

  it('A1: every string literal the form\'s scripts pass to resolveNode / resolveNodes resolves from the node it is called from, except literals in library functions no script can reach', () => {
    const { dom, calls } = loaded;
    const literals = calls.filter((c) => c.literal !== undefined);
    const dynamic = calls.filter((c) => c.literal === undefined);
    const failures: string[] = [];
    const justified: string[] = [];
    let resolved = 0;
    for (const call of literals) {
      const contexts = contextsOf(dom, call);
      expect(contexts.length, `${call.origin} ${call.receiver}.${call.method}(${call.argument}) has a calling context`).toBeGreaterThan(0);
      const missed = contexts.filter((context) =>
        call.method === 'resolveNode' ? resolveNode(context.from, call.literal ?? '') === null : resolveNodes(context.from, call.literal ?? '').length === 0,
      );
      if (missed.length === 0) {
        resolved += 1;
        continue;
      }
      // The only accepted reason: the call sits in a top-level library function that no script in the template mentions
      // (a function copied from the other form's library: it names fields this form does not have and nothing calls it).
      const dead = call.functionName !== undefined && !call.serverOnly && referencesToFunction(dom.model, call.functionName) === 0;
      (dead ? justified : failures).push(`${call.origin} ${call.functionName ?? '-'}: ${call.receiver}.${call.method}(${call.argument}) from ${missed[0]?.label ?? ''}`);
    }
    const distinct = (list: readonly SomCall[]): number => new Set(list.map((c) => `${c.receiver}|${c.literal}`)).size;
    console.log(
      `${file}: ${literals.length} literal calls (${distinct(literals)} distinct): ${resolved} resolved, ${justified.length} unresolved and justified (function never referenced), ${failures.length} unexplained; ${dynamic.length} computed-argument calls; ${calls.filter((c) => c.serverOnly).length} server-only`,
    );
    for (const line of justified) console.log(`  JUSTIFIED ${line}`);
    expect(failures).toEqual([]);
    expect(resolved + justified.length).toBe(literals.length);
  });

  it('A1: a library literal resolves the same from every container that owns a script, except from the page-header fields, which never call a library', () => {
    const { dom, calls } = loaded;
    const sources = scriptSources(dom.model);
    const owners = [...new Set(sources.map((x) => x.owner))].map((t) => dom.formNodeFor(t)).filter((n): n is FormNode => n !== undefined);
    const libraries = new Set(variablesOf(dom.model.root.firstChild('subform') ?? dom.model.root).scriptObjects.map((o) => o.name));
    const literals = calls.filter((c) => c.literal !== undefined && c.receiver === 'xfa' && c.origin.startsWith('variables:'));
    const divergent = new Set<FormNode>();
    for (const call of literals) {
      const reference = resolveNode(dom.root, call.literal ?? '');
      for (const owner of owners) if (resolveNode(owner, call.literal ?? '') !== reference) divergent.add(owner);
    }
    for (const owner of divergent) {
      // A name equal to a page area (`Page1`) is found in the page set first, so a path from inside a page area differs.
      let inPageArea = false;
      for (let up: FormNode | null = owner; up !== null; up = up.parent) inPageArea ||= up.className === 'pageArea';
      expect(inPageArea, `${owner.className} ${owner.name} differs but is not in a page area`).toBe(true);
      for (const source of sources.filter((x) => dom.formNodeFor(x.owner) === owner)) {
        const mentioned = [...identifiersIn(source.source)].filter((name) => libraries.has(name));
        expect(mentioned, `${owner.name} ${source.origin} must not call a library`).toEqual([]);
      }
    }
    console.log(`${file}: ${literals.length} library literal calls resolved from ${owners.length} script-owning containers; ${divergent.size} page-area fields differ (none reaches a library)`);
    expect(owners.length).toBeGreaterThan(200);
  });

  it('A1: the computed arguments are covered by their producers: every field answers #<widget> from its ui (color.GetType), and every list path the forms pass to setDDLFromLOV resolves in the lookup data', () => {
    const { dom } = loaded;
    let widgets = 0;
    for (const field of fieldsOf(dom)) {
      const widget = must(widgetOf(field), `widget of ${field.name}`);
      expect(resolveNode(must(field.property('ui')), `#${widget}`), `${field.name} #${widget}`).toBe(must(field.property('ui')).oneOfChild);
      widgets += 1;
    }
    let paths = 0;
    const lov = resolveNode(dom.root, 'xfa.datasets.LOVFile.LOV');
    expect(lov).toBeInstanceOf(DataNode);
    for (const source of scriptSources(dom.model)) {
      for (const argument of argumentsOfCallsTo(source.source, 'setDDLFromLOV', 1)) {
        if (argument.literal === '') continue;
        const variants =
          argument.literal !== undefined
            ? [argument.literal]
            : argument.prefix !== undefined && argument.suffix !== undefined
              ? // `"CityList." + oProv.formattedValue + ".City[*]"`: one list per child of the keyed list.
                (resolveNode(dom.root, `xfa.datasets.LOVFile.LOV.${argument.prefix.replace(/\.$/, '')}`) as DataNode).children.map((c) => `${argument.prefix}${c.name}${argument.suffix}`)
              : [];
        expect(variants.length, argument.text).toBeGreaterThan(0);
        for (const path of variants) {
          const items = resolveNodes(dom.root, `xfa.datasets.LOVFile.LOV.${path}`);
          expect(items.length, path).toBeGreaterThan(0);
          paths += 1;
        }
      }
    }
    console.log(`${file}: ${widgets} field widgets resolve by class; ${paths} lookup list paths resolve to at least one item`);
    expect(paths).toBeGreaterThan(10);
  });

  it('A2: every one of the 186 manifest references resolves to the data node its container is bound to', () => {
    const { dom } = loaded;
    let refs = 0;
    for (const manifest of manifestsOf(dom)) {
      for (const ref of manifest.refs) {
        const node = resolveNode(dom.root, ref);
        expect(node, ref).toBeInstanceOf(DataNode);
        const container = resolveNode(dom.root, ref.replace(/\.dataNode$/, ''));
        expect(container, ref).toBeInstanceOf(FormNode);
        expect((container as FormNode).dataNode, ref).toBe(node);
        refs += 1;
      }
    }
    expect(refs).toBe(186);
  });

  it('A2: the second exclusion group named Choice resolves to the second data group, not the first', () => {
    const { dom } = loaded;
    const refs = manifestsOf(dom).flatMap((m) => m.refs).filter((r) => r.includes('Choice[1].'));
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      const data = resolveNode(dom.root, ref) as DataNode;
      const first = resolveNode(dom.root, ref.replace('Choice[1].', 'Choice[0].')) as DataNode | null;
      expect(data, ref).not.toBe(first);
      const siblings = must(data.parent).children.filter((c) => c.name === data.name);
      expect(siblings.indexOf(data), ref).toBe(1);
    }
  });

  it('A3: resolveNode(somExpressionOf(n)) is n for every node of the form, the template view and the data DOM', () => {
    const { dom } = loaded;
    let formNodes = 0;
    dom.walk((n) => {
      formNodes += 1;
      expect(resolveNode(dom.root, somExpressionOf(n)), somExpressionOf(n)).toBe(n);
    });
    let templateNodes = 0;
    dom.walk((n) => {
      templateNodes += 1;
      expect(resolveNode(dom.root, somExpressionOf(n)), somExpressionOf(n)).toBe(n);
    }, dom.template);
    let dataNodes = 0;
    const pending: DataNode[] = [dom.datasets];
    for (let n = pending.pop(); n !== undefined; n = pending.pop()) {
      dataNodes += 1;
      expect(resolveNode(dom.root, somExpressionOf(n)), somExpressionOf(n)).toBe(n);
      pending.push(...n.children);
    }
    console.log(`${file}: SOM round trip on ${formNodes} form nodes, ${templateNodes} template-view nodes, ${dataNodes} data nodes`);
    expect(formNodes).toBeGreaterThan(1000);
    expect(templateNodes).toBe(dom.model.nodes.length);
    expect(dataNodes).toBeGreaterThan(9000);
  });

  it('A3: the template rewrite the colour library performs (xfa[0].form[0] -> xfa[0].template[0]) resolves each container to the same template element', () => {
    const { dom } = loaded;
    let rewritten = 0;
    dom.walk((n) => {
      if (n.className !== 'field' && n.className !== 'exclGroup' && n.className !== 'subform' && n.className !== 'draw') return;
      const text = somExpressionOf(n).replace('xfa[0].form[0]', 'xfa[0].template[0]');
      const t = resolveNode(dom.root, text);
      expect(t, text).toBeInstanceOf(FormNode);
      expect((t as FormNode).readOnly, text).toBe(true);
      expect((t as FormNode).template, text).toBe(n.template);
      rewritten += 1;
    });
    expect(rewritten).toBeGreaterThan(400);
  });
});
