import { describe, expect, it } from 'vitest';
import { XfaScriptError } from '../../script/index.js';
import { XfaRuntimeError } from '../errors.js';
import { calc, loaded, makeRuntime, onEvent, textField, thrown, variables } from './helpers.js';

// Fixed size: a log that grows with every mark would move the layout on each `ready` and make the layout fire it again (W02-T09).
const logField = '<field name="log" w="100pt" h="10pt"><ui><textEdit/></ui></field>';
const append = (mark: string): string => `log.rawValue = (log.rawValue || "") + "${mark}";`;

describe('load sequence and event dispatch', () => {
  it('initialize runs a container before its children, in document order, so a parent that prepares shared state is ready when the child reads it', async () => {
    const body = `${onEvent('initialize', append('R'))}${logField}<subform name="sub">${onEvent('initialize', append('S'))}${textField('f', onEvent('initialize', append('F')))}</subform>${textField('g', onEvent('initialize', append('G')))}`;
    const rt = await loaded(body);
    expect(rt.getValue('log')).toBe('RSFG');
  });

  it('ready ($form) runs before ready ($layout), and docReady ($host) last, after initialize and the calculate settle', async () => {
    const body = `${logField}${textField('calcd', `${onEvent('docReady', append('D'), ' ref="$host"')}${onEvent('ready', append('L'), ' ref="$layout"')}${onEvent('ready', append('F'), ' ref="$form"')}${onEvent('initialize', append('I'))}`)}`;
    const rt = await loaded(body);
    // The docReady handler wrote the log, so the layout is made once more before load() returns, and the ready:$layout handlers fire after it (W02-T09).
    expect(rt.getValue('log')).toBe('IFLDL');
  });

  it('validate scripts do not run during load (the viewer\'s validate pass is deliberately not part of load, W02-T07); only an explicit execValidate runs one', async () => {
    const validated = `<validate><script contentType="application/x-javascript">xfa.host.messageBox("validate ran"); true</script></validate>`;
    const body = `${textField('f', validated)}${textField('g', onEvent('click', 'this.rawValue = f.execValidate() ? "ok" : "bad";'))}`;
    const rt = await loaded(body);
    expect(rt.messages).toEqual([]);
    rt.event('g', 'click');
    expect(rt.messages.map((m) => m.text)).toEqual(['validate ran']);
    expect(rt.getValue('g')).toBe('ok');
  });

  it('server-only scripts and empty scripts are skipped, and the load report counts only the scripts that ran', async () => {
    const body = `${logField}${textField('f', `${onEvent('initialize', append('X'), '', ' runAt="server"')}${onEvent('initialize', '   ')}${onEvent('initialize', append('K'))}`)}`;
    const rt = await makeRuntime(body);
    const report = rt.load();
    expect(rt.getValue('log')).toBe('K');
    expect(report.scriptsRun).toBe(1);
  });

  it('runAt="both" scripts run, because the client is one of the two places they are declared for', async () => {
    const rt = await loaded(`${logField}${textField('f', onEvent('initialize', append('B'), '', ' runAt="both"'))}`);
    expect(rt.getValue('log')).toBe('B');
  });

  it('event() fires the handlers of one node for one activity and passes xfa.event fields, so a change dispatch sees newText, prevText and change', async () => {
    const body = `${logField}${textField('f', onEvent('change', 'log.rawValue = [xfa.event.name, xfa.event.newText, xfa.event.prevText, xfa.event.change].join("|");'))}`;
    const rt = await loaded(body);
    const result = rt.event('f', 'change', { newText: 'abcd', prevText: 'abc', change: 'd' });
    expect(result.scriptsRun).toBe(1);
    expect(rt.getValue('log')).toBe('change|abcd|abc|d');
  });

  it('xfa.event fields default to empty outside a change dispatch and do not leak from the previous event', async () => {
    const body = `${logField}${textField('f', `${onEvent('change', append('c'))}${onEvent('exit', 'log.rawValue = "[" + xfa.event.newText + "]" + xfa.event.name;')}`)}`;
    const rt = await loaded(body);
    rt.event('f', 'change', { newText: 'zz' });
    rt.event('f', 'exit');
    expect(rt.getValue('log')).toBe('[]exit');
  });

  it('a four-character newText moves focus to the next field and records its absolute SOM, as the date-entry fields of the form do', async () => {
    const body = `${textField('year', onEvent('change', 'var v = xfa.event.newText; if (v.length == 4) xfa.host.setFocus(month);'))}${textField('month')}`;
    const rt = await loaded(body);
    rt.event('year', 'change', { newText: '1999' });
    rt.event('year', 'change', { newText: '199' });
    expect(rt.focus).toEqual(['xfa[0].form[0].form1[0].month[0]']);
  });

  it('execEvent runs the other node\'s handler synchronously, before the caller continues', async () => {
    const body = `${logField}${textField('a', onEvent('click', `${append('1')} b.execEvent("click"); ${append('3')}`))}${textField('b', onEvent('click', append('2')))}`;
    const rt = await loaded(body);
    rt.event('a', 'click');
    expect(rt.getValue('log')).toBe('123');
  });

  it('execEvent re-entrancy is capped by a typed limit that names the node, so a click handler that clicks itself cannot recurse forever', async () => {
    const rt = await loaded(textField('a', onEvent('click', 'this.execEvent("click");')), { options: { limits: { maxExecEventDepth: 4 } } });
    const error = thrown(() => rt.event('a', 'click'));
    expect(error).toBeInstanceOf(XfaScriptError);
    const typed = error as XfaScriptError;
    expect(typed.code).toBe('SCRIPT_LIMIT');
    expect(typed.limit).toBe('nesting');
    expect(typed.nodeSom).toContain('a[0]');
    expect(rt.state).toBe('aborted');
  });

  it('a script error carries the event, the node SOM and the guest stack, and aborts the run: nothing after it executes and later calls are refused', async () => {
    const body = `${logField}${textField('f', onEvent('initialize', `${append('1')} throw new Error("boom");`))}${textField('g', onEvent('initialize', append('2')))}`;
    const rt = await makeRuntime(body);
    const error = thrown(() => rt.load());
    expect(error).toBeInstanceOf(XfaScriptError);
    const typed = error as XfaScriptError;
    expect(typed.code).toBe('SCRIPT_ERROR');
    expect(typed.event).toBe('initialize');
    expect(typed.nodeSom).toBe('xfa[0].form[0].form1[0].f[0]');
    expect(typed.guestStack).toBeDefined();
    expect(typed.message).toContain('boom');
    expect(rt.state).toBe('aborted');
    const later = thrown(() => rt.event('g', 'initialize'));
    expect(later).toBeInstanceOf(XfaRuntimeError);
    expect((later as XfaRuntimeError).code).toBe('RUN_ABORTED');
  });

  it('an event on a node that has no handler for the activity is a no-op that reports zero scripts', async () => {
    const rt = await loaded(`${textField('f', onEvent('click', 'this.rawValue = "x";'))}`);
    expect(rt.event('f', 'exit').scriptsRun).toBe(0);
    expect(rt.getValue('f')).toBeNull();
  });

  it('an activity that is not an XFA event name is a caller error that does not abort the run', async () => {
    const rt = await loaded(textField('f'));
    const error = thrown(() => rt.event('f', 'clik'));
    expect(error).toBeInstanceOf(XfaRuntimeError);
    expect((error as XfaRuntimeError).code).toBe('INVALID_ARGUMENT');
    expect(rt.state).toBe('loaded');
  });

  it('an event aimed at a node that does not exist is NODE_NOT_FOUND and leaves the run usable', async () => {
    const rt = await loaded(textField('f', onEvent('click', 'this.rawValue = "ok";')));
    const error = thrown(() => rt.event('nope.nothing', 'click'));
    expect((error as XfaRuntimeError).code).toBe('NODE_NOT_FOUND');
    rt.event('f', 'click');
    expect(rt.getValue('f')).toBe('ok');
  });

  it('a FormCalc bare reference in an event has no effect and is not run as JavaScript', async () => {
    const body = `${textField('f')}${textField('g', '<event activity="initialize"><script>f</script></event>')}`;
    const rt = await loaded(body);
    expect(rt.getValue('g')).toBeNull();
  });

  it('script objects are defined once per run before any event, so the first initialize can already call them', async () => {
    const body = `${variables('<script name="lib" contentType="application/x-javascript">function hi() { return "hi"; }</script>')}${textField('f', onEvent('initialize', 'this.rawValue = lib.hi();'))}`;
    const rt = await loaded(body);
    expect(rt.getValue('f')).toBe('hi');
  });
});

