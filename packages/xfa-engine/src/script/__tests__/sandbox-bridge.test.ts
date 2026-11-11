import { afterEach, describe, expect, it } from 'vitest';
import { FN_MARKER, UNDEF, errorReply, nodeList, nodeValue, type NodeRef } from '../bridge-types.js';
import { FakeHost } from './fake-host.js';
import { afterEachDispose, expectScriptError, makeHarness } from './helpers.js';

afterEach(afterEachDispose);

/** form1 > field (rawValue, ui.oneOfChild) wired into a fake host. */
function formWithField(host: FakeHost): { field: NodeRef; ui: NodeRef; edit: NodeRef } {
  const edit = host.addNode('textEdit', { className: 'textEdit' });
  const ui = host.addNode('ui', { oneOfChild: nodeValue(edit) });
  const field = host.addNode(
    'field',
    { rawValue: '42', presence: 'visible', ui: nodeValue(ui), isNull: false, className: 'field' },
    { execEvent: (args) => (args[0] === 'click' ? 'clicked' : null), setFocus: () => UNDEF },
  );
  return { field, ui, edit };
}

describe('bridge round-trip against a fake host (A2)', () => {
  it('property get and set reach the host node, so a script reads and writes rawValue on the right field', async () => {
    const host = new FakeHost();
    const { field } = formWithField(host);
    host.onResolve('form1.f', nodeValue(field));
    const { sandbox } = await makeHarness({}, host);
    const out = sandbox.evaluate('var f = xfa.resolveNode("form1.f"); var before = f.rawValue; f.rawValue = "99"; [before, f.rawValue]');
    expect(out).toEqual(['42', '99']);
    expect(host.sets).toEqual([{ id: field.id, prop: 'rawValue', value: '99' }]);
  });

  it('a method call carries its arguments and returns the host result, so execEvent("click") dispatches', async () => {
    const host = new FakeHost();
    const { field } = formWithField(host);
    host.onResolve('f', nodeValue(field));
    const { sandbox } = await makeHarness({}, host);
    expect(sandbox.evaluate('var f = xfa.resolveNode("f"); [f.execEvent("click"), f.execEvent("exit")]')).toEqual(['clicked', null]);
    expect(host.traffic.filter((t) => t.startsWith('call:'))).toEqual([`call:${field.id}:execEvent`, `call:${field.id}:execEvent`]);
  });

  it('a method is discovered once per class, so repeated calls do not re-ask the host whether it is a method', async () => {
    const host = new FakeHost();
    const { field } = formWithField(host);
    host.onResolve('f', nodeValue(field));
    const { sandbox } = await makeHarness({}, host);
    sandbox.evaluate('var f = xfa.resolveNode("f"); f.execEvent("click"); f.execEvent("click"); f.execEvent("click");');
    expect(host.traffic.filter((t) => t === `get:${field.id}:execEvent`)).toHaveLength(1);
  });

  it('resolveNode returns a wrapper for a hit and null for a miss, so `if (node == null)` guards behave as in the form', async () => {
    const host = new FakeHost();
    const { field } = formWithField(host);
    host.onResolve('hit', nodeValue(field));
    const { sandbox } = await makeHarness({}, host);
    expect(sandbox.evaluate('[xfa.resolveNode("hit") != null, xfa.resolveNode("miss") === null, xfa.resolveNode("hit").rawValue]')).toEqual([true, true, '42']);
  });

  it('resolveNodes yields a list with length and item(i), so `nodes.item(i).value` walks every match', async () => {
    const host = new FakeHost();
    const a = host.addNode('field', { value: 'a' });
    const b = host.addNode('field', { value: 'b' });
    host.onResolve('TextField1[*]', nodeList([a, b]));
    const { sandbox } = await makeHarness({}, host);
    const out = sandbox.evaluate(
      'var l = xfa.resolveNodes("TextField1[*]"); var vals = []; for (var i = 0; i < l.length; i++) vals.push(l.item(i).value); [l.length, vals.join(","), l.item(7), l[1].value]',
    );
    expect(out).toEqual([2, 'a,b', null, 'b']);
    expect(sandbox.evaluate('xfa.resolveNodes("none").length')).toBe(0);
  });

  it('chained access `ui.oneOfChild.className` resolves through intermediate node wrappers', async () => {
    const host = new FakeHost();
    const { field } = formWithField(host);
    host.onResolve('f', nodeValue(field));
    const { sandbox } = await makeHarness({}, host);
    expect(sandbox.evaluate('xfa.resolveNode("f").ui.oneOfChild.className')).toBe('textEdit');
  });

  it('the same host node is always the same guest object, so identity comparisons in scripts hold', async () => {
    const host = new FakeHost();
    const { field } = formWithField(host);
    host.onResolve('f', nodeValue(field));
    host.onResolve('g', nodeValue(field));
    const { sandbox } = await makeHarness({}, host);
    expect(sandbox.evaluate('xfa.resolveNode("f") === xfa.resolveNode("g")')).toBe(true);
  });

  it('a node passed as an argument crosses as a handle, never as a host object', async () => {
    const host = new FakeHost();
    const { field } = formWithField(host);
    const target = host.addNode('subform', {}, { append: () => UNDEF });
    host.onResolve('f', nodeValue(field));
    host.onResolve('t', nodeValue(target));
    const { sandbox } = await makeHarness({}, host);
    sandbox.evaluate('xfa.resolveNode("t").append(xfa.resolveNode("f"));');
    const call = host.traffic.find((t) => t.startsWith(`call:${target.id}:append`));
    expect(call).toBeDefined();
  });

  it('null, undefined and NaN round-trip distinctly, so isNull checks and empty fields are not conflated', async () => {
    const host = new FakeHost();
    const n = host.addNode('field', { a: null, b: UNDEF, c: { $t: 'num', v: 'NaN' }, d: 0 });
    host.onResolve('n', nodeValue(n));
    const { sandbox } = await makeHarness({}, host);
    const out = sandbox.evaluate('var n = xfa.resolveNode("n"); [n.a === null, typeof n.b, isNaN(n.c), n.d === 0]');
    expect(out).toEqual([true, 'undefined', true, true]);
    sandbox.evaluate('var n = xfa.resolveNode("n"); n.d = 0/0; n.a = undefined;');
    expect(host.sets.map((s) => s.value)).toEqual([{ $t: 'num', v: 'NaN' }, { $t: 'undef' }]);
  });

  it('strings with quotes, newlines and non-BMP characters cross unchanged, so addresses and names are not corrupted', async () => {
    const host = new FakeHost();
    const n = host.addNode('field', { rawValue: 'x' });
    host.onResolve('n', nodeValue(n));
    const { sandbox } = await makeHarness({}, host);
    const tricky = 'O\'Brien "Q"\n\t\\ é \u{1f600}  ';
    sandbox.evaluate(`xfa.resolveNode("n").rawValue = ${JSON.stringify(tricky)};`);
    expect(host.sets[0]?.value).toBe(tricky);
    expect(sandbox.evaluate('xfa.resolveNode("n").rawValue')).toBe(tricky);
  });

  it('`this` is the node the script belongs to, so event scripts address their own field', async () => {
    const host = new FakeHost();
    const { field } = formWithField(host);
    const { sandbox } = await makeHarness({}, host);
    expect(sandbox.evaluate('this.rawValue', { thisNode: field })).toBe('42');
    expect(sandbox.evaluate('this.rawValue = "7"; this.rawValue', { thisNode: field })).toBe('7');
  });

  it('xfa.resolveNode on the xfa root forwards the root id, so the host can resolve relative to the running node', async () => {
    const host = new FakeHost();
    const { sandbox } = await makeHarness({}, host);
    sandbox.evaluate('xfa.resolveNode("anything")');
    expect(host.traffic).toContain('resolve:0:anything');
  });

  it('a node result is returned as a handle, so the engine can map a script\'s return value back to a node', async () => {
    const host = new FakeHost();
    const { field } = formWithField(host);
    host.onResolve('f', nodeValue(field));
    const { sandbox } = await makeHarness({}, host);
    expect(sandbox.evaluate('xfa.resolveNode("f")')).toEqual({ $t: 'node', id: field.id, cls: 'field' });
  });

  it('xfa.host members are routed to the host service channel, so messageBox, name and version are recorded not executed', async () => {
    const host = new FakeHost();
    host.hostMembers.set('host.messageBox', (op) => (op === 'get' ? FN_MARKER : 1));
    host.hostMembers.set('host.name', () => 'TestViewer');
    const { sandbox } = await makeHarness({}, host);
    expect(sandbox.evaluate('[xfa.host.name, xfa.host.messageBox("Please fix", "Check", 3, 0)]')).toEqual(['TestViewer', 1]);
    expect(host.hostCalls).toEqual([{ member: 'host.messageBox', args: ['Please fix', 'Check', 3, 0] }]);
  });

  it('app.runtimeHighlight writes and console.println calls reach the host, so legacy toggles do not throw', async () => {
    const host = new FakeHost();
    host.hostMembers.set('app.runtimeHighlight', () => UNDEF);
    host.hostMembers.set('console.println', (op) => (op === 'get' ? FN_MARKER : UNDEF));
    const { sandbox } = await makeHarness({}, host);
    sandbox.evaluate('app.runtimeHighlight = true; console.println("hello");');
    expect(host.hostSets).toEqual([{ member: 'app.runtimeHighlight', args: [true] }]);
    expect(host.hostCalls).toEqual([{ member: 'console.println', args: ['hello'] }]);
  });

  it('an error reply becomes a catchable guest Error, so scripts that wrap resolveNode in try/catch behave', async () => {
    const host = new FakeHost();
    const n = host.addNode('field', { bad: errorReply('GeneralError: nope') });
    host.onResolve('n', nodeValue(n));
    const { sandbox } = await makeHarness({}, host);
    expect(sandbox.evaluate('try { xfa.resolveNode("n").bad; "no error" } catch (e) { e.message }')).toBe('GeneralError: nope');
  });

  it('toString on a wrapper is local, so string concatenation with a node does not hit the host or the unsupported log', async () => {
    const host = new FakeHost();
    const { field } = formWithField(host);
    host.onResolve('f', nodeValue(field));
    const { sandbox } = await makeHarness({}, host);
    expect(sandbox.evaluate('"" + xfa.resolveNode("f")')).toBe('[object field]');
    expect(host.logs).toEqual([]);
  });
});

