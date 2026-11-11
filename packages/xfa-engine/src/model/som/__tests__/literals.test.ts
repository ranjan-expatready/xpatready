import { describe, expect, it } from 'vitest';
import { loadTemplate } from '../../template/index.js';
import { tpl } from '../../template/__tests__/helpers.js';
import { extractSomCalls, somCallsIn } from './literals.js';

const JS = 'contentType="application/x-javascript"';

describe('the acorn oracle that extracts SOM calls from form scripts', () => {
  it('finds literal and computed arguments, nested in functions and conditions, with their receivers, in source order', () => {
    const calls = somCallsIn(`
      function f(o, p) {
        if (o) { return xfa.resolveNode("Page1.A[1]"); }
        var list = o.caption.value.resolveNodes('#items[*]');
        return xfa.resolveNode("a" + p) || p.ui.resolveNode(p);
      }`);
    expect(calls.map((c) => [c.method, c.receiver, c.literal, c.argument])).toEqual([
      ['resolveNode', 'xfa', 'Page1.A[1]', '"Page1.A[1]"'],
      ['resolveNodes', 'o.caption.value', '#items[*]', "'#items[*]'"],
      ['resolveNode', 'xfa', undefined, '"a" + p'],
      ['resolveNode', 'p.ui', undefined, 'p'],
    ]);
  });

  it('ignores other methods, computed member access and a string that merely contains the call', () => {
    expect(somCallsIn(`var s = "xfa.resolveNode('x')"; xfa['resolveNode']('y'); xfa.resolve('z'); // xfa.resolveNode("c")`)).toEqual([]);
  });

  it('collects events, calculate, validate and variables scripts with their owner and origin, skips FormCalc and data objects, and flags server-only scripts', () => {
    const model = loadTemplate(
      tpl(`<variables>
          <script ${JS} name="lib">function g() { return xfa.resolveNode("V.One"); }</script>
          <script ${JS} name="LOV"><![CDATA[<?xml version="1.0"?><L><X>xfa.resolveNode("not code")</X></L>]]></script>
        </variables>
        <field name="F"><ui><textEdit/></ui>
          <event activity="click"><script ${JS}>xfa.resolveNode("C.One");</script></event>
          <event activity="initialize" ><script ${JS} runAt="server">xfa.resolveNode("S.One");</script></event>
          <calculate><script ${JS}>xfa.resolveNode("K.One");</script></calculate>
          <validate><script ${JS}>xfa.resolveNode("D.One");</script></validate>
        </field>
        <field name="G"><ui><textEdit/></ui><event activity="exit"><script>Page.Field</script></event></field>`),
    );
    const calls = extractSomCalls(model);
    expect(calls.map((c) => [c.owner.name, c.origin, c.literal, c.serverOnly])).toEqual([
      ['form1', 'variables:lib', 'V.One', false],
      ['F', 'event:click', 'C.One', false],
      ['F', 'event:initialize', 'S.One', true],
      ['F', 'calculate', 'K.One', false],
      ['F', 'validate', 'D.One', false],
    ]);
  });
});
