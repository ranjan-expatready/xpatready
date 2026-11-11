import { describe, expect, it } from 'vitest';
import { XfaPdfError } from '../../pdf/errors.js';
import { createFormDom } from '../../model/form/index.js';
import { datasetsXml } from '../../model/form/__tests__/helpers.js';
import { loadTemplate } from '../../model/template/index.js';
import { tpl } from '../../model/template/__tests__/helpers.js';
import { createSandbox, XfaScriptError } from '../../script/index.js';
import { parseXml } from '../../xml/parse.js';
import { RunContext } from '../context.js';
import { FormScriptHost } from '../host.js';
import { PseudoNodes } from '../pseudo.js';
import { Recorder } from '../recorder.js';
import { FIXED_CLOCK, loaded, makeRuntime, onEvent, textField, thrown, variables } from './helpers.js';

describe('ScriptHost over the form DOM: nodes, members, scope', () => {
  it('a script in a nested subform reaches a field of an ancestor scope by bare name, so `a.rawValue = ...` written for the form works unchanged', async () => {
    const rt = await loaded(`${textField('a')}<subform name="sub">${textField('b', onEvent('initialize', 'a.rawValue = "from-b";'))}</subform>`);
    expect(rt.getValue('a')).toBe('from-b');
  });

  it('`this` is the node that owns the event and a bare name that is also a sibling resolves to the sibling, so the owner is not confused with its neighbours', async () => {
    const rt = await loaded(`${textField('x', onEvent('initialize', 'this.rawValue = this.name + "/" + y.name;'))}${textField('y')}`);
    expect(rt.getValue('x')).toBe('x/y');
  });

  it('a text variable declared on an ancestor is read and written through `.value`, and null clears it instead of failing', async () => {
    const body = `${variables('<text name="flag">start</text>')}${textField('a', onEvent('initialize', 'var before = flag.value; flag.value = "set"; a.rawValue = before + ">" + flag.value;'))}${textField('c', onEvent('initialize', 'flag.value = null; this.rawValue = String(flag.value === "" || flag.value === null);'))}`;
    const rt = await loaded(body);
    expect(rt.getValue('a')).toBe('start>set');
    expect(rt.getValue('c')).toBe('true');
    expect(rt.getValue('flag')).toBe('');
  });

  it('choice-list methods reach the form node: clearItems, addItem and selectedIndex change what the field holds', async () => {
    const body = `<field name="c"><ui><choiceList/></ui>${onEvent('initialize', 'this.clearItems(); this.addItem("First", "f1"); this.addItem("Second", "f2"); this.selectedIndex = 1;')}</field>`;
    const rt = await loaded(body);
    expect(rt.getValue('c')).toBe('f2');
  });

  it('somExpression is the canonical absolute path of the node, so scripts that pass it to library code address the right field', async () => {
    const rt = await loaded(`${textField('a', onEvent('initialize', 'this.rawValue = this.somExpression;'))}`);
    expect(rt.getValue('a')).toBe('xfa[0].form[0].form1[0].a[0]');
  });

  it('getDeltas on the root subform is an empty list: the saved form packet carries no user values, so the restore loop in the form runs zero times', async () => {
    const rt = await loaded(`${textField('a')}${onEvent('initialize', 'a.rawValue = String(this.getDeltas().length);')}`);
    expect(rt.getValue('a')).toBe('0');
  });

  it('resolveNodes returns every same-name sibling as a list with length and item(), and item() past the end is null', async () => {
    const body = `${textField('dup')}${textField('dup')}${textField('out')}${onEvent('initialize', 'var l = xfa.resolveNodes("dup[*]"); out.rawValue = l.length + ":" + l.item(1).name + ":" + (l.item(5) === null);')}`;
    const rt = await loaded(body);
    expect(rt.getValue('out')).toBe('2:dup:true');
  });

  it('the model roots are reachable from xfa: data, datasets and form, so the library that reloads the lookup table and reads the data XML finds them', async () => {
    const body = `${textField('a')}${onEvent('initialize', 'a.rawValue = [typeof xfa.data.saveXML(), xfa.datasets.data.className, xfa.form.nodes.item(0).name].join(",");')}`;
    const rt = await loaded(body);
    expect(rt.getValue('a')).toBe('string,dataGroup,form1');
  });

  it('a node list is a node: nodes.item(i) and nodes.length walk the children of a data node, so loops over a lookup list see every entry', async () => {
    const data = '<form1><a/></form1>';
    const lov = '<LOVFile><LOV><List><Item lic="1">One</Item><Item lic="2">Two</Item></List></LOV></LOVFile>';
    const body = `${textField('a')}${onEvent('initialize', 'var list = xfa.datasets.LOVFile.LOV.List; var s = ""; for (var i = 0; i < list.nodes.length; i++) { s += list.nodes.item(i).lic.value + "=" + list.nodes.item(i).value + ";"; } a.rawValue = s;')}`;
    const rt = await loaded(body, { data, lov });
    expect(rt.getValue('a')).toBe('1=One;2=Two;');
  });
});

