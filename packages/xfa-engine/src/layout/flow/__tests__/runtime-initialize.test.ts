import { describe, expect, it } from 'vitest';
import type { FormDom } from '../../../model/form/index.js';
import { layoutAccessOf } from '../../../runtime/layout-access.js';
import type { FormRuntime } from '../../../runtime/options.js';
import { loaded, makeRuntime, onEvent } from '../../../runtime/__tests__/helpers.js';
import { emptyTextContext } from '../../text/__tests__/helpers.js';
import { layoutFlow } from '../layout-flow.js';
import { draw, expectBox, text, textField } from './helpers.js';

/** The form DOM the runtime's scripts wrote to, through the runtime's layout access (W02-T09 retired the old `createFormDom` mock). */
const domOf = (runtime: FormRuntime): FormDom => layoutAccessOf(runtime).dom;

describe('A4: what the form\'s own scripts changed at initialize is what is laid out', () => {
  it('a script that turns multiLine on makes the field wrap and grow: single line before load(), 3 lines after', async () => {
    const field = textField('f', 'w="30pt"', `${text('aaaa bbbb cccc')}${onEvent('initialize', 'this.ui.textEdit.multiLine = 1;')}`);
    const body = `<subform name="s" layout="tb">${field}${draw('after', 'w="5pt" h="5pt"')}</subform>`;
    const runtime = await makeRuntime(body);
    const dom = domOf(runtime);
    const before = layoutFlow(dom, emptyTextContext());
    expectBox(before, 'f', 0, 0, 30, 10);
    expectBox(before, 'after', 0, 10, 5, 5);
    runtime.load();
    const after = layoutFlow(dom, emptyTextContext());
    expectBox(after, 'f', 0, 0, 30, 34);
    expectBox(after, 'after', 0, 34, 5, 5);
    expect(after.texts.find((entry) => entry.box.node.name === 'f')?.value?.lines).toHaveLength(3);
  });

  it('a script that sets h on its container and on a child (as the Office Use Only subform does) moves what follows', async () => {
    const office = `<subform name="Office" layout="position" w="100pt" h="20pt">${onEvent('initialize', "this.h = '60pt'; Inner.h = '30pt';")}${draw('Inner', 'x="2pt" y="3pt" w="50pt" h="10pt"')}</subform>`;
    const runtime = await makeRuntime(`<subform name="s" layout="tb">${office}${draw('below', 'w="5pt" h="5pt"')}</subform>`);
    const dom = domOf(runtime);
    expectBox(layoutFlow(dom, emptyTextContext()), 'below', 0, 20, 5, 5);
    runtime.load();
    const after = layoutFlow(dom, emptyTextContext());
    expectBox(after, 'Office', 0, 0, 100, 60);
    expectBox(after, 'Inner', 2, 3, 50, 30);
    expectBox(after, 'below', 0, 60, 5, 5);
  });

  it('a script that hides a row of a table at initialize gives its room to the rows below', async () => {
    const row = (name: string, extra = ''): string => `<subform name="${name}" layout="row">${draw(`${name}c`, 'w="1pt" h="8pt"')}${extra}</subform>`;
    const hide = onEvent('initialize', "Hidden.presence = 'hidden';");
    const table = `<subform name="t" layout="table" columnWidths="40pt">${row('First')}${row('Hidden')}${row('Last')}${hide}</subform>`;
    const runtime = await loaded(`<subform name="s" layout="tb">${table}</subform>`);
    const dom = domOf(runtime);
    expect(runtime.state).toBe('loaded');
    const layout = layoutFlow(dom, emptyTextContext());
    expectBox(layout, 'Last', 0, 8, 40, 8);
    expectBox(layout, 't', 0, 0, 40, 16);
  });
});
