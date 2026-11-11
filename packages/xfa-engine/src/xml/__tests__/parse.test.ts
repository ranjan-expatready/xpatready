import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { XfaPdfError } from '../../pdf/errors.js';
import { parseXml } from '../parse.js';
import { countElements, structureOf } from './structure.js';

const XFA_NS = 'http://www.xfa.org/schema/xfa-data/1.0/';

function expectXmlError(run: () => unknown, code: 'MALFORMED_XML' | 'UNSUPPORTED_FEATURE'): XfaPdfError {
  let caught: unknown;
  try {
    run();
  } catch (e) {
    caught = e;
  }
  expect(caught, 'must throw a typed XfaPdfError, not a RangeError/TypeError/ParseError').toBeInstanceOf(XfaPdfError);
  const err = caught as XfaPdfError;
  expect(err.code).toBe(code);
  return err;
}

describe('parseXml (well-formed input)', () => {
  it('parses namespaced elements, attributes, text, CDATA, comments and processing instructions in document order (a dropped node kind would corrupt a datasets round trip)', () => {
    const doc = parseXml(
      `<?formServer defaultPDFRenderFormat acrobat9.0static?><xfa:datasets xmlns:xfa="${XFA_NS}"><xfa:data xfa:dataNode="dataGroup"><a lic="x">t &amp; <![CDATA[<raw>]]><!--c--><?pi body?></a></xfa:data></xfa:datasets>`,
    );
    const root = doc.documentElement;
    expect(root?.nodeName).toBe('xfa:datasets');
    expect(root?.namespaceURI).toBe(XFA_NS);
    expect(countElements(doc)).toBe(3);
    const shape = structureOf(doc);
    expect(shape.kind === 'element' && shape.children[0]).toMatchObject({ kind: 'pi', target: 'formServer' });
  });

  it('drops a leading byte-order mark instead of failing with "content before root" (TextDecoder-free callers can pass raw text)', () => {
    expect(parseXml('\uFEFF<a/>').documentElement?.nodeName).toBe('a');
  });

  it('keeps an XML declaration and tolerates whitespace around the root, as real packets are written with a leading newline', () => {
    const doc = parseXml('\n\n<?xml version="1.0" encoding="UTF-8"?>\n<a>x</a>\n');
    expect(doc.documentElement?.firstChild?.nodeValue).toBe('x');
  });

  it('allows a comment or CDATA section to CONTAIN the text of a DOCTYPE or ENTITY (only a real declaration is rejected, so a form note is not a false positive)', () => {
    const doc = parseXml('<a><!-- <!DOCTYPE x [<!ENTITY y "z">]> --><![CDATA[<!DOCTYPE q>]]><?pi <!ENTITY e "v">?></a>');
    expect(countElements(doc)).toBe(1);
  });

  it('accepts `>` inside attribute values and quoted `<!` text in attributes without miscounting tags (a naive tag scanner would end the tag early)', () => {
    const doc = parseXml('<a k="1 > 0" j=\'x"y\'><b/></a>');
    expect(countElements(doc)).toBe(2);
    expect(doc.documentElement?.getAttribute('k')).toBe('1 > 0');
    expect(doc.documentElement?.getAttribute('j')).toBe('x"y');
  });

  it('accepts exactly the depth, attribute and element ceilings (an off-by-one would reject a legal maximal form)', () => {
    const limits = { maxDepth: 5, maxElements: 6, maxAttributes: 2, maxAttributeChars: 8, maxNamespaceDeclarations: 1 };
    const doc = parseXml('<a k1="12345" k2="1"><b><c><d><e/></d></c></b><f xmlns:p="urn:p"/></a>', { limits });
    expect(countElements(doc)).toBe(6);
  });

  it('non-BMP characters survive intact (surrogate pairs are valid; only LONE surrogates are rejected)', () => {
    const doc = parseXml('<a>\u{1F600}</a>');
    expect(doc.documentElement?.firstChild?.nodeValue).toBe('\u{1F600}');
  });

  it('text produced by the packet decoder from invalid UTF-8 (U+FFFD replacement) parses and keeps the replacement character', () => {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(Uint8Array.from([0x3c, 0x61, 0x3e, 0xff, 0xc3, 0x28, 0x3c, 0x2f, 0x61, 0x3e]));
    expect(text).toContain('\uFFFD');
    expect(parseXml(text).documentElement?.textContent).toBe('\uFFFD\uFFFD(');
  });
});