describe('unsupported members (strict and lenient)', () => {
  it('lenient mode returns undefined and records the member, so production forms keep running but the gap is visible', async () => {
    const host = new FakeHost();
    const { field } = formWithField(host);
    host.onResolve('f', nodeValue(field));
    const { sandbox } = await makeHarness({ strict: false }, host);
    expect(sandbox.evaluate('typeof xfa.resolveNode("f").nosuch')).toBe('undefined');
    expect(host.logs).toEqual([{ kind: 'unsupported', payload: { class: 'field', member: 'nosuch' } }]);
  });

  it('strict mode throws UNSUPPORTED_MEMBER naming class and member, so a missing XFA feature fails a test loudly', async () => {
    const host = new FakeHost();
    const { field } = formWithField(host);
    host.onResolve('f', nodeValue(field));
    const { sandbox } = await makeHarness({ strict: true }, host);
    const error = expectScriptError(() => sandbox.evaluate('xfa.resolveNode("f").nosuch', { event: 'initialize', nodeSom: 'form1.f' }));
    expect(error.code).toBe('UNSUPPORTED_MEMBER');
    expect(error.member).toBe('field.nosuch');
    expect(error.event).toBe('initialize');
    expect(error.nodeSom).toBe('form1.f');
    expect(host.logs).toHaveLength(1);
  });

  it('strict mode cannot be defeated by try/catch inside the script, so a form that swallows errors still fails the test', async () => {
    const host = new FakeHost();
    const { field } = formWithField(host);
    host.onResolve('f', nodeValue(field));
    const { sandbox } = await makeHarness({ strict: true }, host);
    const error = expectScriptError(() => sandbox.evaluate('try { xfa.resolveNode("f").nosuch; } catch (e) {} "carried on"'));
    expect(error.code).toBe('UNSUPPORTED_MEMBER');
  });

  it('an unsupported host service (app/console/xfa.host) is reported like a node member, so the API gap list is complete', async () => {
    const host = new FakeHost();
    const { sandbox } = await makeHarness({ strict: false }, host);
    sandbox.evaluate('xfa.host.nosuch; app.nosuch = 1;');
    expect(host.logs.map((l) => l.payload)).toEqual([
      { class: 'host', member: 'nosuch' },
      { class: 'app', member: 'nosuch' },
    ]);
  });
});

