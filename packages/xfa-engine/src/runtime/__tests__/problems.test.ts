import { describe, expect, it } from 'vitest';
import type { FormRuntime } from '../options.js';
import { lib, loaded, makeRuntime, onEvent, textField, variables } from './helpers.js';

const ROOT = 'xfa[0].form[0].form1[0]';
const som = (...path: string[]): string => `${ROOT}.${path.map((p) => (/\[\d+\]$/.test(p) ? p : `${p}[0]`)).join('.')}`;

const required = (name: string, attrs = 'nullTest="error"', message = '', extra = ''): string =>
  `<field name="${name}"><ui><textEdit/></ui><validate ${attrs}>${message === '' ? '' : `<message>${message}</message>`}</validate>${extra}</field>`;
const text = (name: string, content: string): string => `<text name="${name}">${content}</text>`;
const radio = (name: string): string => `<field name="${name}"><ui><checkButton/></ui><items><text>${name}</text></items></field>`;

const somsOf = (rt: FormRuntime): string[] => rt.problems().problems.map((p) => p.som);

describe('E10: problems() lists the fields that fail their declarative validation', () => {
  it('an empty field with nullTest error is a problem; filling it removes it; a field with the test disabled or absent never is', async () => {
    const rt = await loaded([required('a'), required('b', 'nullTest="disabled"'), textField('c')].join(''));
    expect(rt.problems()).toEqual({ problems: [{ som: som('a'), kind: 'nullTest', severity: 'error', message: null, access: 'open' }], truncated: false });
    rt.setValue('a', 'x');
    expect(rt.problems().problems).toEqual([]);
    rt.setValue('a', '');
    expect(somsOf(rt)).toEqual([som('a')]);
  });

  it('warning is reported as a warning; the form\'s own nullTest message is carried, other message names are not', async () => {
    const body = [
      required('w', 'nullTest="warning"', text('nullTest', 'Please say w')),
      required('e', 'nullTest="error"', text('scriptTest', 'a script message') + text('formatTest', 'a format message')),
      required('m', 'nullTest="error"', text('scriptTest', 'x') + text('nullTest', 'Please say m')),
    ].join('');
    const rt = await loaded(body);
    expect(rt.problems().problems).toEqual([
      { som: som('w'), kind: 'nullTest', severity: 'warning', message: 'Please say w', access: 'open' },
      { som: som('e'), kind: 'nullTest', severity: 'error', message: null, access: 'open' },
      { som: som('m'), kind: 'nullTest', severity: 'error', message: 'Please say m', access: 'open' },
    ]);
  });

  it('lists in document order, through nested subforms', async () => {
    const body = [required('z'), `<subform name="s">${required('y')}<subform name="t">${required('x')}</subform></subform>`, required('w')].join('');
    const rt = await loaded(body);
    expect(somsOf(rt)).toEqual([som('z'), som('s', 'y'), som('s', 't', 'x'), som('w')]);
  });

  it('an exclusion group is one problem under its own SOM, and the fields inside it are not listed again', async () => {
    const group = `<exclGroup name="g"><validate nullTest="error"><message>${text('nullTest', 'Pick one')}</message></validate>${radio('yes')}${radio('no')}</exclGroup>`;
    const rt = await loaded(group + required('after'));
    expect(rt.problems().problems).toEqual([
      { som: som('g'), kind: 'nullTest', severity: 'error', message: 'Pick one', access: 'open' },
      { som: som('after'), kind: 'nullTest', severity: 'error', message: null, access: 'open' },
    ]);
    rt.setValue('g', 'yes');
    expect(somsOf(rt)).toEqual([som('after')]);
  });

  it('a button and a barcode hold no entered value, so they are never problems', async () => {
    const body = [
      '<field name="btn"><ui><button/></ui><validate nullTest="error"/></field>',
      '<field name="code"><ui><barcode type="pdf417"/></ui><validate nullTest="error"/></field>',
      required('real'),
    ].join('');
    const rt = await loaded(body);
    expect(somsOf(rt)).toEqual([som('real')]);
  });

  describe('presence (XFA 3.3 presence, screen view): only a visible container under visible ancestors is tested', () => {
    it.each(['hidden', 'invisible', 'inactive'])('a %s field is not a problem', async (presence) => {
      const rt = await loaded(`<field name="p" presence="${presence}"><ui><textEdit/></ui><validate nullTest="error"/></field>${required('v')}`);
      expect(somsOf(rt)).toEqual([som('v')]);
    });

    it.each(['hidden', 'invisible', 'inactive'])('a field under a %s subform is not a problem, however deep', async (presence) => {
      const rt = await loaded(`<subform name="s" presence="${presence}"><subform name="t">${required('deep')}</subform></subform>${required('v')}`);
      expect(somsOf(rt)).toEqual([som('v')]);
    });

    it('a hidden exclusion group is not a problem', async () => {
      const rt = await loaded(`<exclGroup name="g" presence="hidden"><validate nullTest="error"/>${radio('a')}</exclGroup>${required('v')}`);
      expect(somsOf(rt)).toEqual([som('v')]);
    });

    it('a print-only container (relevant="print") is hidden on screen, so it is not a problem; relevant="-print" changes nothing', async () => {
      const body = `<field name="po" relevant="print"><ui><textEdit/></ui><validate nullTest="error"/></field>${required('np').replace('<field name="np"', '<field name="np" relevant="-print"')}`;
      const rt = await loaded(body);
      expect(somsOf(rt)).toEqual([som('np')]);
    });

    it('follows what scripts did: a field a script hid drops out, one a script showed comes in, and a null test a script switched on counts', async () => {
      const body = [
        required('hideMe'),
        `<field name="showMe" presence="hidden"><ui><textEdit/></ui><validate nullTest="error"/></field>`,
        textField('late', '<validate nullTest="disabled"/>'),
        textField('go', onEvent('click', 'hideMe.presence = "hidden"; showMe.presence = "visible"; late.mandatory = "error";')),
      ].join('');
      const rt = await loaded(body);
      expect(somsOf(rt)).toEqual([som('hideMe')]);
      rt.event('go', 'click');
      expect(somsOf(rt)).toEqual([som('showMe'), som('late')]);
    });
  });

  describe('formatTest: a non-empty value that does not fit the validate picture', () => {
    const dated = (attrs: string): string =>
      `<field name="d"><ui><textEdit/></ui><validate ${attrs}><picture>date{YYYY-MM-DD}</picture><message>${text('formatTest', 'Use YYYY-MM-DD')}</message></validate></field>`;

    it('a value that fits passes, one that does not is a formatTest problem with its own message, an empty one is not a format problem', async () => {
      const rt = await loaded(dated('formatTest="error"'));
      expect(rt.problems().problems).toEqual([]);
      rt.setValue('d', '2026-05-17');
      expect(rt.problems().problems).toEqual([]);
      rt.setValue('d', 'next week');
      expect(rt.problems().problems).toEqual([{ som: som('d'), kind: 'formatTest', severity: 'error', message: 'Use YYYY-MM-DD', access: 'open' }]);
    });

    it('the default setting is warning, and disabled reports nothing', async () => {
      const rt = await loaded(dated(''));
      rt.setValue('d', 'next week');
      expect(rt.problems().problems).toMatchObject([{ kind: 'formatTest', severity: 'warning' }]);
      const off = await loaded(dated('formatTest="disabled"'));
      off.setValue('d', 'next week');
      expect(off.problems().problems).toEqual([]);
    });

    it('without a validate picture there is nothing to test, whatever is typed', async () => {
      const rt = await loaded(required('plain', 'formatTest="error"'));
      rt.setValue('plain', 'anything at all');
      expect(rt.problems().problems).toEqual([]);
    });

    it('an empty field with both tests on is one nullTest problem, not two', async () => {
      const rt = await loaded(dated('nullTest="error" formatTest="error"'));
      expect(rt.problems().problems).toMatchObject([{ kind: 'nullTest' }]);
    });
  });

  it.each(['readOnly', 'protected', 'nonInteractive'])('an empty mandatory %s field stays in the list with its access, so the viewer can decide; a script that changes the access is followed', async (access) => {
    const body = [
      `<field name="locked" access="${access}"><ui><textEdit/></ui><validate nullTest="error"/></field>`,
      required('open'),
      textField('go', onEvent('click', 'locked.access = "open";')),
    ].join('');
    const rt = await loaded(body);
    expect(rt.problems().problems).toMatchObject([
      { som: som('locked'), access },
      { som: som('open'), access: 'open' },
    ]);
    rt.event('go', 'click');
    expect(rt.problems().problems[0]).toMatchObject({ som: som('locked'), access: 'open' });
  });

  describe('instances a script removes and adds back (the template gate refuses `occur` over one, so a script is the only way instances change)', () => {
    const body = [
      variables(lib('holder', 'var kept = null;')),
      `<subform name="row">${required('cell')}</subform>`,
      textField('drop', onEvent('click', 'holder.kept = row; xfa.form.form1.nodes.remove(row);')),
      textField('back', onEvent('click', 'xfa.form.form1.nodes.append(holder.kept);')),
    ].join('');

    it('removing the subform takes its mandatory empty field out of the list; appending it back puts it in again', async () => {
      const rt = await loaded(body);
      expect(somsOf(rt)).toEqual([som('row', 'cell')]);
      rt.event('drop', 'click');
      expect(somsOf(rt)).toEqual([]);
      rt.event('back', 'click');
      expect(somsOf(rt)).toEqual([som('row', 'cell')]);
    });
  });

  it('scriptTest is not evaluated: a validate script never runs (no box, no focus, no write), and a failing script is not a problem', async () => {
    const script = '<script contentType="application/x-javascript">xfa.host.messageBox("ran"); xfa.host.setFocus(this); other.rawValue = "touched"; false;</script>';
    const body = `<field name="s"><ui><textEdit/></ui><validate scriptTest="error">${script}</validate></field>${textField('other')}`;
    const rt = await loaded(body);
    rt.setValue('s', 'value');
    expect(rt.problems().problems).toEqual([]);
    expect(rt.messages).toEqual([]);
    expect(rt.focus).toEqual([]);
    expect(rt.getValue('other')).toBeNull();
  });

  it('reads and records nothing: the data, the layout, the messages and the scripts run are unchanged by any number of calls', async () => {
    const rt = await loaded([required('a'), required('b'), textField('c')].join(''));
    const data = rt.saveDatasets();
    const tree = rt.layout();
    const { runs, bridgeCalls } = rt.usage;
    const first = rt.problems();
    const second = rt.problems();
    expect(second).toEqual(first);
    expect(rt.saveDatasets()).toBe(data);
    expect(rt.layout()).toBe(tree);
    expect([rt.usage.runs, rt.usage.bridgeCalls]).toEqual([runs, bridgeCalls]);
    expect([rt.messages, rt.focus, rt.requests, rt.console, rt.unsupported]).toEqual([[], [], [], [], []]);
    expect(rt.state).toBe('loaded');
  });

  it('needs a loaded run', async () => {
    const rt = await makeRuntime(required('a'));
    expect(() => rt.problems()).toThrowError(/load\(\) first/);
  });
});
