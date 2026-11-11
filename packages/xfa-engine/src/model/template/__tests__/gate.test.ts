import { describe, expect, it } from 'vitest';
import { parseSom } from '../../som/index.js';
import { assertSupported, diagnosticPath, isBareSomReference, loadTemplate, parseTemplate } from '../index.js';
import { expectXfa, firstOfClass, modelOf, must, NS28, tpl } from './helpers.js';

const JS = 'contentType="application/x-javascript"';

/** Each case is a template the engine cannot run faithfully; the gate must name the feature and where it is. */
const REJECTED: readonly (readonly [title: string, xml: string, feature: RegExp, where: RegExp])[] = [
  ['a subformSet (its repeat and ordering rules are not implemented)', tpl(`<subform name="a"><subformSet name="set"><subform name="x"/></subformSet></subform>`), /subformSet/, /form1\.a\.set/],
  ['a repeating subform (occur max 2: data would bind to one instance only)', tpl(`<subform name="rep"><occur min="1" max="2"/></subform>`), /occur/, /form1\.rep/],
  ['an unbounded subform (occur max -1)', tpl(`<subform name="rep"><occur min="0" max="-1"/></subform>`), /occur/, /form1\.rep/],
  ['an optional subform (occur min 0 max 1: it may be absent from the data)', tpl(`<subform name="opt"><occur min="0" max="1"/></subform>`), /occur/, /form1\.opt/],
  ['an occur with only min 3 (max defaults to min, so it repeats)', tpl(`<subform name="rep"><occur min="3"/></subform>`), /occur/, /form1\.rep/],
  ['an occur with initial other than 1 (it would start with several instances)', tpl(`<subform name="rep"><occur min="1" max="1" initial="2"/></subform>`), /occur/, /form1\.rep/],
  ['an occur with initial 0', tpl(`<subform name="rep"><occur initial="0"/></subform>`), /occur/, /form1\.rep/],
  ['a pageArea occur that repeats', tpl(`<pageSet><pageArea name="p"><occur min="1" max="-1"/></pageArea></pageSet>`), /occur/, /form1\.#pageSet\.p/],
  ['an unparsable occur max', tpl(`<subform name="rep"><occur max="many"/></subform>`), /occur/, /form1\.rep/],
  ['a non-empty proto (prototype inheritance is not implemented)', tpl(`<proto><subform name="p"/></proto>`), /proto/, /form1/],
  ['a use reference to a prototype', tpl(`<field name="f" use="#p"/>`), /use/, /form1\.f/],
  ['a usehref reference to another document', tpl(`<field name="f" usehref="other.xdp#p"/>`), /usehref/, /form1\.f/],
  ['an explicit bind ref', tpl(`<field name="f"><bind ref="$record.x"/></field>`), /bind/, /form1\.f/],
  ['a global bind match', tpl(`<field name="f"><bind match="global"/></field>`), /global/, /form1\.f/],
  ['a dataRef bind match', tpl(`<field name="f"><bind match="dataRef" ref="$data.a"/></field>`), /bind/, /form1\.f/],
  ['a FormCalc calculation (default content type) that is not a bare reference', tpl(`<field name="f"><calculate><script>a + b</script></calculate></field>`), /FormCalc/, /form1\.f/],
  ['an explicit FormCalc script with a function call', tpl(`<field name="f"><event activity="click"><script contentType="application/x-formcalc">Concat("a", b)</script></event></field>`), /FormCalc/, /form1\.f/],
  ['a script of an unknown language', tpl(`<field name="f"><event activity="click"><script contentType="text/vbscript">x</script></event></field>`), /contentType/, /form1\.f/],
  ['a typed variable other than text, script and manifest', tpl(`<variables><integer name="n">3</integer></variables>`), /variables/, /form1/],
];

describe('assertSupported rejects what the engine cannot run (A4)', () => {
  it.each(REJECTED)('%s -> UNSUPPORTED_FEATURE naming the feature and its path', (_title, xml, feature, where) => {
    const err = expectXfa(() => assertSupported(modelOf(xml)), 'UNSUPPORTED_FEATURE', feature);
    expect(err.message).toMatch(where);
  });

  it.each(REJECTED)('loadTemplate applies the same gate: %s', (_title, xml, feature) => {
    expectXfa(() => loadTemplate(xml), 'UNSUPPORTED_FEATURE', feature);
  });

  it('parseTemplate builds the same documents without applying the gate (the gate is a separate, explicit step)', () => {
    for (const [, xml] of REJECTED) expect(() => parseTemplate(xml)).not.toThrow();
  });

  it('the first offender in document order is the one reported (a deterministic message across runs)', () => {
    const xml = tpl(`<subform name="first"><occur max="3"/></subform><subform name="second"><subformSet/></subform>`);
    const err = expectXfa(() => assertSupported(modelOf(xml)), 'UNSUPPORTED_FEATURE');
    expect(err.message).toMatch(/occur/);
    expect(err.message).toMatch(/form1\.first/);
    expect(err.message).not.toMatch(/second/);
  });

  it('a same-name sibling is addressed with its index so the path points at the right node', () => {
    const xml = tpl(`<field name="dup"/><field name="dup"><bind match="global"/></field>`);
    expectXfa(() => assertSupported(modelOf(xml)), 'UNSUPPORTED_FEATURE', /form1\.dup\[1\]/);
  });

  it('an unnamed offender is addressed by its class (#subformSet) rather than an empty segment', () => {
    expectXfa(() => assertSupported(modelOf(tpl(`<subformSet/>`))), 'UNSUPPORTED_FEATURE', /form1\.#subformSet/);
  });

  it('a hostile name in the path is escaped and bounded (a megabyte name or a bidi override must not reach logs)', () => {
    const hostile = `a‮${'x'.repeat(5000)}`;
    const err = expectXfa(() => assertSupported(modelOf(tpl(`<subformSet name="${hostile}"/>`))), 'UNSUPPORTED_FEATURE');
    expect(err.message.length).toBeLessThan(1500);
    expect(err.message).not.toContain('‮');
    expect(err.message).toContain('\\u202e');
  });

  it('a path through very deep nesting is bounded to the innermost 16 segments', () => {
    const depth = 200;
    const xml = `<template xmlns="${NS28}">${'<subform name="s">'.repeat(depth)}<subformSet name="leaf"/>${'</subform>'.repeat(depth)}</template>`;
    const err = expectXfa(() => assertSupported(modelOf(xml)), 'UNSUPPORTED_FEATURE', /subformSet/);
    expect(err.message.length).toBeLessThan(1500);
    expect(err.message).toMatch(/\.\.\..*leaf/);
    expect(err.message.split('.').length).toBeLessThan(25);
  });
});

describe('assertSupported accepts what the real forms use', () => {
  const ACCEPTED: readonly (readonly [title: string, xml: string])[] = [
    ['an empty proto and a pageArea occur of exactly one', tpl(`<proto/><pageSet><pageArea name="p"><occur min="1" max="1"/></pageArea></pageSet>`)],
    ['a proto holding only a comment', tpl(`<proto><!-- nothing --></proto>`)],
    ['a subform with no occur, an empty occur, occur max 1 (min defaults to 1), min 1 (max defaults to min) and min, max and initial all 1', tpl(`<subform name="a"/><subform name="b"><occur/></subform><subform name="c"><occur max="1"/></subform><subform name="d"><occur min="1"/></subform><subform name="e"><occur min="1" max="1" initial="1"/></subform><subform name="f"><occur min="01" max=" 1 "/></subform>`)],
    ['a JavaScript script object that starts with an HTML-style comment (it is code, not markup)', tpl(`<variables><script contentType="application/x-javascript" name="lib">&lt;!-- legacy\nfunction f() {}\n</script></variables>`)],
    ['an empty use attribute', tpl(`<field name="f" use="" usehref=""/>`)],
    ['bind match none, once, and an empty ref', tpl(`<field name="a"><bind match="none"/></field><field name="b"><bind match="once"/></field><field name="c"><bind ref=""/></field>`)],
    ['bindItems with a ref (a choice list, not explicit binding)', tpl(`<field name="f"><bindItems ref="xfa.datasets.L.I[*]" labelRef="$" valueRef="lic"/></field>`)],
    ['a bare-reference FormCalc calculation without content type, and with an explicit one', tpl(`<field name="a"><calculate><script>
  Barcodes.PaperFormsBarcode1

</script></calculate></field><field name="b"><calculate><script contentType="application/x-formcalc">Page5.TextField1[*]</script></calculate></field>`)],
    ['an empty FormCalc script', tpl(`<field name="a"><calculate><script/></calculate></field>`)],
    ['server-side scripts of any language (they never run here)', tpl(`<field name="a"><event activity="click"><script runAt="server" contentType="application/x-formcalc">Concat("a", "b")</script></event><event activity="click"><script runAt="server" contentType="text/vbscript">x</script></event></field>`)],
    ['JavaScript scripts, script objects and a data object', tpl(`<variables><script ${JS} name="o">function f() {}</script><script ${JS} name="LOV"><![CDATA[<?xml version="1.0"?><LOV/>]]></script><text name="t">a</text><manifest name="m"><ref>a.b</ref></manifest></variables><field name="f"><event activity="click"><script ${JS}>x = 1;</script></event></field>`)],
  ];

  it.each(ACCEPTED)('%s', (_title, xml) => {
    expect(() => assertSupported(modelOf(xml))).not.toThrow();
    expect(() => loadTemplate(xml)).not.toThrow();
  });

  it.each(['2.0', '2.5', '2.8', '3.0', '3.3', '3.12'])('template namespace version %s is accepted (2.x and 3.x)', (version) => {
    expect(() => loadTemplate(tpl('', `http://www.xfa.org/schema/xfa-template/${version}/`))).not.toThrow();
  });

  it.each([
    'http://www.xfa.org/schema/xfa-template/1.0/',
    'http://www.xfa.org/schema/xfa-template/4.0/',
    'http://www.xfa.org/schema/xfa-template/2.8',
    'http://www.xfa.org/schema/xfa-template/2/',
    'http://www.xfa.org/schema/xfa-template/2.x/',
    'http://www.xfa.org/schema/xfa-template/20.8/',
    'http://www.xfa.org/schema/xfa-data/1.0/',
    'urn:other',
    '',
  ])('template namespace "%s" is refused with the namespace named (an unknown version may change semantics)', (ns) => {
    const xml = ns === '' ? '<template><subform name="form1"/></template>' : tpl('', ns);
    expectXfa(() => loadTemplate(xml), 'UNSUPPORTED_FEATURE', /namespace/i);
  });
});

describe('isBareSomReference (the only FormCalc shape the engine evaluates)', () => {
  it.each([
    'Barcodes.PaperFormsBarcode1',
    'Page5.TextField1[*]',
    'a',
    'a.b.c',
    'a[0].b[12].c',
    '#text',
    'a.#text',
    'a_b.c9',
  ])('"%s" is a bare reference, and the resolver\'s own parser takes it', (text) => {
    expect(isBareSomReference(text)).toBe(true);
    expect(() => parseSom(text)).not.toThrow();
  });

  it.each([
    '',
    ' a',
    'a ',
    'a b',
    'a + b',
    'a.',
    '.a',
    'a..b',
    'a[',
    'a[]',
    'a[1',
    'a[x]',
    'a[0][',
    'a[0]b',
    'f(x)',
    'a.b()',
    '"a"',
    '1',
    'a;b',
    'a.b\nc',
    '$$',
    'a#b',
    '[0]',
    '//c\na',
    // Accepted by an earlier hand-written scanner but refused by the resolver: a form using them loaded and then failed at run time.
    '$',
    '$.rawValue',
    '$record.x',
    '$data.a.b',
    'a[-1]',
    'a[+1]',
    'a.#',
    '*',
    'a.*',
    '!a',
  ])('"%s" is not (anything the SOM parser refuses is refused when the template is loaded)', (text) => {
    expect(isBareSomReference(text)).toBe(false);
    expect(() => parseSom(text)).toThrow();
  });

  // The resolver reads a hyphen as part of a name in a SOM string a JavaScript form passes; in FormCalc it is the minus operator,
  // so `Total-Discount` is a subtraction the engine does not evaluate and must not be run as the field "Total-Discount".
  it.each(['Total-Discount', 'A-B', 'a.b-c', 'a-b.c-9', 'a.#text-x', 'a[0].b-1'])('"%s" is a valid SOM name path but not a bare FormCalc reference (a hyphen is an operator there)', (text) => {
    expect(() => parseSom(text)).not.toThrow();
    expect(isBareSomReference(text)).toBe(false);
  });

  it('a FormCalc script that subtracts is rejected at load as UNSUPPORTED_FEATURE', () => {
    for (const script of ['Total-Discount', 'A-B', 'a.b-c']) {
      const xml = tpl(`<field name="F"><ui><textEdit/></ui><event activity="calculate"><script contentType="application/x-formcalc">${script}</script></event></field>`);
      expectXfa(() => loadTemplate(xml), 'UNSUPPORTED_FEATURE', /FormCalc/);
    }
  });

  it('a script using a grammar the resolver refuses is rejected at load with UNSUPPORTED_FEATURE', () => {
    for (const script of ['$record.x', 'A[-1]', '$']) {
      const xml = tpl(`<field name="F"><ui><textEdit/></ui><event activity="calculate"><script contentType="application/x-formcalc">${script}</script></event></field>`);
      expectXfa(() => loadTemplate(xml), 'UNSUPPORTED_FEATURE', /FormCalc/);
    }
  });

  it('a 2 MB reference-shaped string is decided in linear time (no regex backtracking on hostile script text)', () => {
    const hostile = `${'a.'.repeat(1_000_000)}!`;
    const started = performance.now();
    expect(isBareSomReference(hostile)).toBe(false);
    // Over the SOM expression ceiling, so refused like the resolver would, and still decided in one pass.
    expect(isBareSomReference(`${'a[0].'.repeat(300_000)}a`)).toBe(false);
    expect(isBareSomReference(`${'a.'.repeat(200)}a`)).toBe(true);
    expect(performance.now() - started).toBeLessThan(2000);
  });
});

describe('diagnosticPath', () => {
  it('joins names from the root subform down and uses the class for an unnamed node', () => {
    const model = modelOf(tpl(`<subform name="a"><field name="b"><ui><textEdit/></ui></field></subform>`));
    expect(diagnosticPath(firstOfClass(model, 'textEdit'))).toBe('form1.a.b.#ui.#textEdit');
    expect(diagnosticPath(must(model.root.firstChild('subform')))).toBe('form1');
    expect(diagnosticPath(model.root)).toBe('#template');
  });
});
