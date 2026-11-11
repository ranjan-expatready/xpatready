import { DOMParser, type Document } from '@xmldom/xmldom';
import { z } from 'zod';
import { XfaPdfError } from '../pdf/errors.js';
import { DEFAULT_XML_LIMITS, type XmlLimits } from './limits.js';
import { prescanXml } from './prescan.js';
import { verifyDocument } from './verify.js';
import { describeParserMessage, malformedXml, messageOf } from './xml-error.js';

const LEADING_NOISE = /^\uFEFF?[ \t\r\n]*/;

const textSchema = z.string({ error: 'XML input must be a string' });

/** A caller may only tighten a ceiling: the bounds below are the defaults, so the schema rejects a larger value. */
const ceiling = (max: number): z.ZodOptional<z.ZodInt> => z.int().min(1).max(max).optional();

const optionsSchema = z
  .strictObject({
    limits: z
      .strictObject({
        maxChars: ceiling(DEFAULT_XML_LIMITS.maxChars),
        maxElements: ceiling(DEFAULT_XML_LIMITS.maxElements),
        maxNodes: ceiling(DEFAULT_XML_LIMITS.maxNodes),
        maxDepth: ceiling(DEFAULT_XML_LIMITS.maxDepth),
        maxAttributes: ceiling(DEFAULT_XML_LIMITS.maxAttributes),
        maxAttributeChars: ceiling(DEFAULT_XML_LIMITS.maxAttributeChars),
        maxNamespaceDeclarations: ceiling(DEFAULT_XML_LIMITS.maxNamespaceDeclarations),
      })
      .optional(),
  })
  .optional();

export interface ParseXmlOptions {
  /** Tightens any ceiling for this call (for tests and stricter callers); a value above the default is rejected. */
  readonly limits?: Partial<XmlLimits>;
}

function resolveLimits(options: ParseXmlOptions | undefined): XmlLimits {
  // A ZodError here is a bug in the calling code (the options are not document content), so it is not wrapped.
  const given = optionsSchema.parse(options)?.limits;
  return {
    maxChars: given?.maxChars ?? DEFAULT_XML_LIMITS.maxChars,
    maxElements: given?.maxElements ?? DEFAULT_XML_LIMITS.maxElements,
    maxNodes: given?.maxNodes ?? DEFAULT_XML_LIMITS.maxNodes,
    maxDepth: given?.maxDepth ?? DEFAULT_XML_LIMITS.maxDepth,
    maxAttributes: given?.maxAttributes ?? DEFAULT_XML_LIMITS.maxAttributes,
    maxAttributeChars: given?.maxAttributeChars ?? DEFAULT_XML_LIMITS.maxAttributeChars,
    maxNamespaceDeclarations: given?.maxNamespaceDeclarations ?? DEFAULT_XML_LIMITS.maxNamespaceDeclarations,
  };
}

/**
 * Parses one XML document into a mutable DOM. Every failure is an `XfaPdfError`: `UNSUPPORTED_FEATURE` for a DOCTYPE or
 * entity declaration (refused before the parser runs), `MALFORMED_XML` for anything else, including a ceiling
 * exceeded, a character XML forbids, or a parser `error`/`fatalError` (warnings are ignored). A document never
 * produces a `RangeError` or the parser's own error type, and the work is linear in the input length. The one
 * exception is `options`: an invalid options object is a bug in the calling code and throws a `ZodError`.
 */
export function parseXml(text: string, options?: ParseXmlOptions): Document {
  const checked = textSchema.safeParse(text);
  if (!checked.success) throw malformedXml(checked.error.issues.map((i) => i.message).join('; '));
  const limits = resolveLimits(options);
  // A byte-order mark and whitespace before the root carry no content; an XML declaration must start the text, and
  // real packets are written with a leading newline, so strip both rather than reject a declaration after them.
  const source = checked.data.replace(LEADING_NOISE, '');

  prescanXml(source, limits);

  let first: XfaPdfError | undefined;
  const parser = new DOMParser({
    // Nothing reads source positions, so do not pay for them on every node.
    locator: false,
    // XML 1.0 section 2.11 folds only CR and CRLF to LF; the parser default also folds U+0085, U+2028 and U+2029, which would
    // silently rewrite form data.
    normalizeLineEndings: (value) => value.replace(/\r\n?/g, '\n'),
    onError: (level, message) => {
      if (level === 'warning') return;
      first ??= malformedXml(describeParserMessage(message));
      throw first;
    },
  });
  let doc: Document;
  try {
    doc = parser.parseFromString(source, 'text/xml');
  } catch (e) {
    throw first ?? malformedXml(describeParserMessage(messageOf(e)), { cause: e });
  }
  verifyDocument(doc, limits);
  return doc;
}
