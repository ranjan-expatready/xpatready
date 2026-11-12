import { describe, expect, it } from 'vitest';
import { build } from '../../model/form/__tests__/helpers.js';
import { ScopeBinder } from '../scope.js';

const binder = (maxFreeNames: number) => new ScopeBinder(new Set(), () => false, { maxSourceChars: 4 * 1024 * 1024, maxFreeNames });
const wide = (width: number) => build('<field name="F"/>'.repeat(width)).dom.root;

describe('ScopeBinder: resolving a script\'s names costs the depth of the scope, not its width (L2-F2)', () => {
  it('10,000 undeclared names that name no node, in a scope of 100,000 siblings, bind in under 3 seconds (it took 16.8 s: every name scanned every sibling)', () => {
    const scope = wide(100_000);
    const text = Array.from({ length: 10_000 }, (_, i) => `n${i}`).join(';');
    const started = performance.now();
    expect(binder(10_000).bind(scope, text)).toBe(text);
    expect(performance.now() - started).toBeLessThan(3_000);
  }, 120_000);

  it('5,000 scripts under one 100,000-wide parent bind in under 3 seconds in all (every script scanned every sibling)', () => {
    const scope = wide(100_000);
    const scripts = binder(10);
    const started = performance.now();
    for (let i = 0; i < 5_000; i += 1) scripts.bind(scope, `n${i}.rawValue = 1;`);
    expect(performance.now() - started).toBeLessThan(3_000);
  }, 120_000);

  it('a name that does name a node in a wide scope is still bound, and one that names none is left alone', () => {
    const scope = wide(50_000);
    expect(binder(10).bind(scope, 'F.rawValue = other;')).toBe('var F=xfa.resolveNode("F");F.rawValue = other;');
  });
});
