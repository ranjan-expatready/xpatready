import { describe, expect, it } from 'vitest';
import { XfaRuntimeError } from '../errors.js';
import type { PackFormDescriptor } from '../pack.js';
import { loaded, makeRuntime, onEvent, textField, thrown, variables } from './helpers.js';

/** A miniature of the real forms' shape: a Validate button, a text variable that holds the first missing field and is cleared at the end, a validated flag, and barcode fields filled on preSave. */
const MINI = [
  variables('<text name="firstVar"/>'),
  onEvent('preSave', 'if (flag.rawValue == "Yes") { Barcodes.bc1.rawValue = "A|" + Header.person.rawValue + "|"; Barcodes.bc2.rawValue = "D" + new Date().getDate() + "|"; }'),
  `<subform name="Header">${textField('person')}${textField('city')}</subform>`,
  textField('flag'),
  textField(
    'btn',
    onEvent(
      'click',
      `firstVar.value = "";
       if (Header.person.isNull) { firstVar.value = Header.person.somExpression; xfa.host.setFocus(Header.person); xfa.host.messageBox("Person is required", "Validation Error", 0, 0); }
       if (firstVar.value == "" && Header.city.isNull) { firstVar.value = Header.city.somExpression; xfa.host.setFocus(Header.city); xfa.host.messageBox("City is required", "Validation Error", 0, 0); }
       flag.rawValue = firstVar.value == "" ? "Yes" : "No";
       Barcodes.presence = firstVar.value == "" ? "visible" : "hidden";
       if (firstVar.value == "") { xfa.host.messageBox("Form complete", "", 3, 0); xfa.host.setFocus(Header.city); }
       firstVar.value = "";`,
    ),
  ),
  textField('stamp', onEvent('preSave', 'stamp.rawValue = "saved";')),
  `<subform name="Barcodes" presence="hidden">${textField('bc1')}${textField('bc2')}</subform>`,
].join('');

const PACK: PackFormDescriptor = { validateButton: 'btn', validatedFlag: 'flag', validatedValue: 'Yes', firstMissingField: 'firstVar', barcodes: 'Barcodes' };
const som = (path: string): string => `xfa[0].form[0].form1[0].${path}`;

describe('validate: the form\'s own Validate button run from a pack descriptor', () => {
  it('an incomplete form reports incomplete, the flag the form set, the first missing field the form stored (it clears it itself afterwards), its message and its focus', async () => {
    const rt = await loaded(MINI);
    const result = rt.validate(PACK);
    expect(result.complete).toBe(false);
    expect(result.flag).toBe('No');
    expect(result.firstMissingField).toBe(som('Header[0].person[0]'));
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({ text: 'Person is required', title: 'Validation Error', event: 'click', nodeSom: som('btn[0]') });
    expect(result.focus).toEqual([som('Header[0].person[0]')]);
    expect(result.barcodesPresence).toBe('hidden');
    expect(result.scriptsRun).toBe(1);
    expect(rt.getValue('firstVar')).toBe('');
  });

  it('the first missing field is the first the form found, not the last: later missing fields do not replace it', async () => {
    const rt = await loaded(MINI);
    expect(rt.validate(PACK).firstMissingField).toBe(som('Header[0].person[0]'));
    rt.setValue('Header.person', 'Test');
    const second = rt.validate(PACK);
    expect(second.firstMissingField).toBe(som('Header[0].city[0]'));
  });

  it('a complete form reports complete, no missing field, the completion message and the focus the form recorded, and the barcodes shown', async () => {
    const rt = await loaded(MINI);
    rt.setValue('Header.person', 'Test');
    rt.setValue('Header.city', 'Sample');
    const result = rt.validate(PACK);
    expect(result).toMatchObject({ complete: true, flag: 'Yes', firstMissingField: null, barcodesPresence: 'visible' });
    expect(result.messages.map((m) => m.text)).toEqual(['Form complete']);
    expect(result.focus).toEqual([som('Header[0].city[0]')]);
  });

  it('each result holds only what its own click recorded, while the runtime lists keep everything', async () => {
    const rt = await loaded(MINI);
    rt.validate(PACK);
    rt.setValue('Header.person', 'Test');
    const second = rt.validate(PACK);
    expect(second.messages.map((m) => m.text)).toEqual(['City is required']);
    expect(rt.messages.map((m) => m.text)).toEqual(['Person is required', 'City is required']);
  });

  it('the invariant complete => firstMissingField is null holds even for a form that contradicts itself: the result stays complete, the field is dropped and a note says so', async () => {
    const odd = `${variables('<text name="firstVar"/>')}${textField('flag')}${textField('btn', onEvent('click', 'firstVar.value = "somewhere"; flag.rawValue = "Yes";'))}<subform name="Barcodes"/>`;
    const rt = await loaded(odd);
    const result = rt.validate(PACK);
    expect(result).toMatchObject({ complete: true, firstMissingField: null });
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]).toContain('somewhere');
  });

  it('a well-behaved form has no notes', async () => {
    const rt = await loaded(MINI);
    expect(rt.validate(PACK).notes).toEqual([]);
  });

  it('the descriptor is data checked at the boundary: a missing, extra or empty key is INVALID_ARGUMENT and a SOM that names nothing is NODE_NOT_FOUND', async () => {
    const rt = await loaded(MINI);
    const { barcodes: _barcodes, ...missing } = PACK;
    for (const bad of [missing, { ...PACK, extra: 1 }, { ...PACK, validateButton: '' }, { ...PACK, validatedValue: '' }, null, 'btn']) {
      expect((thrown(() => rt.validate(bad as never)) as XfaRuntimeError).code).toBe('INVALID_ARGUMENT');
    }
    for (const key of ['validateButton', 'validatedFlag', 'firstMissingField', 'barcodes'] as const) {
      expect((thrown(() => rt.validate({ ...PACK, [key]: 'nowhere' })) as XfaRuntimeError).code, key).toBe('NODE_NOT_FOUND');
    }
    expect(rt.state).toBe('loaded');
  });

  it('before load() it is NOT_LOADED, and a failure in the form\'s own script aborts the run like any event', async () => {
    const early = await makeRuntime(MINI);
    expect((thrown(() => early.validate(PACK)) as XfaRuntimeError).code).toBe('NOT_LOADED');
    const broken = await loaded(`${variables('<text name="firstVar"/>')}${textField('flag')}${textField('btn', onEvent('click', 'throw new Error("boom");'))}<subform name="Barcodes"/>`);
    expect(thrown(() => broken.validate(PACK))).toBeDefined();
    expect(broken.state).toBe('aborted');
  });
});

