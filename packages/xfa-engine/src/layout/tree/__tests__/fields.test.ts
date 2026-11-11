import { describe, expect, it } from 'vitest';
import { loaded } from '../../../runtime/__tests__/helpers.js';
import { MAX_FIELD_ITEMS, MAX_TEXT_CHARS } from '../../limits.js';
import { MAX_SOM_CHARS } from '../../../model/som/index.js';
import { renderTreeSchema, type RenderItem, type RenderTree } from '../../render-tree.js';

/** The `field` items of the tree (W02-T12), from small synthetic forms. */
type FieldItem = Extract<RenderItem, { kind: 'field' }>;
const fieldsOf = (tree: RenderTree): FieldItem[] => tree.pages.flatMap((page) => page.items.flatMap((item) => (item.kind === 'field' ? [item] : [])));
const byName = (tree: RenderTree, name: string): FieldItem => {
  const found = fieldsOf(tree).find((item) => item.som.endsWith(`.${name}[0]`));
  if (found === undefined) throw new Error(`no field item for ${name}`);
  return found;
};
async function treeOf(body: string, extra: Parameters<typeof loaded>[1] = {}): Promise<RenderTree> {
  const runtime = await loaded(body, { rootAttrs: 'layout="tb"', ...extra });
  return renderTreeSchema.parse(runtime.layout());
}
const field = (name: string, ui: string, inner = '', size = 'w="100pt" h="20pt"'): string => `<field name="${name}" ${size}><ui>${ui}</ui>${inner}</field>`;

