import { describe, expect, it } from 'vitest';
import { calculateOf, eventsOf, scriptOf, variablesOf } from '../index.js';
import { firstOfClass, modelOf, must, nodeNamed, tpl } from './helpers.js';

const JS = 'contentType="application/x-javascript"';

describe('variables: script objects, text variables, manifests', () => {
  const model = modelOf(
    tpl(`<variables>
      <script ${JS} name="util">function f() { return 1; }</script>
      <script ${JS} name="LOV"><![CDATA[<?xml version="1.0" encoding="UTF-8"?><LOV><A/></LOV>]]></script>
      <script ${JS} name="LOV2">
   &lt;LOV generated="x"/&gt;</script>
      <script name="calc">Page.Field</script>
      <script ${JS} name="empty"/>
      <text name="flag">false</text>
      <text name="blank"/>
      <manifest name="barcode1" id="abc"><ref >xfa[0].form[0].form1[0].A[0].dataNode</ref ><ref>xfa[0].form[0].form1[0].B[0].dataNode</ref></manifest>
      <script ${JS} name="util">second copy</script>
    </variables>`),
  );
  const vars = variablesOf(nodeNamed(model, 'subform', 'form1'));

  it('script objects keep their raw text and order, and a duplicate name is kept (the first and the second are both visible to the runtime)', () => {
    expect(vars.scriptObjects.map((o) => o.name)).toEqual(['util', 'LOV', 'LOV2', 'calc', 'empty', 'util']);
    expect(vars.scriptObjects[0]?.text).toBe('function f() { return 1; }');
    expect(vars.scriptObjects[5]?.text).toBe('second copy');
  });

  it('an object whose text starts with <?xml or < (after whitespace) is classified data, never JavaScript (a 500 KB XML string must not be evaluated as code)', () => {
    const kinds = Object.fromEntries(vars.scriptObjects.map((o) => [o.name, o.kind]));
    expect(kinds).toMatchObject({ util: 'javascript', LOV: 'data', LOV2: 'data', empty: 'javascript' });
    expect(vars.scriptObjects[1]?.text.startsWith('<?xml')).toBe(true);
    expect(vars.scriptObjects[2]?.text.trimStart().startsWith('<LOV')).toBe(true);
  });

  it('markup means <?xml or < followed by a letter: an HTML-style comment, a bare < and a number comparison stay JavaScript, a leading BOM and spaces do not hide markup', () => {
    const kindOf = (text: string): string => {
      const m = modelOf(tpl(`<variables><script ${JS} name="o"><![CDATA[${text}]]></script></variables>`));
      return must(variablesOf(nodeNamed(m, 'subform', 'form1')).scriptObjects[0]).kind;
    };
    expect(kindOf('<!-- legacy -->\nfunction f() {}')).toBe('javascript');
    expect(kindOf('< 1')).toBe('javascript');
    expect(kindOf('<1/>')).toBe('javascript');
    expect(kindOf('<')).toBe('javascript');
    expect(kindOf('<?xml version="1.0"?><a/>')).toBe('data');
    expect(kindOf('  \n\uFEFF<LOV/>')).toBe('data');
    expect(kindOf('<x:LOV xmlns:x="u"/>')).toBe('data');
  });

  it('a script without contentType is FormCalc by default and carries the effective content type', () => {
    const calc = must(vars.scriptObjects.find((o) => o.name === 'calc'));
    expect(calc.kind).toBe('formcalc');
    expect(calc.contentType).toBe('application/x-formcalc');
    expect(vars.scriptObjects[0]?.contentType).toBe('application/x-javascript');
  });

  it('text variables expose name and value, an empty one is the empty string', () => {
    expect(vars.textVariables.map((t) => [t.name, t.value])).toEqual([
      ['flag', 'false'],
      ['blank', ''],
    ]);
  });

  it('a manifest lists its refs trimmed and in order (the barcode payload order is the ref order)', () => {
    expect(vars.manifests).toHaveLength(1);
    expect(vars.manifests[0]).toMatchObject({ name: 'barcode1', id: 'abc' });
    expect(vars.manifests[0]?.refs).toEqual(['xfa[0].form[0].form1[0].A[0].dataNode', 'xfa[0].form[0].form1[0].B[0].dataNode']);
  });

  it('every entry points back at its template node, and a container without variables yields empty lists', () => {
    expect(vars.scriptObjects[0]?.node.className).toBe('script');
    expect(vars.textVariables[0]?.node.className).toBe('text');
    expect(vars.manifests[0]?.node.className).toBe('manifest');
    const none = variablesOf(model.root);
    expect([none.scriptObjects, none.textVariables, none.manifests]).toEqual([[], [], []]);
  });
});

describe('events, scripts, calculate', () => {
  const model = modelOf(
    tpl(`<field name="f">
      <event activity="initialize" name="ev1"><script ${JS}>x = 1;</script></event>
      <event activity="ready" ref="$layout"><script ${JS} runAt="server">y</script></event>
      <event activity="change"/>
      <event activity="docReady" ref="$host"><script>Page.F</script></event>
      <calculate override="error"><script ${JS}>z</script></calculate>
    </field>
    <field name="g"><calculate/></field><field name="h"/>`),
  );
  const f = nodeNamed(model, 'field', 'f');

  it('events come back in document order with activity, ref, name and their script (T06 dispatches by activity and ref)', () => {
    const events = eventsOf(f);
    expect(events.map((e) => e.activity)).toEqual(['initialize', 'ready', 'change', 'docReady']);
    expect(events.map((e) => e.ref)).toEqual([undefined, '$layout', undefined, '$host']);
    expect(events[0]?.name).toBe('ev1');
    expect(events[0]?.script?.text).toBe('x = 1;');
    expect(events[2]?.script).toBeUndefined();
    expect(events[0]?.node).toBe(f.children[0]);
  });

  it('runAt defaults to client and a server script is flagged (server scripts must be skipped, not run)', () => {
    const events = eventsOf(f);
    expect(events[0]?.script?.runAt).toBe('client');
    expect(events[1]?.script?.runAt).toBe('server');
  });

  it('scriptOf classifies by effective content type', () => {
    expect(must(eventsOf(f)[0]?.script).kind).toBe('javascript');
    expect(must(eventsOf(f)[3]?.script).kind).toBe('formcalc');
    expect(scriptOf(firstOfClass(model, 'script')).text).toBe('x = 1;');
  });

  it('calculate reports override and script, defaulting override to disabled and script to none', () => {
    expect(calculateOf(f)).toMatchObject({ override: 'error' });
    expect(calculateOf(f)?.script?.text).toBe('z');
    const g = calculateOf(nodeNamed(model, 'field', 'g'));
    expect(g?.override).toBe('disabled');
    expect(g?.script).toBeUndefined();
    expect(calculateOf(nodeNamed(model, 'field', 'h'))).toBeUndefined();
  });

  it('a node with no events yields an empty list', () => {
    expect(eventsOf(nodeNamed(model, 'field', 'h'))).toEqual([]);
  });
});
