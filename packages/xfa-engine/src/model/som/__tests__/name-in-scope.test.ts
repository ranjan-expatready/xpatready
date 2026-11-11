import { describe, expect, it } from 'vitest';
import { XfaPdfError } from '../../../pdf/errors.js';
import { XfaFormError, type DomNode, type FormDom, type FormNode } from '../../form/index.js';
import { build, textField } from '../../form/__tests__/helpers.js';
import { isNameInScope, resolveNode } from '../index.js';

/** What `isNameInScope` replaces: resolve the bare name from the scope, and count a refusal as "no node". */
function resolves(scope: DomNode, name: string): boolean {
  try {
    return resolveNode(scope, name) !== null;
  } catch (error) {
    if (error instanceof XfaPdfError || error instanceof XfaFormError) return false;
    throw error;
  }
}

const BODY =
  '<variables><text name="rootVar"/><text/></variables>' +
  `<subform name="A">${textField('X')}<field/><draw/><variables><text name="Av"/><text/></variables><subform name="Inner">${textField('Y')}<ui/></subform></subform>` +
  `<subform name="B">${textField('X')}<subform/></subform>`;

const NAMES = [
  'form1', 'A', 'B', 'X', 'Y', 'Inner', 'field', 'draw', 'ui', 'caption', 'subform', 'variables', 'text', 'rootVar', 'Av', 'Nope', 'nope',
  'xfa', 'form', 'template', 'data', 'datasets', 'dataNode', '$', '$record', 'a$b', 'x$', 'é', 'Éa', '日本', '_', '_a', 'a1', 'a-b', 'x'.repeat(256), 'x'.repeat(257),
];

function everyScope(dom: FormDom): DomNode[] {
  const scopes: DomNode[] = [dom.form, dom.root, dom.template, dom.data, dom.datasets];
  dom.walk((node) => {
    scopes.push(node);
    if ('nodes' in node) scopes.push(node.nodes);
  });
  return scopes;
}

describe('isNameInScope: the same answer as resolving the bare name, without building the nodes it finds', () => {
  const { dom } = build(BODY, '<form1><A><X/><Y/></A><B/></form1>');

  it('agrees with resolveNode for every name, from every node, list and model of the form', () => {
    const scopes = everyScope(dom);
    expect(scopes.length).toBeGreaterThan(20);
    for (const scope of scopes) for (const name of NAMES) expect(isNameInScope(scope, name), `${scope.className}:${scope.name} / ${name}`).toBe(resolves(scope, name));
  });

  it('finds an unnamed node by its class, a variables member by its name, and a name that only an outer scope has', () => {
    const inner = innerOf(dom);
    expect(isNameInScope(inner, 'ui')).toBe(true);
    expect(isNameInScope(find(dom.root, 'A'), 'Av')).toBe(true);
    expect(isNameInScope(inner, 'Av')).toBe(true);
    expect(isNameInScope(inner, 'rootVar')).toBe(true);
    expect(isNameInScope(find(dom.root, 'B'), 'Av')).toBe(false);
  });

  it('refuses what the SOM grammar cannot spell (`$`, `-`, over-long names) and the model root `xfa`, as resolving does', () => {
    for (const name of ['$record', 'a$b', 'a-b', 'x'.repeat(257), 'xfa', '']) expect(isNameInScope(dom.root, name), name).toBe(false);
  });
});

describe('isNameInScope follows the form as it changes, after the answer has been cached', () => {
  const agree = (scope: DomNode, name: string): boolean => {
    const answer = isNameInScope(scope, name);
    expect(answer).toBe(resolves(scope, name));
    return answer;
  };

  it('a node appended to a scope is found, and no longer once it is removed', () => {
    const { dom } = build(BODY);
    const late = dom.createNode('field', 'Late');
    expect(agree(dom.root, 'Late')).toBe(false);
    dom.root.appendNode(late);
    expect(agree(dom.root, 'Late')).toBe(true);
    dom.root.removeNode(late);
    expect(agree(dom.root, 'Late')).toBe(false);
  });

  it('a node moved to another scope leaves the first and arrives in the second', () => {
    const { dom } = build(BODY);
    const a = find(dom.root, 'A');
    const b = find(dom.root, 'B');
    const moved = dom.createNode('field', 'Moved');
    a.appendNode(moved);
    expect(agree(a, 'Moved')).toBe(true);
    expect(agree(b, 'Moved')).toBe(false);
    b.appendNode(moved);
    expect(agree(a, 'Moved')).toBe(false);
    expect(agree(b, 'Moved')).toBe(true);
  });

  it('nodes removed in bulk are gone from the answer', () => {
    const { dom } = build(BODY);
    expect(agree(dom.root, 'A')).toBe(true);
    dom.root.removeNodesWhere((c) => c.name === 'A');
    expect(agree(dom.root, 'A')).toBe(false);
    expect(agree(find(dom.root, 'B'), 'A')).toBe(false);
  });

  it('a member added to, or removed from, a variables block is found, or not, from the block\'s owner', () => {
    const { dom } = build(BODY);
    const block = dom.createNode('variables');
    const member = dom.createNode('text', 'Mem');
    dom.root.appendNode(block);
    expect(agree(dom.root, 'Mem')).toBe(false);
    block.appendNode(member);
    expect(agree(dom.root, 'Mem')).toBe(true);
    expect(agree(innerOf(dom), 'Mem')).toBe(true);
    block.removeNode(member);
    expect(agree(dom.root, 'Mem')).toBe(false);
  });

  it('a variables block carries its members with it when it is moved to another scope or removed', () => {
    const { dom } = build(BODY);
    const a = find(dom.root, 'A');
    const block = dom.createNode('variables');
    block.appendNode(dom.createNode('text', 'Mem'));
    dom.root.appendNode(block);
    expect(agree(dom.root, 'Mem')).toBe(true);
    a.appendNode(block);
    expect(agree(dom.root, 'Mem')).toBe(false);
    expect(agree(a, 'Mem')).toBe(true);
    a.removeNode(block);
    expect(agree(a, 'Mem')).toBe(false);
  });

  it('a default property listed by the first write to it is found afterwards', () => {
    const { dom } = build(textField('F'));
    const field = find(dom.root, 'F');
    expect(agree(field, 'caption')).toBe(false);
    field.mandatoryMessage = 'required';
    expect(agree(field, 'validate')).toBe(true);
  });
});

const innerOf = (dom: FormDom): FormNode => find(find(dom.root, 'A'), 'Inner');

function find(from: FormNode, name: string): FormNode {
  const found = from.children.find((c) => c.name === name);
  if (found === undefined) throw new Error(`no child "${name}"`);
  return found;
}