describe('the deferred members a script can call on a node', () => {
  it('execInitialize runs the node\'s initialize handlers again on demand, so a form that resets a block by re-initialising it works', async () => {
    const body = `${logField}${textField('f', onEvent('initialize', append('i')))}${textField('g', onEvent('click', 'f.execInitialize();'))}`;
    const rt = await loaded(body);
    rt.event('g', 'click');
    expect(rt.getValue('log')).toBe('ii');
  });

  it('execCalculate runs that node\'s calculate once, without settling the others', async () => {
    const body = `${textField('src')}${textField('dst', calc('this.rawValue = "calc:" + src.rawValue;'))}${textField('go', onEvent('click', 'src.rawValue = "v"; dst.execCalculate();'))}`;
    const rt = await loaded(body);
    rt.event('go', 'click');
    expect(rt.getValue('dst')).toBe('calc:v');
  });

  it('recalculate settles the calculates inside the calling script, so the script reads the dependent value straight after its own write', async () => {
    const body = `${textField('x')}${textField('y', calc('this.rawValue = "y" + x.rawValue;'))}${textField('seen')}${textField('go', onEvent('click', 'x.rawValue = "1"; xfa.form.recalculate(1); seen.rawValue = y.rawValue;'))}`;
    const rt = await loaded(body);
    rt.event('go', 'click');
    expect(rt.getValue('seen')).toBe('y1');
  });

  it('execValidate is false for an empty field whose null test is on, true once it has a value, and false when its validate script answers false', async () => {
    const body = `${textField('req', '<validate nullTest="error"/>')}${textField('chk', `<validate><script contentType="application/x-javascript">chk.rawValue != "bad"</script></validate>`)}${textField('out')}${textField('go', onEvent('click', 'var a = req.execValidate(); req.rawValue = "x"; var b = req.execValidate(); chk.rawValue = "bad"; var c = chk.execValidate(); out.rawValue = [a, b, c].join(",");'))}`;
    const rt = await loaded(body);
    rt.event('go', 'click');
    expect(rt.getValue('out')).toBe('false,true,false');
  });

  it('a non-event activity name given to execEvent is a catchable argument error, not a silent no-op', async () => {
    const body = `${textField('r')}${textField('go', onEvent('click', 'try { r.execEvent("clik"); this.rawValue = "no error"; } catch (e) { this.rawValue = "caught"; }'))}`;
    const rt = await loaded(body);
    rt.event('go', 'click');
    expect(rt.getValue('go')).toBe('caught');
  });
});

