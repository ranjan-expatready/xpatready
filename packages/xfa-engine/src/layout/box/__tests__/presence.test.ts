import { describe, expect, it } from 'vitest';
import { IssueSink } from '../issues.js';
import { effectivePresence, flagsOf, isPrintOnly, ownPresence, relevantOf } from '../presence.js';
import { expectLayoutError, field, nodeOf } from './helpers.js';

const at = (attrs: string): ReturnType<typeof nodeOf> => nodeOf(field(`w="2pt" h="2pt" ${attrs}`), 'field', 'f');

describe('presence', () => {
  it('visible is drawn and takes space', () => {
    expect(flagsOf('visible')).toEqual({ occupiesSpace: true, drawn: true });
  });

  it('invisible takes space but is not drawn', () => {
    expect(flagsOf('invisible')).toEqual({ occupiesSpace: true, drawn: false });
  });

  it('hidden and inactive take no space and are not drawn', () => {
    expect(flagsOf('hidden')).toEqual({ occupiesSpace: false, drawn: false });
    expect(flagsOf('inactive')).toEqual({ occupiesSpace: false, drawn: false });
  });

  it('reads presence from the form DOM: visible by default, a script write wins over the template', () => {
    const node = at('');
    expect(ownPresence(node)).toBe('visible');
    node.presence = 'hidden';
    expect(ownPresence(node)).toBe('hidden');
    expect(ownPresence(at('presence="invisible"'))).toBe('invisible');
  });

  it('refuses a presence that is not one of the four', () => {
    expectLayoutError(() => ownPresence(at('presence="gone"')), 'LAYOUT_UNSUPPORTED', /presence/);
  });

  it('a child is at least as hidden as its parent: hidden hides the subtree, invisible keeps it invisible', () => {
    expect(effectivePresence('visible', 'hidden')).toBe('hidden');
    expect(effectivePresence('visible', 'invisible')).toBe('invisible');
    expect(effectivePresence('invisible', 'visible')).toBe('invisible');
    expect(effectivePresence('invisible', 'hidden')).toBe('hidden');
    expect(effectivePresence('hidden', 'invisible')).toBe('hidden');
    expect(effectivePresence('visible', 'visible')).toBe('visible');
    expect(effectivePresence('hidden', 'inactive')).toBe('inactive');
  });
});

describe('relevantOf', () => {
  it('is undefined when absent', () => {
    expect(relevantOf(at(''), new IssueSink())).toBeUndefined();
  });

  it('keeps -print as written and raises no issue: the screen viewer draws the box', () => {
    const sink = new IssueSink();
    expect(relevantOf(at('relevant="-print"'), sink)).toBe('-print');
    expect(sink.issues).toEqual([]);
  });

  it('keeps a print-only value (print, +print) without an issue: it is hidden on screen instead', () => {
    for (const value of ['print', '+print', 'print screen']) {
      const sink = new IssueSink();
      expect(relevantOf(at(`relevant="${value}"`), sink)).toBe(value);
      expect(sink.issues, value).toEqual([]);
    }
  });

  it('keeps any other value but reports that only -print and print are modelled', () => {
    const sink = new IssueSink();
    expect(relevantOf(at('relevant="+screen"'), sink)).toBe('+screen');
    expect(sink.issues[0]?.feature).toContain('relevant');
  });
});

describe('isPrintOnly', () => {
  it('is true only when the first token names print without an exclusion', () => {
    expect(['print', '+print', ' print screen '].map(isPrintOnly)).toEqual([true, true, true]);
    expect(['-print', 'screen print', '-print print', '+screen', undefined].map(isPrintOnly)).toEqual([false, false, false, false, false]);
  });
});
