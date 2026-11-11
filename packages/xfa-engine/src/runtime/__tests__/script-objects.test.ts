import { describe, expect, it } from 'vitest';
import { XfaPdfError } from '../../pdf/errors.js';
import { XfaScriptError } from '../../script/index.js';
import { esc, lib, loaded, makeRuntime, onEvent, textField, thrown, variables } from './helpers.js';

describe('script objects from the root variables block', () => {
  it('two libraries that define the same helper name each keep their own, so per-form library drift cannot make one library call the other', async () => {
    const libs = variables(
      lib('libA', 'function id() { return "A"; } function callId() { return id(); }'),
      lib('libB', 'function id() { return "B"; } function callId() { return id(); }'),
    );
    const rt = await loaded(`${libs}${textField('out', onEvent('initialize', 'this.rawValue = libA.callId() + libB.callId() + libA.id() + libB.id();'))}`);
    expect(rt.getValue('out')).toBe('ABAB');
  });

  it('a library keeps state between events (one evaluation per run) and exposes its top-level vars live', async () => {
    const libs = variables(lib('counter', 'var count = 0; function bump() { count = count + 1; return count; }'));
    const body = `${libs}${textField('out')}${onEvent('initialize', 'counter.bump(); counter.bump(); out.rawValue = counter.count;')}`;
    const rt = await loaded(body);
    expect(rt.getValue('out')).toBe('2');
  });

  it('a data-classified script object (an XML string) is a locked global with a value property, not code', async () => {
    const xml = '<?xml version="1.0"?><list><i>a</i><i>b</i></list>';
    const libs = variables(`<script name="Table" contentType="application/x-javascript">${esc(xml)}</script>`);
    const body = `${libs}${textField('out', onEvent('initialize', 'var before = Table.value; Table = "replaced"; this.rawValue = (Table.value === before) + ":" + Table.value.length;'))}`;
    const rt = await loaded(body);
    expect(rt.getValue('out')).toBe(`true:${xml.length}`);
  });

  it('a data object with line-separator characters still loads, so a lookup table containing U+2028 does not break the wrapper program', async () => {
    const xml = '<list><i>a\u2028b\u2029c</i></list>';
    const libs = variables(`<script name="Table" contentType="application/x-javascript">${esc(xml)}</script>`);
    const rt = await loaded(`${libs}${textField('out', onEvent('initialize', 'this.rawValue = Table.value.length;'))}`);
    expect(rt.getValue('out')).toBe(String(xml.length));
  });

  it('library code resolves bare form names against the root subform, so a helper that reads `a.rawValue` finds the field whichever script calls it', async () => {
    const libs = variables(lib('reader', 'function read() { return a.rawValue; } function flip() { flag.value = "flipped"; }'), '<text name="flag">x</text>');
    const body = `${libs}${textField('a', onEvent('initialize', 'this.rawValue = "seen";'))}<subform name="deep">${textField('out', onEvent('initialize', 'this.rawValue = reader.read(); reader.flip();'))}</subform>`;
    const rt = await loaded(body);
    expect(rt.getValue('deep.out')).toBe('seen');
    expect(rt.getValue('flag')).toBe('flipped');
  });

  it('a library that cannot be parsed fails the load with a typed error that names the object', async () => {
    const rt = await makeRuntime(`${variables(lib('broken', 'function ( {'))}${textField('a')}`);
    const error = thrown(() => rt.load());
    expect(error).toBeInstanceOf(XfaScriptError);
    expect((error as XfaScriptError).code).toBe('SCRIPT_ERROR');
    expect((error as XfaScriptError).message).toContain('broken');
    expect(rt.state).toBe('aborted');
  });

  it('a script object declared outside the root subform is refused with UNSUPPORTED_FEATURE instead of being bound to the wrong scope', async () => {
    const rt = await makeRuntime(`<subform name="inner">${variables(lib('nested', 'var x = 1;'))}</subform>${textField('a')}`);
    const error = thrown(() => rt.load());
    expect(error).toBeInstanceOf(XfaPdfError);
    expect((error as XfaPdfError).code).toBe('UNSUPPORTED_FEATURE');
  });

  it('a script object whose name is a language global is refused, so a form cannot replace Math or Date for every later script', async () => {
    const rt = await makeRuntime(`${variables(lib('Math', 'var round = 1;'))}${textField('a')}`);
    const error = thrown(() => rt.load());
    expect(error).toBeInstanceOf(XfaScriptError);
    expect((error as XfaScriptError).code).toBe('INVALID_OPTIONS');
  });

  it('names bound to form nodes are not members of the library: a for-in over it lists only what the library declares', async () => {
    const libs = variables(lib('reader', 'var own = 1; function read() { return a.rawValue; }'));
    const body = `${libs}${textField('a', onEvent('initialize', 'this.rawValue = "seen";'))}${textField('out', onEvent('initialize', 'var k, s = []; for (k in reader) { s.push(k); } s.sort(); this.rawValue = s.join(",") + ":" + reader.read();'))}`;
    const rt = await loaded(body);
    expect(rt.getValue('out')).toBe('own,read:seen');
  });

  it('a library may call a function it declares further down from its top-level code, as plain ES3 hoisting allows', async () => {
    const libs = variables(lib('early', 'var answer = compute(); function compute() { return a.name; }'));
    const rt = await loaded(`${libs}${textField('a')}${textField('out', onEvent('initialize', 'this.rawValue = early.answer;'))}`);
    expect(rt.getValue('out')).toBe('a');
  });
});
