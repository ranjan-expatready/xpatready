/**
 * FD-38 exemption (security invariant): largest XML text `parseXml` accepts, in UTF-16 characters. A denial-of-service
 * ceiling applied before any scan or parse; the largest real packet measured is about 1.7 million characters (a form
 * template), so this leaves roughly nine times that, and no firm or operator has a reason to vary it.
 */
export const MAX_XML_CHARS = 16 * 1024 * 1024;

/**
 * FD-38 exemption (security invariant): most elements in one document. Counted by the pre-scan before the tree is
 * built, so a hostile document cannot allocate millions of nodes. The largest packet in the two real
 * forms measured holds about 12,200 elements (the template); this leaves sixteen times that, and no firm or operator
 * has a reason to vary it.
 */
export const MAX_XML_ELEMENTS = 200_000;

/**
 * FD-38 exemption (security invariant): most nodes of every kind (elements, attributes, text runs, comments, CDATA
 * sections and processing instructions) in one document. Each node costs memory in the tree, so a 16 MiB run of empty comments
 * must be refused before millions of nodes are built. The largest real packet measured (a datasets packet) holds about 28,300
 * nodes counting attributes; this leaves roughly thirty-five times that, and no firm or operator has a reason to vary it.
 */
export const MAX_XML_NODES = 1_000_000;

/**
 * FD-38 exemption (security invariant): deepest element nesting. Later stages walk the tree recursively, so an
 * unbounded depth is a stack overflow; the two real forms measured nest 13 levels, and no firm or operator has a reason to
 * vary it.
 */
export const MAX_XML_DEPTH = 256;

/**
 * FD-38 exemption (security invariant): most attributes (including namespace declarations) on one element. The
 * two real forms measured carry at most 8 on an element; the ceiling stops one tag from holding a hostile attribute list. No firm or operator
 * has a reason to vary it.
 */
export const MAX_XML_ATTRIBUTES = 256;

/**
 * FD-38 exemption (security invariant): longest single attribute value, in characters. The longest value in the two real forms
 * measured is 168 characters; this bounds one value without limiting document text, which is bounded by
 * `MAX_XML_CHARS`. No firm or operator has a reason to vary it.
 */
export const MAX_XML_ATTRIBUTE_CHARS = 1024 * 1024;

/**
 * FD-38 exemption (security invariant): most namespace declarations (`xmlns` and `xmlns:*`) in one document. The
 * serializer's cost grows with elements times the declarations in scope, so an unbounded count turns a modest
 * document into a multi-second serialization. The two real forms measured declare at most 88; no firm or operator has a reason to vary it.
 */
export const MAX_XML_NAMESPACE_DECLARATIONS = 1024;

/** Ceilings applied to one `parseXml` call. A caller may tighten any of them (never loosen: see `parseXml`). */
export interface XmlLimits {
  readonly maxChars: number;
  readonly maxElements: number;
  readonly maxNodes: number;
  readonly maxDepth: number;
  readonly maxAttributes: number;
  readonly maxAttributeChars: number;
  readonly maxNamespaceDeclarations: number;
}

export const DEFAULT_XML_LIMITS: XmlLimits = {
  maxChars: MAX_XML_CHARS,
  maxElements: MAX_XML_ELEMENTS,
  maxNodes: MAX_XML_NODES,
  maxDepth: MAX_XML_DEPTH,
  maxAttributes: MAX_XML_ATTRIBUTES,
  maxAttributeChars: MAX_XML_ATTRIBUTE_CHARS,
  maxNamespaceDeclarations: MAX_XML_NAMESPACE_DECLARATIONS,
};