describe('parseXml (malformed input becomes a typed error)', () => {
  it.each([
    ['unclosed element', '<a><b>'],
    ['mismatched closing tag', '<a><b></a>'],
    ['closing tag with nothing open', '</a>'],
    ['two root elements', '<a/><b/>'],
    ['no root element', '<?pi x?>'],
    ['empty text', ''],
    ['text only', 'hello'],
    ['text after the root', '<a/>junk'],
    ['duplicate attribute', '<a k="1" k="2"/>'],
    ['unbound namespace prefix', '<x:a/>'],
    ['undefined entity reference', '<a>&foo;</a>'],
    ['unescaped < in an attribute value', '<a k="<b>"/>'],
    ['attribute without a value', '<a k/>'],
    ['unquoted attribute value', '<a k=1/>'],
    ['unterminated comment', '<a><!-- never closed </a>'],
    ['unterminated CDATA', '<a><![CDATA[ never closed </a>'],
    ['unterminated processing instruction', '<a><?pi never closed </a>'],
    ['unterminated start tag', '<a b="1"'],
    ['unterminated attribute quote', '<a b="1/>'],
    ['mismatched nesting with balanced tag counts (the pre-scan sees nothing wrong, the parser must)', '<a><b></a></b>'],
  ])('%s -> MALFORMED_XML (never a hang, ParseError or RangeError)', (_title, text) => {
    expectXmlError(() => parseXml(text), 'MALFORMED_XML');
  });

  it('an error that quotes the document is truncated and escaped (a hostile 1 MB tag name must not reach logs whole)', () => {
    const hostile = `<a><${'x'.repeat(1_000_000)}></a>`;
    const err = expectXmlError(() => parseXml(hostile), 'MALFORMED_XML');
    expect(err.message.length).toBeLessThan(400);
    expect(err.message).not.toMatch(/[\u0000-\u001f\u007f]/);
  });

  it('a non-string input is a typed error, not a TypeError from inside the parser', () => {
    expectXmlError(() => parseXml(undefined as unknown as string), 'MALFORMED_XML');
    expectXmlError(() => parseXml(new Uint8Array([60, 97, 47, 62]) as unknown as string), 'MALFORMED_XML');
  });

  it('rejects an options object that tries to RAISE a ceiling above its default (limits may only be tightened); a caller bug surfaces as a ZodError', () => {
    expect(() => parseXml('<a/>', { limits: { maxElements: Number.MAX_SAFE_INTEGER } })).toThrow(ZodError);
    expect(() => parseXml('<a/>', { limits: { maxNodes: Number.MAX_SAFE_INTEGER } })).toThrow(ZodError);
    expect(() => parseXml('<a/>', { limits: { maxElements: 0 } })).toThrow(ZodError);
    expect(() => parseXml('<a/>', { limits: { unknownKnob: 1 } as never })).toThrow(ZodError);
  });
});

describe('parseXml (diagnostics stay useful and bounded)', () => {
  it.each([
    ['<a><b></a></b>', 'mismatched closing tag'],
    ['<a>&foo;</a>', 'undefined entity reference'],
    ['<a k="1" k="2"/>', 'duplicate attribute'],
    ['<a/>junk', 'content after the root element'],
    ['<a k="<b>"/>', 'attribute'],
  ])('%s is described as "%s" instead of echoing the parser text raw', (text, description) => {
    const err = expectXmlError(() => parseXml(text), 'MALFORMED_XML');
    expect(err.message).toContain(description);
  });

  it('the variable part of a described message is truncated (a 1 MB attribute name in a duplicate-attribute error stays short)', () => {
    const name = 'n'.repeat(1_000_000);
    const err = expectXmlError(() => parseXml(`<a ${name}="1" ${name}="2"/>`), 'MALFORMED_XML');
    expect(err.message).toContain('duplicate attribute');
    expect(err.message.length).toBeLessThan(400);
  });
});

describe('parseXml (separator characters are data, not line ends)', () => {
  it('raw U+0085, U+2028 and U+2029 in text are preserved (XML 1.0 folds only CR; the parser default also folds these, silently rewriting form data)', () => {
    const doc = parseXml('<a>x\u0085y\u2028z\u2029w</a>');
    expect(doc.documentElement?.textContent).toBe('x\u0085y\u2028z\u2029w');
  });

  it('raw U+0085, U+2028 and U+2029 in an attribute value are preserved', () => {
    const doc = parseXml('<a k="x\u0085y\u2028z\u2029w"/>');
    expect(doc.documentElement?.getAttribute('k')).toBe('x\u0085y\u2028z\u2029w');
  });

  it('CRLF and a lone CR in text are folded to LF as XML 1.0 section 2.11 requires', () => {
    expect(parseXml('<a>1\r\n2\r3\n4</a>').documentElement?.textContent).toBe('1\n2\n3\n4');
  });
});

describe('parseXml (characters XML 1.0 forbids)', () => {
  it.each([
    ['a raw NUL', '<a>\u0000</a>'],
    ['a raw control character', '<a>\u0001</a>'],
    ['U+FFFE', '<a>\uFFFE</a>'],
    ['a lone high surrogate', '<a>\uD800</a>'],
    ['a lone low surrogate', '<a>\uDC00x</a>'],
    ['a control character in an attribute', '<a k="\u0008"/>'],
    ['a control character through a character reference', '<a>&#1;</a>'],
    ['a NUL through a hex character reference', '<a>&#x0;</a>'],
    ['a lone surrogate through a character reference', '<a>&#xD800;</a>'],
    ['a control character in an attribute through a character reference', '<a k="&#8;"/>'],
  ])('%s -> MALFORMED_XML (it would be silently rewritten when the packet is re-encoded as UTF-8)', (_title, text) => {
    expectXmlError(() => parseXml(text), 'MALFORMED_XML');
  });

  it('tab, newline and carriage return are allowed', () => {
    expect(parseXml('<a>\t\r\n</a>').documentElement?.textContent?.length).toBeGreaterThan(0);
  });
});
