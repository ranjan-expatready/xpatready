import { describe, expect, it } from 'vitest';
import { XfaRuntimeError } from '../errors.js';
import type { PackFormDescriptor } from '../pack.js';
import { packFormDescriptorSchema, parsePackDescriptor } from '../pack.js';
import { loaded, makeRuntime, onEvent, textField, thrown } from './helpers.js';

const BASE = { validateButton: 'btn', validatedFlag: 'flag', validatedValue: 'Yes', firstMissingField: 'fm', barcodes: 'bcs' } as const;
const pack = (clearButton?: string): PackFormDescriptor => ({ ...BASE, ...(clearButton === undefined ? {} : { clearButton }) });

const button = (name: string, extra = ''): string => `<field name="${name}"><ui><button/></ui>${extra}</field>`;
const BODY = [
  textField('plain'),
  button('erase', onEvent('click', 'plain.rawValue = null;')),
  `<subform name="bar">${button('inner')}<draw name="label"><value><text>x</text></value></draw></subform>`,
  `<exclGroup name="grp"><field name="a"><ui><checkButton/></ui><items><text>A</text></items></field></exclGroup>`,
].join('');

describe('E9: the pack descriptor names the form\'s clear button (optional, content-neutral)', () => {
  describe('the descriptor schema', () => {
    it('accepts a descriptor without the field (every existing pack) and with it', () => {
      expect(parsePackDescriptor(BASE)).toEqual(BASE);
      expect(parsePackDescriptor({ ...BASE, clearButton: 'bar.inner' })).toEqual({ ...BASE, clearButton: 'bar.inner' });
    });

    it('stays strict: an empty name, a non-string, an over-long name and an unknown key are refused as before', () => {
      for (const bad of [{ clearButton: '' }, { clearButton: 7 }, { clearButton: 'x'.repeat(16 * 1024 + 1) }, { clearButtn: 'x' }]) {
        expect(packFormDescriptorSchema.safeParse({ ...BASE, ...bad }).success).toBe(false);
        expect(thrown(() => parsePackDescriptor({ ...BASE, ...bad }))).toMatchObject({ code: 'INVALID_ARGUMENT' });
      }
    });
  });

  describe('clearButton(pack): checked against the opened form, as data', () => {
    it('absent: a descriptor without the field answers absent', async () => {
      const rt = await loaded(BODY);
      expect(rt.clearButton(pack())).toEqual({ status: 'absent' });
    });

    it('found: a button field answers its canonical SOM, whether the pack writes it short, with indexes, or as a nested path', async () => {
      const rt = await loaded(BODY);
      expect(rt.clearButton(pack('erase'))).toEqual({ status: 'found', som: 'xfa[0].form[0].form1[0].erase[0]' });
      expect(rt.clearButton(pack('erase[0]'))).toEqual({ status: 'found', som: 'xfa[0].form[0].form1[0].erase[0]' });
      expect(rt.clearButton(pack('bar.inner'))).toEqual({ status: 'found', som: 'xfa[0].form[0].form1[0].bar[0].inner[0]' });
    });

    it('unknown SOM: a name the form does not have is a typed issue, not a throw, and the run lives on', async () => {
      const rt = await loaded(BODY);
      const report = rt.clearButton(pack('nothing.here'));
      expect(report).toMatchObject({ status: 'issue', code: 'CLEAR_BUTTON_UNRESOLVED' });
      expect(report.status === 'issue' ? report.message : '').toContain('names no node');
      expect(rt.state).toBe('loaded');
    });

    it('a SOM that is not valid SOM text is the same typed issue', async () => {
      const rt = await loaded(BODY);
      expect(rt.clearButton(pack('bar..[')).status).toBe('issue');
      expect(rt.clearButton(pack('bar..['))).toMatchObject({ code: 'CLEAR_BUTTON_UNRESOLVED' });
      expect(rt.state).toBe('loaded');
    });

    it('not a button: a text field, a subform, a draw and an exclusion group are each CLEAR_BUTTON_NOT_A_BUTTON', async () => {
      const rt = await loaded(BODY);
      for (const name of ['plain', 'bar', 'bar.label', 'grp', 'grp.a']) {
        expect(rt.clearButton(pack(name)), name).toMatchObject({ status: 'issue', code: 'CLEAR_BUTTON_NOT_A_BUTTON' });
      }
    });

    it('reads only: nothing is clicked, the form is unchanged, and an issue message does not echo more than a short, escaped name', async () => {
      const rt = await loaded(BODY);
      rt.setValue('plain', 'keep');
      const report = rt.clearButton(pack(`missing${'\u0007'.repeat(3)}${'y'.repeat(500)}`));
      expect(rt.getValue('plain')).toBe('keep');
      expect(report.status).toBe('issue');
      if (report.status === 'issue') {
        expect(report.message.length).toBeLessThan(260);
        expect(report.message).not.toContain('\u0007');
      }
    });

    it('needs a loaded run, and a descriptor that is not valid is INVALID_ARGUMENT', async () => {
      const unloaded = await makeRuntime(BODY);
      expect(thrown(() => unloaded.clearButton(pack('erase')))).toBeInstanceOf(XfaRuntimeError);
      expect(thrown(() => unloaded.clearButton(pack('erase')))).toMatchObject({ code: 'NOT_LOADED' });
      const rt = await loaded(BODY);
      expect(thrown(() => rt.clearButton({ ...BASE, clearButton: '' }))).toMatchObject({ code: 'INVALID_ARGUMENT' });
    });
  });
});
