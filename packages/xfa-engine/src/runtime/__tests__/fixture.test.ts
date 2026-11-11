import { describe, expect, it } from 'vitest';
import { XfaPdfError } from '../../pdf/errors.js';
import { applyFixture, fixtureSchema } from '../fixture.js';
import { loaded, onEvent, textField, thrown } from './helpers.js';

const checkBox = (name: string, extra = ''): string => `<field name="${name}"><ui><checkButton/></ui><items><text>1</text></items>${extra}</field>`;
const radios = (name: string): string =>
  `<exclGroup name="${name}"><field name="Yes"><ui><checkButton/></ui><items><text>Y</text></items>${onEvent('exit', 'Mark.rawValue = "yes-exit";')}</field>` +
  `<field name="No"><ui><checkButton/></ui><items><text>N</text></items>${onEvent('exit', 'Mark.rawValue = "no-exit";')}</field></exclGroup>`;

describe('fixtureSchema', () => {
  it('maps a SOM path to a string or a finite number and nothing else', () => {
    expect(fixtureSchema.parse({ 'a.b': 'x', 'a.c': 4 })).toEqual({ 'a.b': 'x', 'a.c': 4 });
    for (const bad of [{ '': 'x' }, { a: null }, { a: true }, { a: Number.NaN }, { a: ['x'] }, 'text', null, { a: 'x'.repeat(1025) }]) {
      expect(fixtureSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });
});

describe('applyFixture fills a loaded form the way a user does', () => {
  it('writes each value, in file order, and leaves the field so the form\'s exit handler runs', async () => {
    const rt = await loaded(`${textField('Mark')}${textField('First', onEvent('exit', 'Second.rawValue = "from-exit";'))}${textField('Second')}`);
    applyFixture(rt, { First: 'one' });
    expect(rt.getValue('First')).toBe('one');
    expect(rt.getValue('Second')).toBe('from-exit');
    applyFixture(rt, { First: 'one', Second: 'two' });
    expect(rt.getValue('Second')).toBe('two');
  });

  it('clicks a check box that is switched on, and does not click one that is switched off', async () => {
    const rt = await loaded(`${textField('Clicks')}${checkBox('On', onEvent('click', 'Clicks.rawValue = String(Number(Clicks.rawValue) + 1);'))}`);
    applyFixture(rt, { On: '0' });
    expect(rt.getValue('Clicks')).toBeNull();
    applyFixture(rt, { On: '1' });
    expect(rt.getValue('Clicks')).toBe('1');
  });

  it('leaves the radio button the value selects (exit), never clicks it', async () => {
    const rt = await loaded(`${textField('Mark')}${radios('Choice')}`);
    applyFixture(rt, { Choice: 'N' });
    expect(rt.getValue('Choice')).toBe('N');
    expect(rt.getValue('Mark')).toBe('no-exit');
  });

  it('a SOM that names no node is the runtime\'s NODE_NOT_FOUND (an XfaPdfError), so a typo in a fixture file is loud', async () => {
    const rt = await loaded(textField('A'));
    const error = thrown(() => applyFixture(rt, { Missing: 'x' }));
    expect(error).toBeInstanceOf(XfaPdfError);
    expect(error).toMatchObject({ code: 'NODE_NOT_FOUND' });
  });
});
