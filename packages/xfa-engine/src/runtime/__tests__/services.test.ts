import { describe, expect, it } from 'vitest';
import { XfaScriptError } from '../../script/index.js';
import { MAX_RECORDED_TEXT_CHARS } from '../services.js';
import { NEUTRAL_HOST, loaded, makeRuntime, onEvent, textField, thrown } from './helpers.js';

describe('host services: xfa.host, xfa.layout, app, console', () => {
  it('messageBox is recorded with its text, title, icon, buttons and the event and node that raised it, and returns OK (1) unless the caller says otherwise', async () => {
    const body = textField('f', onEvent('click', 'this.rawValue = String(xfa.host.messageBox("Check the date", "Title", 3, 1));'));
    const rt = await loaded(body);
    rt.event('f', 'click');
    expect(rt.getValue('f')).toBe('1');
    expect(rt.messages).toEqual([
      { text: 'Check the date', title: 'Title', icon: 3, buttons: 1, result: 1, event: 'click', nodeSom: 'xfa[0].form[0].form1[0].f[0]' },
    ]);
  });

  it('the messageBox answer is configurable by the caller, so a test can play the user pressing a different button', async () => {
    const body = textField('f', onEvent('click', 'this.rawValue = String(xfa.host.messageBox("Q"));'));
    const rt = await loaded(body, { options: { messageBoxResult: (call) => (call.text === 'Q' ? 4 : 1) } });
    rt.event('f', 'click');
    expect(rt.getValue('f')).toBe('4');
    expect(rt.messages[0]?.result).toBe(4);
  });

  it('a messageBox with only a message still records, with empty title and zero icon and buttons', async () => {
    const rt = await loaded(textField('f', onEvent('click', 'xfa.host.messageBox("Only text");')));
    rt.event('f', 'click');
    expect(rt.messages[0]).toMatchObject({ text: 'Only text', title: '', icon: 0, buttons: 0 });
  });

  it('setFocus records the absolute SOM whether the script passes a node or a SOM string, and keeps an unresolvable string as written', async () => {
    const body = `${textField('a', onEvent('click', 'xfa.host.setFocus(b); xfa.host.setFocus("b"); xfa.host.setFocus("no.such.thing");'))}${textField('b')}`;
    const rt = await loaded(body);
    rt.event('a', 'click');
    expect(rt.focus).toEqual(['xfa[0].form[0].form1[0].b[0]', 'xfa[0].form[0].form1[0].b[0]', 'no.such.thing']);
  });

  it('setFocus on nothing (a script that names a node the template does not have reads undefined) records no focus and does not fail the script; any other argument stays a mistake', async () => {
    const body = `${textField('a', onEvent('click', 'xfa.host.setFocus(undefined); xfa.host.setFocus(null); xfa.host.setFocus(b); this.rawValue = "done";'))}${textField('b')}${textField('c', onEvent('click', 'try { xfa.host.setFocus(5); this.rawValue = "no"; } catch (e) { this.rawValue = "mistake"; }'))}`;
    const rt = await loaded(body);
    rt.event('a', 'click');
    rt.event('c', 'click');
    expect(rt.focus).toEqual(['xfa[0].form[0].form1[0].b[0]']);
    expect(rt.getValue('a')).toBe('done');
    expect(rt.getValue('c')).toBe('mistake');
  });

  it('host identity comes from the caller and nowhere else, so the barcode reader-info string is whatever the deployment injected', async () => {
    const script = 'this.rawValue = [xfa.host.name, xfa.host.appType, xfa.host.version, xfa.host.variation, xfa.host.platform, xfa.host.language].join("/");';
    const rt = await loaded(textField('f', onEvent('initialize', script)));
    const { name, appType, version, variation, platform, language } = NEUTRAL_HOST;
    expect(rt.getValue('f')).toBe([name, appType, version, variation, platform, language].join('/'));
  });

  it('a host member the engine does not model is unsupported, and strict mode makes it fatal', async () => {
    const rt = await makeRuntime(textField('f', onEvent('initialize', 'xfa.host.gotoURL("x");')));
    const error = thrown(() => rt.load());
    expect(error).toBeInstanceOf(XfaScriptError);
    expect((error as XfaScriptError).code).toBe('UNSUPPORTED_MEMBER');
    expect((error as XfaScriptError).member).toBe('host.gotoURL');
  });

  it('xfa.layout answers from the real layout: no page before the layout exists, the page of a placed field and the page count after it', async () => {
    const before = 'this.rawValue = "before:" + xfa.layout.page(this) + "/" + xfa.layout.pageCount();';
    const after = 'this.rawValue = "after:" + xfa.layout.page(this) + "/" + xfa.layout.pageCount();';
    const rt = await loaded(textField('f', onEvent('initialize', before)) + textField('g', onEvent('ready', after, ' ref="$layout"')));
    expect(rt.getValue('f')).toBe('before:0/0');
    expect(rt.getValue('g')).toBe('after:1/1');
  });

  it('app.runtimeHighlight is a settable flag and the highlight colour is a neutral array, so the colour helpers of the forms run without a viewer', async () => {
    const script = 'app.runtimeHighlight = true; this.rawValue = String(app.runtimeHighlight) + ":" + app.runtimeHighlightColor.join(",");';
    const rt = await loaded(textField('f', onEvent('initialize', script)));
    expect(rt.getValue('f')).toBe('true:G,1');
  });

  it('console output is recorded instead of printed, so a failing library leaves its diagnostics in the run', async () => {
    const rt = await loaded(textField('f', onEvent('initialize', 'console.show(); console.println("line one"); console.println(42);')));
    expect(rt.console).toEqual(['line one', '42']);
  });

  it('recorded output is capped: a script that floods messageBox ends the run with a typed output limit instead of growing memory', async () => {
    const rt = await makeRuntime(textField('f', onEvent('initialize', 'for (var i = 0; i < 10; i++) { xfa.host.messageBox("m" + i); }')), {
      options: { limits: { maxRecordedEntries: 3 } },
    });
    const error = thrown(() => rt.load());
    expect(error).toBeInstanceOf(XfaScriptError);
    expect((error as XfaScriptError).code).toBe('SCRIPT_LIMIT');
    expect((error as XfaScriptError).limit).toBe('output');
  });

  it('the guest clock is the injected clock, so a form that stamps the date writes the same value on every run', async () => {
    const rt = await loaded(textField('f', onEvent('initialize', 'this.rawValue = String(new Date().getTime());')));
    expect(rt.getValue('f')).toBe(String(Date.UTC(2026, 5, 15, 12, 0, 0)));
  });

  it('recorded output is capped in bytes as well as entries: 64 KiB messages hit the byte ceiling long before the entry ceiling or the deadline', async () => {
    const script = 'var s = "x"; while (s.length < 65536) { s = s + s; } for (var i = 0; i < 100000; i++) { xfa.host.messageBox(s); }';
    const rt = await makeRuntime(textField('f', onEvent('initialize', script)));
    const error = thrown(() => rt.load());
    expect(error).toBeInstanceOf(XfaScriptError);
    expect((error as XfaScriptError).code).toBe('SCRIPT_LIMIT');
    expect((error as XfaScriptError).limit).toBe('output');
    expect(rt.messages.length).toBeGreaterThan(10);
    expect(rt.messages.length).toBeLessThan(500);
  });

  it('the byte ceiling can be tightened by the caller', async () => {
    const rt = await makeRuntime(textField('f', onEvent('initialize', 'for (var i = 0; i < 50; i++) { console.println("0123456789"); }')), { options: { limits: { maxRecordedBytes: 100 } } });
    const error = thrown(() => rt.load());
    expect((error as XfaScriptError).limit).toBe('output');
  });
});

describe('xfa.log.message: the recorded line is clipped like every other recorded text', () => {
  it('a huge message is kept up to the ceiling and the run carries on', async () => {
    const script = `var big = new Array(${MAX_RECORDED_TEXT_CHARS + 1001}).join("x"); xfa.log.message("info", big); xfa.log.message("info", "after"); this.rawValue = "done";`;
    const rt = await loaded(textField('f', onEvent('initialize', script)));
    expect(rt.console.map((line) => line.length)).toEqual([MAX_RECORDED_TEXT_CHARS, 'after'.length]);
    expect(rt.getValue('f')).toBe('done');
  });
});
