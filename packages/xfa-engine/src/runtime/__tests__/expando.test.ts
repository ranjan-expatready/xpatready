import { describe, expect, it } from 'vitest';
import { XfaScriptError } from '../../script/index.js';
import { loaded, makeRuntime, onEvent, textField, thrown } from './helpers.js';

const radios = (name: string, handlers: { yes?: string; no?: string } = {}): string =>
  `<exclGroup name="${name}"><field name="Yes"><ui><checkButton/></ui><items><text>Y</text></items>${handlers.yes === undefined ? '' : onEvent('click', handlers.yes)}</field>` +
  `<field name="No"><ui><checkButton/></ui><items><text>N</text></items>${handlers.no === undefined ? '' : onEvent('click', handlers.no)}</field></exclGroup>`;

describe('expando writes on containers (the radio "No" handler and the Clear button of the real forms)', () => {
  it('a subform property write runs in strict mode, reads back inside the script, and is a note - not an unsupported member', async () => {
    const body = `<subform name="Panel">${textField('Out')}</subform>${textField('Btn', onEvent('click', 'Panel.rawValue = "kept"; Panel.ActualNumber = null; Panel.Out.rawValue = String(Panel.rawValue) + "/" + String(Panel.ActualNumber);'))}`;
    const rt = await loaded(body, { options: { strict: true } });
    rt.event('Btn', 'click');
    expect(rt.getValue('Panel.Out')).toBe('kept/null');
    expect(rt.unsupported).toEqual([]);
    expect(rt.notes).toEqual([
      { class: 'subform', member: 'rawValue' },
      { class: 'subform', member: 'ActualNumber' },
    ]);
  });

  it('the same writes outside strict mode are notes as well: the unsupported log stays empty', async () => {
    const body = `<subform name="Panel"/>${textField('Btn', onEvent('click', 'Panel.rawValue = "x";'))}`;
    const rt = await loaded(body, { options: { strict: false } });
    rt.event('Btn', 'click');
    expect(rt.unsupported).toEqual([]);
    expect(rt.notes).toEqual([{ class: 'subform', member: 'rawValue' }]);
  });

  it('a write that names one of the subform\'s own fields (the Clear button assigns AltPhone.ActualNumber) is tolerated, and the field stays reachable by that name', async () => {
    const body = `<subform name="Panel">${textField('Child')}</subform>${textField('Btn', onEvent('click', 'Panel.Child = null; Panel.Child.rawValue = "still-here";'))}`;
    const rt = await loaded(body, { options: { strict: true } });
    rt.event('Btn', 'click');
    expect(rt.getValue('Panel.Child')).toBe('still-here');
    expect(rt.unsupported).toEqual([]);
    expect(rt.notes).toEqual([{ class: 'subform', member: 'Child' }]);
  });

  it('repeating the same write records one note, so a loop cannot flood the recorder', async () => {
    const body = `<subform name="Panel"/>${textField('Btn', onEvent('click', 'for (var i = 0; i < 50; i++) { Panel.rawValue = i; }'))}`;
    const rt = await loaded(body, { options: { strict: true } });
    rt.event('Btn', 'click');
    expect(rt.notes).toEqual([{ class: 'subform', member: 'rawValue' }]);
  });

  it('a radio "No" click that sets subform.rawValue runs strictly, and the radio group takes its value', async () => {
    const body = `<subform name="Section">${radios('Ask', { no: 'Section.rawValue = "no"; ' })}</subform>`;
    const rt = await loaded(body, { options: { strict: true } });
    rt.setValue('Section.Ask', 'N');
    rt.event('Section.Ask.No', 'click');
    expect(rt.getValue('Section.Ask')).toBe('N');
    expect(rt.unsupported).toEqual([]);
    expect(rt.state).toBe('loaded');
  });

  it('an expando is never written to the datasets packet or the form data', async () => {
    const body = `<subform name="Panel">${textField('Out')}</subform>${textField('Btn', onEvent('click', 'Panel.rawValue = "should-not-persist-xyz"; Btn.ghost = "also-not-xyz";'))}`;
    const rt = await loaded(body, { options: { strict: true } });
    const before = rt.saveDatasets();
    rt.event('Btn', 'click');
    expect(rt.saveDatasets()).toBe(before);
    expect(rt.saveDatasets()).not.toContain('xyz');
  });

  it('is per node and per name: another subform does not see it, and an unwritten name is still an unsupported read (strict: fatal)', async () => {
    const body = `<subform name="A"/><subform name="B"/>${textField('Btn', onEvent('click', 'A.rawValue = "a"; this.rawValue = String(B.rawValue);'))}`;
    const rt = await makeRuntime(body, { options: { strict: true } });
    rt.load();
    const error = thrown(() => rt.event('Btn', 'click'));
    expect(error).toBeInstanceOf(XfaScriptError);
    expect(error).toMatchObject({ code: 'UNSUPPORTED_MEMBER', member: 'subform.rawValue' });
  });

  it('keeps refusing the forbidden names: strict mode makes the write fatal, and nothing is stored', async () => {
    for (const name of ['__proto__', 'constructor', 'prototype']) {
      const rt = await makeRuntime(`<subform name="P"/>${textField('Btn', onEvent('click', `P["${name}"] = "x";`))}`, { options: { strict: true } });
      rt.load();
      const error = thrown(() => rt.event('Btn', 'click'));
      expect(error, name).toMatchObject({ code: 'UNSUPPORTED_MEMBER' });
      expect(rt.notes, name).toEqual([]);
    }
  });

  it('a read-only member is still unsupported to write (an expando never shadows a real member)', async () => {
    const rt = await makeRuntime(`<subform name="P"/>${textField('Btn', onEvent('click', 'P.className = "x";'))}`, { options: { strict: true } });
    rt.load();
    expect(thrown(() => rt.event('Btn', 'click'))).toMatchObject({ code: 'UNSUPPORTED_MEMBER', member: 'subform.className' });
  });

  it('too many expandos is a form-size limit that ends the run, like every other model ceiling', async () => {
    const script = 'for (var i = 0; i < 100000; i++) { P["p" + i] = i; }';
    const rt = await makeRuntime(`<subform name="P"/>${textField('Btn', onEvent('click', script))}`, { options: { strict: true } });
    rt.load();
    expect(thrown(() => rt.event('Btn', 'click'))).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'form-size' });
    expect(rt.state).toBe('aborted');
  });
});