describe('model outcomes map to ONE host reply (W01 wave-gate F6)', () => {
  it('an INVALID_ARGUMENT from the model is a catchable guest error, so a form that wraps a bad write in try/catch carries on', async () => {
    const body = `${textField('a')}${textField('r', onEvent('initialize', 'try { a.presence = "bogus"; this.rawValue = "no error"; } catch (e) { this.rawValue = "caught"; }'))}`;
    const rt = await loaded(body);
    expect(rt.getValue('r')).toBe('caught');
  });

  it('an INVALID_OPERATION from the model is a catchable guest error too (appending a node to itself)', async () => {
    const body = `${textField('r', onEvent('initialize', 'try { var root = xfa.form.nodes.item(0); root.nodes.append(root); this.rawValue = "no error"; } catch (e) { this.rawValue = "caught"; }'))}`;
    const rt = await loaded(body);
    expect(rt.getValue('r')).toBe('caught');
  });

  it('a LIMIT from the model is fatal and not catchable, because it bounds resources: a try/catch loop cannot absorb the ceiling', async () => {
    const body = `${textField('r')}${onEvent('initialize', 'for (var i = 0; i < 5000; i++) { try { xfa.form.createNode("text", "n" + i); } catch (e) { } }')}`;
    const rt = await makeRuntime(body, { options: { limits: { maxFormNodes: 200 } } });
    const error = thrown(() => rt.load());
    expect(error).toBeInstanceOf(XfaScriptError);
    expect((error as XfaScriptError).code).toBe('SCRIPT_LIMIT');
    expect((error as XfaScriptError).limit).toBe('form-size');
    expect(rt.state).toBe('aborted');
  });

  it('a member the model does not implement is UNSUPPORTED: strict mode makes it fatal and names the class and member', async () => {
    const rt = await makeRuntime(`${textField('a', onEvent('initialize', 'var x = this.noSuchMember;'))}`);
    const error = thrown(() => rt.load());
    expect(error).toBeInstanceOf(XfaScriptError);
    expect((error as XfaScriptError).code).toBe('UNSUPPORTED_MEMBER');
    expect((error as XfaScriptError).member).toBe('field.noSuchMember');
  });

  it('outside strict mode the same access is recorded in the unsupported log and the script sees undefined', async () => {
    const rt = await loaded(`${textField('a', onEvent('initialize', 'this.rawValue = String(this.noSuchMember);'))}`, { options: { strict: false } });
    expect(rt.getValue('a')).toBe('undefined');
    expect(rt.unsupported).toEqual([{ class: 'field', member: 'noSuchMember' }]);
  });

  it('strict mode is off unless asked for: the default records the unsupported member and the form carries on', async () => {
    const rt = await loaded(`${textField('a', onEvent('initialize', 'var x = this.noSuchMember;'))}`, { options: { strict: undefined } });
    expect(rt.unsupported).toEqual([{ class: 'field', member: 'noSuchMember' }]);
  });

  it('an unsupported SOM grammar in a script is a catchable error: the text is the script\'s own, so a form may guard it with try/catch', async () => {
    const body = textField('r', onEvent('initialize', 'try { xfa.resolveNode("$data.x"); this.rawValue = "no error"; } catch (e) { this.rawValue = "caught"; }'));
    const rt = await loaded(body);
    expect(rt.getValue('r')).toBe('caught');
  });

  it('an XfaPdfError reaching the host at run time is fatal HOST_ERROR carrying the cause (it signals a load-time or integrity problem, not a script mistake)', async () => {
    const dom = createFormDom(loadTemplate(tpl(textField('a'))), parseXml(datasetsXml('<form1/>')));
    const context = new RunContext();
    const host = new FormScriptHost({
      dom,
      context,
      recorder: new Recorder(10, 10_000, () => undefined),
      services: {
        handle: () => {
          throw new XfaPdfError('MALFORMED_XML', 'damaged packet');
        },
      },
      pseudo: new PseudoNodes(context, new Recorder(10, 10_000, () => undefined), { page: () => 1, pageCount: () => 1 }),
    });
    const sandbox = await createSandbox({ host, xfaRoot: { id: 0, cls: 'xfa' }, clock: FIXED_CLOCK, strict: true });
    try {
      const error = thrown(() => sandbox.evaluate('xfa.host.name'));
      expect(error).toBeInstanceOf(XfaScriptError);
      expect((error as XfaScriptError).code).toBe('HOST_ERROR');
      expect((error as XfaScriptError).cause).toBeInstanceOf(XfaPdfError);
    } finally {
      sandbox.dispose();
    }
  });

  it('a method argument of the wrong type is a catchable guest error, never a host crash: createNode takes a class name string', async () => {
    const body = `${textField('r', onEvent('initialize', 'try { xfa.form.createNode(5, "x"); this.rawValue = "no error"; } catch (e) { this.rawValue = "caught"; }'))}`;
    const rt = await loaded(body);
    expect(rt.getValue('r')).toBe('caught');
  });
});
