import { describe, expect, it } from 'vitest';
import { build } from '../../model/form/__tests__/helpers.js';
import { XfaScriptError } from '../../script/index.js';
import { MAX_FREE_NAMES_PER_SCRIPT } from '../limits.js';
import { ScopeBinder } from '../scope.js';
import { makeRuntime, onEvent, textField, thrown } from './helpers.js';

const scope = () => build(textField('Known')).dom.root;
const binder = (maxSourceChars: number, maxFreeNames?: number) =>
  new ScopeBinder(new Set(), () => false, { maxSourceChars, ...(maxFreeNames === undefined ? {} : { maxFreeNames }) });

describe('ScopeBinder refuses a script before it analyses it when the script is over a ceiling', () => {
  it('control: a short script binds the form node it names', () => {
    expect(binder(100).bind(scope(), 'Known.rawValue = 1;')).toBe('var Known=xfa.resolveNode("Known");Known.rawValue = 1;');
  });

  it('a script longer than the sandbox source limit is SCRIPT_LIMIT (source-size) even if it would not parse, because nothing is analysed first', () => {
    const text = 'this is not javascript and it is long';
    const error = thrown(() => binder(10).bind(scope(), text));
    expect(error).toBeInstanceOf(XfaScriptError);
    expect((error as XfaScriptError).code).toBe('SCRIPT_LIMIT');
    expect((error as XfaScriptError).limit).toBe('source-size');
    // The same text within the limit reaches the analysis, which is where its parse error comes from.
    expect((thrown(() => binder(1000).bind(scope(), text)) as XfaScriptError).code).toBe('SCRIPT_ERROR');
  });

  it('the same limit applies to a library body', () => {
    const error = thrown(() => binder(10).bindLibrary(scope(), 'var a = 1; var b = 2;'));
    expect((error as XfaScriptError).code).toBe('SCRIPT_LIMIT');
  });

  it('a script that uses more distinct undeclared names than the ceiling is SCRIPT_LIMIT, before any of them is resolved', () => {
    const names = (n: number): string => Array.from({ length: n }, (_, i) => `n${i}`).join(';');
    expect(binder(100_000, 5).bind(scope(), names(5))).toBe(names(5));
    const error = thrown(() => binder(100_000, 5).bind(scope(), names(6)));
    expect(error).toBeInstanceOf(XfaScriptError);
    expect((error as XfaScriptError).code).toBe('SCRIPT_LIMIT');
  });

  it('the name ceiling counts distinct names, so a name used many times is one', () => {
    expect(binder(100_000, 2).bind(scope(), 'a; a; a; a; b; b;')).toBe('a; a; a; a; b; b;');
  });

  it('the default name ceiling is applied when none is given', () => {
    const text = Array.from({ length: MAX_FREE_NAMES_PER_SCRIPT + 1 }, (_, i) => `n${i}`).join(';');
    const error = thrown(() => new ScopeBinder(new Set(), () => false, { maxSourceChars: 4 * 1024 * 1024 }).bind(scope(), text));
    expect((error as XfaScriptError).code).toBe('SCRIPT_LIMIT');
  });
});

describe('the runtime wires the sandbox source limit into the binder', () => {
  it('an event script longer than limits.sourceChars ends the run with SCRIPT_LIMIT (source-size), not with the parse error analysing it would have raised', async () => {
    const body = textField('f', onEvent('initialize', 'this is not javascript but it is longer than twenty characters'));
    const runtime = await makeRuntime(body, { options: { limits: { sourceChars: 20 } } });
    const error = thrown(() => runtime.load());
    expect(error).toBeInstanceOf(XfaScriptError);
    expect((error as XfaScriptError).code).toBe('SCRIPT_LIMIT');
    expect((error as XfaScriptError).limit).toBe('source-size');
  });
});