describe('evaluation modes', () => {
  it('global mode keeps declarations for later runs, so a script-object library defined once stays callable', async () => {
    const { sandbox } = await makeHarness();
    sandbox.evaluate('function helper(x){ return x * 2; } var shared = 21;', { global: true });
    expect(sandbox.evaluate('helper(shared)')).toBe(42);
  });

  it('local mode does not leak declarations, so one event script cannot clobber another\'s variables', async () => {
    const { sandbox } = await makeHarness();
    sandbox.evaluate('var leaked = 1; function leakedFn(){}');
    expect(sandbox.evaluate('[typeof leaked, typeof leakedFn]')).toEqual(['undefined', 'undefined']);
  });

  it('a syntax error is a typed SCRIPT_ERROR and the sandbox stays usable, so one bad script does not end the form run', async () => {
    const { sandbox } = await makeHarness();
    const error = expectScriptError(() => sandbox.evaluate('if (', { event: 'calculate', nodeSom: 'form1.f' }));
    expect(error.code).toBe('SCRIPT_ERROR');
    expect(error.message).toContain('event=calculate');
    expect(sandbox.closed).toBe(false);
    expect(sandbox.evaluate('1 + 1')).toBe(2);
  });

  it('a thrown guest error reports name, message and a bounded stack, so the failing script can be found without echoing a hostile megabyte', async () => {
    const { sandbox } = await makeHarness();
    const error = expectScriptError(() => sandbox.evaluate(`throw new Error("${'x'.repeat(5000)}")`));
    expect(error.code).toBe('SCRIPT_ERROR');
    expect(error.message.length).toBeLessThan(1500);
    expect(error.guestStack?.length ?? 0).toBeLessThan(2500);
  });

  it('non-printable characters in a guest error message are escaped, so a hostile script cannot inject terminal codes into logs', async () => {
    const { sandbox } = await makeHarness();
    const error = expectScriptError(() => sandbox.evaluate('throw new Error("a\\u001b[31mred\\u0007")'));
    expect(error.message).not.toMatch(/[\u0000-\u0009\u000b-\u001f\u007f]/);
    expect(error.message).toContain('\\x1b');
  });

  it('a source over the size cap is a typed SCRIPT_LIMIT, so a 100 MB script cannot be compiled', async () => {
    const { sandbox } = await makeHarness({ limits: { sourceChars: 1000 } });
    const error = expectScriptError(() => sandbox.evaluate(`"${'a'.repeat(2000)}"`));
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'source-size' });
  });
});