describe('field items: the interactive overlay of a drawn field', () => {
  it('only a drawn field has one: hidden and invisible fields and the fields inside them have none', async () => {
    const tree = await treeOf(
      field('shown', '<textEdit/>') +
        field('gone', '<textEdit/>', '', 'w="10pt" h="10pt" presence="hidden"') +
        field('ghost', '<textEdit/>', '', 'w="10pt" h="10pt" presence="invisible"') +
        `<subform name="away" presence="hidden" layout="tb">${field('inner', '<textEdit/>')}</subform>`,
    );
    expect(fieldsOf(tree).map((item) => item.som.split('.').pop())).toEqual(['shown[0]']);
  });

  it('the SOM is the canonical one a caller sends back, and the raw value is stored value, not the display text', async () => {
    const runtime = await loaded(field('a', '<textEdit/>') + field('d', '<dateTimeEdit/>', '<value><date/></value><format><picture>date{DD/MM/YYYY}</picture></format>'), { rootAttrs: 'layout="tb"', data: '<form1><d>2026-06-15</d></form1>' });
    const tree = renderTreeSchema.parse(runtime.layout());
    for (const item of fieldsOf(tree)) expect(() => runtime.getValue(item.som)).not.toThrow();
    expect(byName(tree, 'd').value).toBe('2026-06-15');
    const shown = tree.pages.flatMap((page) => page.items).flatMap((item) => (item.kind === 'text' ? item.lines.flatMap((line) => line.runs.map((run) => run.text)) : []));
    expect(shown).toContain('15/06/2026');
  });

  it('the accessible name is the caption text, else assist/speak, else assist/toolTip, else none', async () => {
    const caption = '<caption placement="left" reserve="30pt"><value><text>Given   name</text></value></caption>';
    const tree = await treeOf(
      field('c', '<textEdit/>', `${caption}<assist><speak>spoken</speak></assist>`) +
        field('s', '<textEdit/>', '<assist><speak>spoken</speak><toolTip>tip</toolTip></assist>') +
        field('t', '<textEdit/>', '<assist><toolTip>tip</toolTip></assist>') +
        field('n', '<textEdit/>'),
    );
    expect(byName(tree, 'c').ariaLabel).toBe('Given name');
    expect(byName(tree, 's').ariaLabel).toBe('spoken');
    expect(byName(tree, 't').ariaLabel).toBe('tip');
    expect(byName(tree, 'n').ariaLabel).toBeUndefined();
  });

  it('maxChars and multiLine are read from the template; 0 means no limit and a malformed number is reported and ignored', async () => {
    const tree = await treeOf(
      field('limited', '<textEdit/>', '<value><text maxChars="12"/></value>') +
        field('zero', '<textEdit/>', '<value><text maxChars="0"/></value>') +
        field('bad', '<textEdit/>', '<value><text maxChars="lots"/></value>') +
        field('multi', '<textEdit multiLine="1"/>') +
        field('num', '<numericEdit/>'),
    );
    expect(byName(tree, 'limited').maxChars).toBe(12);
    expect(byName(tree, 'zero').maxChars).toBeUndefined();
    expect(byName(tree, 'bad').maxChars).toBeUndefined();
    expect(tree.issues.map((issue) => issue.feature)).toContain('maxChars is not a whole number (no limit applied)');
    expect(byName(tree, 'multi').multiLine).toBe(true);
    expect(byName(tree, 'limited').multiLine).toBe(false);
    expect(byName(tree, 'num').multiLine).toBeUndefined();
  });

  it('access is the field\'s own', async () => {
    const tree = await treeOf(['readOnly', 'protected', 'nonInteractive', 'open'].map((access) => field(access, '<textEdit/>', '', `w="50pt" h="10pt" access="${access}"`)).join(''));
    expect(['readOnly', 'protected', 'nonInteractive', 'open'].map((name) => byName(tree, name).access)).toEqual(['readOnly', 'protected', 'nonInteractive', 'open']);
  });

  it('a choice list carries its display and save lists together', async () => {
    const lov = '<LOV><P code="a">Alpha</P><P code="b">Beta</P></LOV>';
    const bound = field('bound', '<choiceList/>', '<items/><items presence="hidden" save="1"/><bindItems ref="xfa.datasets.LOV.P[*]" labelRef="$" valueRef="code"/>');
    const written = field('written', '<choiceList/>', '<items><text>One</text><text>Two</text></items><items save="1" presence="hidden"><text>1</text><text>2</text></items>');
    const single = field('single', '<choiceList/>', '<items><text>x</text><text>y</text></items>');
    const tree = await treeOf(bound + written + single, { lov, data: '<form1><bound>b</bound></form1>' });
    expect(byName(tree, 'bound')).toMatchObject({ value: 'b', items: [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }] });
    expect(byName(tree, 'written').items).toEqual([{ value: '1', label: 'One' }, { value: '2', label: 'Two' }]);
    expect(byName(tree, 'single').items).toEqual([{ value: 'x', label: 'x' }, { value: 'y', label: 'y' }]);
    expect(byName(tree, 'single').contentRect).toEqual(byName(tree, 'single').rect);
  });

  it('a list over the item ceiling is cut, with an issue, and the tree still parses', async () => {
    const lov = `<LOV>${Array.from({ length: MAX_FIELD_ITEMS + 3 }, (_, i) => `<P>i${i}</P>`).join('')}</LOV>`;
    const tree = await treeOf(field('big', '<choiceList/>', '<items/><items presence="hidden" save="1"/><bindItems ref="xfa.datasets.LOV.P[*]" labelRef="$" valueRef="$"/>'), { lov });
    expect(byName(tree, 'big').items).toHaveLength(MAX_FIELD_ITEMS);
    expect(tree.issues.map((issue) => issue.feature)).toContain(`choice list has more than ${MAX_FIELD_ITEMS} items (cut)`);
  });

  it('a value longer than a text of the tree may be is cut, with an issue', async () => {
    const long = 'x'.repeat(MAX_TEXT_CHARS + 5);
    const tree = await treeOf(field('long', '<textEdit/>'), { data: `<form1><long>${long}</long></form1>` });
    expect(byName(tree, 'long').value).toHaveLength(MAX_TEXT_CHARS);
    expect(tree.issues.map((issue) => issue.feature)).toContain(`field value longer than ${MAX_TEXT_CHARS} characters (cut)`);
  });

  it('a check box and a radio button say whether they hold their on value and which mark they show; the control sits on the check square', async () => {
    const check = (name: string, mark: string, shape = 'square'): string => field(name, `<checkButton shape="${shape}" mark="${mark}" size="10pt"/>`, '<items><text>Y</text><text>N</text></items>', 'w="60pt" h="14pt"');
    const radios = `<exclGroup name="g" w="100pt" h="20pt"><field name="r1" x="0pt" y="0pt" w="12pt" h="12pt"><ui><checkButton shape="round"/></ui><items><text>A</text></items></field><field name="r2" x="30pt" y="0pt" w="12pt" h="12pt"><ui><checkButton shape="round"/></ui><items><text>B</text></items></field></exclGroup>`;
    const tree = await treeOf(check('on', 'cross') + check('off', 'star') + radios, { data: '<form1><on>Y</on><g>B</g></form1>' });
    expect(byName(tree, 'on')).toMatchObject({ widget: 'checkButton', value: 'Y', checked: true, mark: 'cross', contentRect: { widthPt: 10, heightPt: 10 } });
    expect(byName(tree, 'off')).toMatchObject({ checked: false, mark: 'star', value: '' });
    expect(byName(tree, 'r1')).toMatchObject({ checked: false, mark: 'circle' });
    expect(byName(tree, 'r2')).toMatchObject({ checked: true, mark: 'circle', value: 'B' });
    // The square lies inside the field's rectangle.
    const on = byName(tree, 'on');
    expect(on.contentRect.xPt).toBeGreaterThanOrEqual(on.rect.xPt);
    expect(on.contentRect.xPt + on.contentRect.widthPt).toBeLessThanOrEqual(on.rect.xPt + on.rect.widthPt);
  });

  it('every widget class of the template reaches the tree as itself, and a field with no ui is the default ui', async () => {
    const widgets = ['textEdit', 'numericEdit', 'passwordEdit', 'choiceList', 'checkButton', 'dateTimeEdit', 'button', 'barcode', 'signature', 'imageEdit'];
    const ui = (name: string): string => (name === 'barcode' ? '<barcode type="pdf417"/>' : `<${name}/>`);
    const tree = await treeOf(widgets.map((name) => field(name, ui(name))).join('') + `<field name="bare" w="50pt" h="10pt"/>`);
    expect(widgets.map((name) => byName(tree, name).widget)).toEqual(widgets);
    expect(byName(tree, 'bare').widget).toBe('defaultUi');
  });
});

describe('field items: a field whose SOM expression is over the ceiling', () => {
  it('keeps its overlay under a fallback name and reports that the runtime cannot address it', async () => {
    const name = 'n'.repeat(250);
    // Each level adds the name and `[0].`; enough levels to pass MAX_SOM_CHARS.
    const depth = Math.ceil(MAX_SOM_CHARS / (name.length + 4)) + 1;
    let body = field('deep', '<textEdit/>');
    for (let level = 0; level < depth; level += 1) body = `<subform name="${name}" layout="tb">${body}</subform>`;
    const tree = await treeOf(body);
    expect(fieldsOf(tree)).toHaveLength(1);
    expect(tree.issues.filter((issue) => issue.feature.startsWith('SOM expression not available'))).toHaveLength(1);
  });
});