describe('nesting cap, ready default, calculate as an event', () => {
  it('every exec member shares the nesting cap: a self-calling initialize, calculate or validate ends in a typed nesting limit', async () => {
    const options = { options: { limits: { maxExecEventDepth: 3 } } };
    const cases: [string, string][] = [
      ['execInitialize', textField('a', onEvent('initialize', 'this.execInitialize();'))],
      ['execCalculate', textField('a', `<calculate><script contentType="application/x-javascript">this.execCalculate();</script></calculate>`)],
      ['execValidate', textField('a', `<validate><script contentType="application/x-javascript">this.execValidate();</script></validate>${onEvent('click', 'this.execValidate();')}`)],
    ];
    for (const [name, body] of cases) {
      const rt = await makeRuntime(body, options);
      const error = thrown(() => {
        rt.load();
        rt.event('a', 'click');
      });
      expect(error, name).toBeInstanceOf(XfaScriptError);
      expect((error as XfaScriptError).limit, name).toBe('nesting');
      expect((error as XfaScriptError).message, name).toMatch(/more than 3 levels/);
    }
  });

  it('a ready event with no ref is a $form ready (the XFA default), so it runs before the $layout handlers', async () => {
    const body = `${logField}${textField('f', `${onEvent('ready', append('L'), ' ref="$layout"')}${onEvent('ready', append('R'))}`)}`;
    const rt = await loaded(body);
    expect(rt.getValue('log')).toBe('RL');
  });

  it('event(som, "calculate") runs the node\'s calculate script like execEvent("calculate") does', async () => {
    const body = `${variables('<text name="runs">0</text>')}${textField('c', `<value><text>start</text></value>${calc('runs.value = String(Number(runs.value) + 1); undefined;')}`)}${textField('go', onEvent('click', 'c.execEvent("calculate");'))}`;
    const rt = await loaded(body);
    const before = Number(rt.getValue('runs'));
    expect(rt.event('c', 'calculate').scriptsRun).toBe(1);
    rt.event('go', 'click');
    expect(Number(rt.getValue('runs'))).toBe(before + 2);
    expect(rt.event('go', 'calculate').scriptsRun).toBe(0);
  });
});
