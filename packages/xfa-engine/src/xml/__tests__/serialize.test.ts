import { describe, expect, it } from 'vitest';
import { buildXfaPdf, packet } from '../../__tests__/fixtures/build-xfa-pdf.js';
import { XfaPdfError } from '../../pdf/errors.js';
import { openXfaPdf } from '../../xfa-pdf.js';
import { parseXml } from '../parse.js';
import { serializeXml } from '../serialize.js';
import { structureOf } from './structure.js';

const XFA_NS = 'http://www.xfa.org/schema/xfa-data/1.0/';

/** Datasets shaped like a real packet: root with a declared prefix, a data group, a list-of-values node and a PI. */
const DATASETS = `\n<?formServer defaultPDFRenderFormat acrobat9.0static?><xfa:datasets xmlns:xfa="${XFA_NS}"><LOVFile><lic>x</lic></LOVFile><xfa:data><form1 xfa:dataNode="dataGroup"><Name>A &amp; B &lt;c&gt;</Name><Note><![CDATA[<raw & text>]]></Note><!-- keep --><Empty/><Gap>  </Gap></form1></xfa:data></xfa:datasets>\n`;

describe('serializeXml', () => {
  it('output re-parses to a structurally equal document (A2: a serializer that dropped or reordered a node kind would corrupt saved form data)', () => {
    const before = parseXml(DATASETS);
    const after = parseXml(serializeXml(before));
    expect(structureOf(after)).toEqual(structureOf(before));
  });

  it('keeps characters that need escaping intact in text and attribute values, including tab, newline and quote characters in attributes (attribute-value normalisation would silently rewrite them)', () => {
    const doc = parseXml('<a k="x&quot;y&apos;z&amp;&lt;&gt;&#9;&#10;&#13;end">t&#13;&gt;]]&gt;</a>');
    const again = parseXml(serializeXml(doc));
    expect(again.documentElement?.getAttribute('k')).toBe(doc.documentElement?.getAttribute('k'));
    expect(again.documentElement?.textContent).toBe(doc.documentElement?.textContent);
    expect(structureOf(again)).toEqual(structureOf(doc));
  });

  it('serialization is stable: serialize(parse(serialize(parse(t)))) equals serialize(parse(t)) (a writer that kept growing namespace declarations would grow the packet on every save)', () => {
    const once = serializeXml(parseXml(DATASETS));
    const twice = serializeXml(parseXml(once));
    expect(twice).toBe(once);
  });

  it('keeps default and prefixed namespace declarations, with elements in the right namespaces after a round trip', () => {
    const text = '<t xmlns="urn:default" xmlns:p="urn:p"><p:c p:k="1"/><d xmlns="urn:other"/></t>';
    const after = parseXml(serializeXml(parseXml(text)));
    const root = after.documentElement;
    expect(root?.namespaceURI).toBe('urn:default');
    expect(root?.firstChild?.namespaceURI).toBe('urn:p');
    expect(root?.lastChild?.namespaceURI).toBe('urn:other');
  });

  it('keeps non-BMP text and the placement of top-level comments and processing instructions around the root', () => {
    const text = '<?xml version="1.0" encoding="UTF-8"?><!--before--><?pi a b?><r>\u{1F600}</r><!--after-->';
    const after = parseXml(serializeXml(parseXml(text)));
    expect(structureOf(after)).toEqual(structureOf(parseXml(text)));
  });

  it('serializes a single element on its own (T02+ serialize subtrees, not only whole documents)', () => {
    const doc = parseXml('<r><a k="1">x</a></r>');
    const a = doc.documentElement?.firstChild;
    if (a === null || a === undefined) throw new Error('fixture');
    expect(serializeXml(a)).toBe('<a k="1">x</a>');
  });

  it('reflects an edit made to the DOM (the whole point of a mutable data DOM)', () => {
    const doc = parseXml(DATASETS);
    const name = doc.getElementsByTagName('Name').item(0);
    if (name === null) throw new Error('fixture');
    name.textContent = 'Edited <&>';
    const reparsed = parseXml(serializeXml(doc));
    expect(reparsed.getElementsByTagName('Name').item(0)?.textContent).toBe('Edited <&>');
  });

  it('a structural comparison notices a real difference (the walker used by these tests is not vacuous)', () => {
    const a = structureOf(parseXml('<r><a k="1">x</a><!--c--></r>'));
    expect(structureOf(parseXml('<r><a k="1">x</a><!--c--></r>'))).toEqual(a);
    for (const other of ['<r><a k="2">x</a><!--c--></r>', '<r><a k="1">y</a><!--c--></r>', '<r><a k="1">x</a><!--d--></r>', '<r><b k="1">x</b><!--c--></r>', '<r><a k="1">x</a></r>', '<r xmlns="urn:n"><a k="1">x</a><!--c--></r>', '<r><a k="1">x</a><?c?></r>']) {
      expect(structureOf(parseXml(other)), other).not.toEqual(a);
    }
  });

  it('character references to separators (&#x2028; &#x85; &#x2029;) round-trip structurally in text and in an attribute (A2: the parser default would have rewritten them)', () => {
    const doc = parseXml('<a k="p&#x2028;q&#x85;r&#x2029;s">t&#x2028;u&#x85;v&#x2029;w</a>');
    expect(doc.documentElement?.textContent).toBe('t\u2028u\u0085v\u2029w');
    const again = parseXml(serializeXml(doc));
    expect(again.documentElement?.getAttribute('k')).toBe('p\u2028q\u0085r\u2029s');
    expect(again.documentElement?.textContent).toBe('t\u2028u\u0085v\u2029w');
    expect(structureOf(again)).toEqual(structureOf(doc));
  });

  it('a carriage return in text survives the round trip as a character reference (serializing it raw would fold it to a line feed on reload)', () => {
    const doc = parseXml('<a>x&#13;&#10;y</a>');
    expect(doc.documentElement?.textContent).toBe('x\r\ny');
    const again = parseXml(serializeXml(doc));
    expect(again.documentElement?.textContent).toBe('x\r\ny');
  });

  it('a DOM mutated to hold a character XML forbids is refused at serialization, not written out (the packet would not re-parse)', () => {
    const doc = parseXml('<a>t</a>');
    const text = doc.documentElement?.firstChild;
    if (text === null || text === undefined) throw new Error('fixture');
    text.nodeValue = 'bad\u0001value';
    let caught: unknown;
    try {
      serializeXml(doc);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(XfaPdfError);
    expect((caught as XfaPdfError).code).toBe('MALFORMED_XML');
    doc.documentElement?.setAttribute('k', 'bad\u0008');
    text.nodeValue = 'fine';
    expect(() => serializeXml(doc)).toThrow(XfaPdfError);
  });

  it('a node that cannot be serialized is a typed error, not a raw DOM exception', () => {
    expect(() => serializeXml(undefined as never)).toThrow(XfaPdfError);
  });
});

describe('datasets round trip through Plan 1 withPacket (A2)', () => {
  it('edited datasets written with withPacket and re-opened parse to the same structure as the edited DOM, and the other packets are untouched', async () => {
    const pdf = await openXfaPdf(
      buildXfaPdf({
        packets: [packet('template', '<template xmlns="urn:x"><field name="f"/></template>', true), packet('datasets', DATASETS), packet('</xdp:xdp>', '\n')],
      }),
    );
    const doc = parseXml(pdf.packet('datasets').text());
    const name = doc.getElementsByTagName('Name').item(0);
    if (name === null) throw new Error('fixture');
    name.textContent = 'Changed \u540D\u524D';

    const written = await pdf.withPacket('datasets', new TextEncoder().encode(serializeXml(doc)));
    const reopened = await openXfaPdf(written);
    const reparsed = parseXml(reopened.packet('datasets').text());
    expect(structureOf(reparsed)).toEqual(structureOf(doc));
    expect(reparsed.getElementsByTagName('Name').item(0)?.textContent).toBe('Changed \u540D\u524D');
    expect(reopened.packet('template').text()).toBe(pdf.packet('template').text());
  });
});