describe('encodeBarcodes: the form\'s own preSave handling, then the barcode fields', () => {
  it('after a complete Validate, preSave fills the barcode fields in document order and they are returned', async () => {
    const rt = await loaded(MINI);
    rt.setValue('Header.person', 'Test');
    rt.setValue('Header.city', 'Sample');
    rt.validate(PACK);
    const encoded = rt.encodeBarcodes(PACK);
    expect(encoded.validated).toBe(true);
    expect(encoded.payloads).toEqual(['A|Test|', 'D15|']);
    expect(rt.getValue('Barcodes.bc1')).toBe('A|Test|');
  });

  it('a form that was not validated encodes nothing: the payloads are null and validated is false (the form decides, not the engine)', async () => {
    const rt = await loaded(MINI);
    rt.validate(PACK);
    const encoded = rt.encodeBarcodes(PACK);
    expect(encoded.validated).toBe(false);
    expect(encoded.payloads).toEqual([null, null]);
  });

  it('preSave reaches every handler in the form, not only the root\'s (the host broadcasts it)', async () => {
    const rt = await loaded(MINI);
    rt.encodeBarcodes(PACK);
    expect(rt.getValue('stamp')).toBe('saved');
  });
});

describe('broadcast and children, the two small queries the descriptor-driven calls are built on', () => {
  it('broadcast runs every node\'s handlers for the activity in document order and returns how many ran', async () => {
    const rt = await loaded(`${textField('log')}${textField('a', onEvent('preSave', 'log.rawValue = (log.rawValue || "") + "a";'))}<subform name="s">${textField('b', onEvent('preSave', 'log.rawValue = log.rawValue + "b";'))}</subform>`);
    expect(rt.broadcast('preSave').scriptsRun).toBe(2);
    expect(rt.getValue('log')).toBe('ab');
    expect(rt.broadcast('docClose').scriptsRun).toBe(0);
    expect((thrown(() => rt.broadcast('bogus')) as XfaRuntimeError).code).toBe('INVALID_ARGUMENT');
  });

  it('children lists the canonical SOM of a node\'s children in order, optionally only one class', async () => {
    const rt = await loaded(MINI);
    expect(rt.children('Barcodes', 'field')).toEqual([som('Barcodes[0].bc1[0]'), som('Barcodes[0].bc2[0]')]);
    expect(rt.children('Header')).toEqual([som('Header[0].person[0]'), som('Header[0].city[0]')]);
    expect(rt.children('Header', 'subform')).toEqual([]);
    expect((thrown(() => rt.children('nowhere')) as XfaRuntimeError).code).toBe('NODE_NOT_FOUND');
  });
});

describe('saveDatasets: the datasets packet as XML text, for readers that must not trust the form model', () => {
  it('holds the data the run produced (a typed value, a value a script wrote) and re-parses', async () => {
    const rt = await loaded(MINI);
    rt.setValue('Header.person', 'Test');
    rt.setValue('Header.city', 'Sample');
    rt.validate(PACK);
    rt.encodeBarcodes(PACK);
    const xml = rt.saveDatasets();
    expect(xml).toContain('<person>Test</person>');
    expect(xml).toContain('<bc1>A|Test|</bc1>');
    expect(xml).toContain('<flag>Yes</flag>');
    expect(xml.startsWith('<')).toBe(true);
  });

  it('is NOT_LOADED before load()', async () => {
    const early = await makeRuntime(MINI);
    expect((thrown(() => early.saveDatasets()) as XfaRuntimeError).code).toBe('NOT_LOADED');
  });
});
