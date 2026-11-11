import { firstIllegalXmlChar } from './chars.js';
import type { XmlLimits } from './limits.js';
import { malformedXml, unsupportedXml } from './xml-error.js';

// Sticky patterns: each is tried at one position only, so scanning is linear in the text however hostile it is.
const TAG_NAME = /<([^\s/>=<"'!?&]+)/y;
const ATTRIBUTE = /[ \t\r\n]+([^\s/>=<"'&]+)[ \t\r\n]*=[ \t\r\n]*(?:"([^"]*)"|'([^']*)')/y;
const TAG_END = /[ \t\r\n]*(\/?)>/y;
const CLOSE_TAG = /<\/[^\s/>=<"'!?&]+[ \t\r\n]*>/y;
const DTD_KEYWORD = /^(?:DOCTYPE|ENTITY|ELEMENT|ATTLIST|NOTATION)/i;

function exec(pattern: RegExp, text: string, at: number): RegExpExecArray | null {
  pattern.lastIndex = at;
  return pattern.exec(text);
}

/** Index just past `terminator`, searching from `from`; the construct is unterminated when it is absent. */
function skipPast(text: string, terminator: string, from: number, what: string): number {
  const end = text.indexOf(terminator, from);
  if (end === -1) throw malformedXml(`unterminated ${what}`);
  return end + terminator.length;
}

/** Handles `<!...`: skips comments and CDATA, refuses every declaration. Returns the index to continue from. */
function skipBang(text: string, at: number): number {
  if (text.startsWith('<!--', at)) return skipPast(text, '-->', at + 4, 'comment');
  if (text.startsWith('<![CDATA[', at)) return skipPast(text, ']]>', at + 9, 'CDATA section');
  const keyword = DTD_KEYWORD.exec(text.slice(at + 2, at + 12));
  if (keyword !== null) throw unsupportedXml(`${keyword[0].toUpperCase()} declarations (DTDs and entities) are not accepted`);
  throw malformedXml('unrecognised <! construct');
}

/**
 * Refuses a document before any parser sees it: declarations (DOCTYPE, ENTITY: XXE and entity expansion), characters
 * XML forbids, and every resource ceiling (nodes, elements, depth, attributes, namespace declarations, sizes). It is a
 * tokenizer for tag boundaries only, not a validator: well-formedness is the parser's job, and `verifyDocument`
 * re-checks the built tree so a disagreement between the two cannot slip a document past a ceiling.
 */
export function prescanXml(text: string, limits: XmlLimits): void {
  if (text.length > limits.maxChars) throw malformedXml(`input has ${text.length} characters, over the ${limits.maxChars}-character ceiling`);
  const illegal = firstIllegalXmlChar(text);
  if (illegal !== -1) throw malformedXml(`character U+${text.charCodeAt(illegal).toString(16).toUpperCase().padStart(4, '0')} is not allowed in XML`);

  let depth = 0;
  let elements = 0;
  let nodes = 0;
  let namespaceDeclarations = 0;
  // Every construct that becomes a node counts: an element, an attribute, a comment, a CDATA section, a processing
  // instruction and each run of text between markup. Without this a 16 MiB run of `<!---->` would build millions of nodes.
  const countNode = (): void => {
    nodes += 1;
    if (nodes > limits.maxNodes) throw malformedXml(`more than ${limits.maxNodes} nodes`);
  };
  let textFrom = 0;
  for (let at = text.indexOf('<'); at !== -1; at = text.indexOf('<', at)) {
    if (at > textFrom) countNode();
    const next = text.charCodeAt(at + 1);
    if (next === 0x21 /* ! */) {
      countNode();
      at = skipBang(text, at);
    } else if (next === 0x3f /* ? */) {
      countNode();
      at = skipPast(text, '?>', at + 2, 'processing instruction');
    } else if (next === 0x2f /* / */) {
      if (exec(CLOSE_TAG, text, at) === null) throw malformedXml('invalid closing tag');
      if (depth === 0) throw malformedXml('closing tag with no open element');
      depth -= 1;
      at = CLOSE_TAG.lastIndex;
    } else {
      const name = exec(TAG_NAME, text, at);
      if (name === null) throw malformedXml('invalid start tag');
      countNode();
      elements += 1;
      if (elements > limits.maxElements) throw malformedXml(`more than ${limits.maxElements} elements`);
      let pos = TAG_NAME.lastIndex;
      let attributes = 0;
      for (let attr = exec(ATTRIBUTE, text, pos); attr !== null; attr = exec(ATTRIBUTE, text, pos)) {
        countNode();
        attributes += 1;
        if (attributes > limits.maxAttributes) throw malformedXml(`an element has more than ${limits.maxAttributes} attributes`);
        const value = attr[2] ?? attr[3] ?? '';
        if (value.length > limits.maxAttributeChars) throw malformedXml(`an attribute value is longer than ${limits.maxAttributeChars} characters`);
        const attrName = attr[1] ?? '';
        if (attrName === 'xmlns' || attrName.startsWith('xmlns:')) {
          namespaceDeclarations += 1;
          if (namespaceDeclarations > limits.maxNamespaceDeclarations) throw malformedXml(`more than ${limits.maxNamespaceDeclarations} namespace declarations`);
        }
        pos = ATTRIBUTE.lastIndex;
      }
      const end = exec(TAG_END, text, pos);
      if (end === null) throw malformedXml('invalid start tag');
      // A self-closing element is still a node at depth + 1 that a tree walker visits.
      if (depth + 1 > limits.maxDepth) throw malformedXml(`element depth over the ${limits.maxDepth}-level ceiling`);
      if (end[1] !== '/') depth += 1;
      at = TAG_END.lastIndex;
    }
    textFrom = at;
  }
  if (text.length > textFrom) countNode();
  if (elements === 0) throw malformedXml('no root element');
  if (depth !== 0) throw malformedXml('unclosed element');
}
