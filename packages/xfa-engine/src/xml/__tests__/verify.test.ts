import { DOMParser } from '@xmldom/xmldom';
import { describe, expect, it } from 'vitest';
import { XfaPdfError } from '../../pdf/errors.js';
import { DEFAULT_XML_LIMITS } from '../limits.js';
import { verifyDocument } from '../verify.js';

/** Builds a DOM with xmldom directly, bypassing parseXml's pre-scan, to prove verifyDocument stands on its own. */
const rawParse = (text: string) => new DOMParser({ onError: () => undefined }).parseFromString(text, 'text/xml');

function codeOf(run: () => void): string | undefined {
  try {
    run();
  } catch (e) {
    return e instanceof XfaPdfError ? e.code : `untyped ${String(e)}`;
  }
  return undefined;
}

describe('verifyDocument (the post-parse check that backs up the pre-scan)', () => {
  it('refuses a DOCTYPE node even when the pre-scan never saw it (a tokenizer disagreement must not let a DTD through)', () => {
    const doc = rawParse('<!DOCTYPE a [<!ENTITY x "y">]><a/>');
    expect(codeOf(() => verifyDocument(doc, DEFAULT_XML_LIMITS))).toBe('UNSUPPORTED_FEATURE');
  });

  it('enforces the element, depth and attribute ceilings on the built tree', () => {
    const doc = rawParse('<a k="1" j="2"><b><c/><c/></b></a>');
    expect(codeOf(() => verifyDocument(doc, DEFAULT_XML_LIMITS))).toBeUndefined();
    expect(codeOf(() => verifyDocument(doc, { ...DEFAULT_XML_LIMITS, maxElements: 3 }))).toBe('MALFORMED_XML');
    expect(codeOf(() => verifyDocument(doc, { ...DEFAULT_XML_LIMITS, maxDepth: 2 }))).toBe('MALFORMED_XML');
    expect(codeOf(() => verifyDocument(doc, { ...DEFAULT_XML_LIMITS, maxAttributes: 1 }))).toBe('MALFORMED_XML');
    expect(codeOf(() => verifyDocument(doc, { ...DEFAULT_XML_LIMITS, maxDepth: 3 }))).toBeUndefined();
  });

  it('enforces the total node ceiling on the built tree (elements, text, comments, PIs and CDATA all count)', () => {
    const doc = rawParse('<a>t<!--c--><?p x?><![CDATA[d]]><b/></a>');
    expect(codeOf(() => verifyDocument(doc, { ...DEFAULT_XML_LIMITS, maxNodes: 6 }))).toBeUndefined();
    expect(codeOf(() => verifyDocument(doc, { ...DEFAULT_XML_LIMITS, maxNodes: 5 }))).toBe('MALFORMED_XML');
  });

  it('counts every attribute as a node (a tree of attribute-heavy elements is as costly as one of comments)', () => {
    const doc = rawParse('<a k="1" j="2"><b l="3"/></a>');
    expect(codeOf(() => verifyDocument(doc, { ...DEFAULT_XML_LIMITS, maxNodes: 5 }))).toBeUndefined();
    expect(codeOf(() => verifyDocument(doc, { ...DEFAULT_XML_LIMITS, maxNodes: 4 }))).toBe('MALFORMED_XML');
  });

  it('walks a 100,000-level tree without recursion (the walk is iterative, so depth cannot overflow the stack before the ceiling is reported)', () => {
    const doc = rawParse('<a>'.repeat(100_000) + '</a>'.repeat(100_000));
    expect(codeOf(() => verifyDocument(doc, DEFAULT_XML_LIMITS))).toBe('MALFORMED_XML');
  });
});
