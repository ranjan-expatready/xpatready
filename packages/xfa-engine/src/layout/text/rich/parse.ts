import { Node, type Element } from '@xmldom/xmldom';
import { z } from 'zod';
import { safeText } from '../../../pdf/safe-text.js';
import { parseXml } from '../../../xml/parse.js';
import { XfaLayoutError } from '../../errors.js';
import { MAX_LINES_PER_TEXT, MAX_TEXT_CHARS } from '../../limits.js';
import type { TextStyle } from '../types.js';
import { parseStyleAttribute, type CssDeclaration } from './css.js';
import { LINK_COLOUR, MAX_RICH_ISSUES, MAX_RICH_MARKUP_CHARS } from './limits.js';
import { charStyleSchema, type CharStyle, type RichAtom, type RichDocument, type RichParagraph } from './types.js';

const markupSchema = z.string().max(MAX_RICH_MARKUP_CHARS);

/** The namespace of the `xfa:embed*` attributes of rich text (the datasets-packet namespace). */
const XFA_DATA_NAMESPACE = 'http://www.xfa.org/schema/xfa-data/1.0/';
/** Characters of the wrapper `<r></r>` put around the markup so that several top-level nodes parse. */
const WRAPPER_CHARS = '<r></r>'.length;

const LINE_ENDS = /[\r\n]+/g;
const WHITESPACE = /\s+/g;
const NO_BREAK_SPACES = /\u00a0/g;

interface ParaProps {
  readonly hAlign: RichParagraph['hAlign'];
  readonly marginLeftPt: number;
  readonly textIndentPt: number;
}

/** What an element passes down to its children. */
interface Frame {
  readonly style: number;
  readonly para: ParaProps;
  /** The element's own `xfa-spacerun:yes` (pdf.js reads it from the element that holds the text, not from an ancestor). */
  readonly spaceRun: boolean;
}

interface Pending {
  readonly node: Node;
  readonly frame: Frame;
  /** A marker, not a node: the paragraph opened by an element ends here. */
  readonly closesParagraph?: boolean;
}

/** The `xfa:embed*` attributes of an element; the ones of that name in any other namespace are listed in `foreign` (reported, not read). */
const EMBED_ATTRIBUTES: ReadonlySet<string> = new Set(['embed', 'embedMode', 'embedType']);
function foreignEmbedAttributes(element: Element): string[] {
  const found: string[] = [];
  for (let i = 0; i < element.attributes.length; i += 1) {
    const attribute = element.attributes.item(i);
    if (attribute !== null && EMBED_ATTRIBUTES.has(attribute.localName ?? attribute.name) && attribute.namespaceURI !== XFA_DATA_NAMESPACE) found.push(attribute.name);
  }
  return found;
}

const attributeOf = (element: Element, local: string): string | undefined => {
  for (let i = 0; i < element.attributes.length; i += 1) {
    const attribute = element.attributes.item(i);
    if (attribute?.namespaceURI === XFA_DATA_NAMESPACE && (attribute.localName ?? attribute.name) === local) return attribute.value;
  }
  return undefined;
};

const BLOCKS: ReadonlySet<string> = new Set(['body', 'p']);
const INLINES: ReadonlySet<string> = new Set(['span', 'a', 'br']);

/**
 * Reads the exData XHTML subset (`body p span br a`; CSS `font-size font-weight font-style font-family text-align
 * margin-left text-indent letter-spacing xfa-spacerun xfa-tab-count`; `xfa:embed`) into paragraphs of styled atoms.
 *
 * Origin (PA-4): semantic port of pdf.js v4.10.38 `src/core/xfa/xhtml.js` (Apache-2.0): `XhtmlObject[$onText]` (carriage
 * returns and line feeds are dropped and runs of white space collapse to one space unless the element's own style says
 * `xfa-spacerun:yes`), `XhtmlObject[$pushGlyphs]` (the style cascade and the `font-*`, `letter-spacing` and `margin-*`
 * properties it reads), `P[$pushGlyphs]` (a paragraph ends with a line break in the paragraph's own font) and
 * `Br[$pushGlyphs]` (a line break in the current font). The cascade is container `font`/`para` -> body -> p -> span;
 * `text-align`, `margin-left` and `text-indent` set the paragraph and are reported on a span (they have no effect there).
 *
 * Differences, all from the renderCache oracle or the card: `a` is plain text in the link colour (no navigation); an element outside the
 * subset is reported and its content kept as a transparent container (never dropped); `xfa-tab-count:N` becomes N tab
 * atoms and the placeholder text inside the element is not text; an empty-id or non-`#` embed is reported.
 *
 * Throws `XfaPdfError` (`MALFORMED_XML` or `UNSUPPORTED_FEATURE`, from the safe parser) for malformed markup, a DOCTYPE or
 * an exceeded parser ceiling; the caller catches it per draw. Text past `MAX_TEXT_CHARS` and paragraphs past
 * `MAX_LINES_PER_TEXT` are cut and reported. Iterative, so nesting depth costs no stack.
 */
export function parseRich(markup: string, base: TextStyle, report: (feature: string) => void): RichDocument {
  const checked = markupSchema.safeParse(markup);
  if (!checked.success) throw new XfaLayoutError('INVALID_ARGUMENT', `rich text markup is not a string of at most ${MAX_RICH_MARKUP_CHARS} characters`);
  const text = checked.data;
  const seen = new Set<string>();
  const once = (feature: string): void => {
    if (seen.has(feature)) return;
    if (seen.size >= MAX_RICH_ISSUES) {
      // Past the ceiling nothing more is remembered: one summary entry, however many distinct features follow.
      if (seen.size === MAX_RICH_ISSUES) {
        seen.add('');
        report(`rich: more than ${MAX_RICH_ISSUES} distinct features reported (the rest are not listed)`);
      }
      return;
    }
    seen.add(feature);
    report(feature);
  };
  const document = parseXml(`<r>${text}</r>`, { limits: { maxChars: MAX_RICH_MARKUP_CHARS + WRAPPER_CHARS } });
  const root = document.documentElement;

  const styles: CharStyle[] = [];
  const styleIds = new Map<string, number>();
  const intern = (style: CharStyle): number => {
    const checked = charStyleSchema.safeParse(style);
    if (!checked.success) throw new XfaLayoutError('INVALID_ARGUMENT', `rich text style: ${checked.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    const parsed = checked.data;
    const key = JSON.stringify(parsed);
    let id = styleIds.get(key);
    if (id === undefined) {
      id = styles.length;
      styles.push(parsed);
      styleIds.set(key, id);
    }
    return id;
  };
  const withDeclaration = (parent: number, decl: CssDeclaration, link: boolean): number => {
    const from = styles[parent] as CharStyle;
    return intern({
      ...(decl.typeface !== undefined ? { typeface: decl.typeface } : from.typeface !== undefined ? { typeface: from.typeface } : {}),
      weight: decl.weight ?? from.weight,
      posture: decl.posture ?? from.posture,
      sizePt: decl.fontSizePt ?? from.sizePt,
      letterSpacingPt: decl.letterSpacingPt ?? from.letterSpacingPt,
      colour: link ? [...LINK_COLOUR] : from.colour,
    });
  };
  const baseStyle = intern({
    ...(base.typeface === undefined ? {} : { typeface: base.typeface }),
    weight: base.weight,
    posture: base.posture,
    sizePt: base.sizePt,
    letterSpacingPt: base.letterSpacingPt,
    colour: base.colour,
  });
  const baseFrame: Frame = { style: baseStyle, para: { hAlign: base.hAlign, marginLeftPt: base.marginLeftPt, textIndentPt: base.textIndentPt }, spaceRun: false };

  const paragraphs: RichParagraph[] = [];
  let open: { atoms: RichAtom[]; frame: Frame; explicit: boolean } | undefined;
  let chars = 0;
  let stopped = false;
  const close = (): void => {
    if (open === undefined) return;
    if (paragraphs.length >= MAX_LINES_PER_TEXT) {
      if (!stopped) report(`text has more than ${MAX_LINES_PER_TEXT} lines (cut)`);
      stopped = true;
    } else {
      paragraphs.push({ atoms: open.atoms, style: open.frame.style, ...open.frame.para });
    }
    open = undefined;
  };
  const begin = (frame: Frame, explicit: boolean): void => {
    close();
    open = { atoms: [], frame, explicit };
  };
  const add = (atom: RichAtom, frame: Frame): void => {
    if (open === undefined) begin(frame, false);
    const atoms = (open as { atoms: RichAtom[] }).atoms;
    const last = atoms[atoms.length - 1];
    if (atom.kind === 'text' && last?.kind === 'text' && last.style === atom.style) atoms[atoms.length - 1] = { kind: 'text', text: last.text + atom.text, style: atom.style };
    else atoms.push(atom);
  };
  const spend = (count: number): number => {
    const room = MAX_TEXT_CHARS - chars;
    if (count > room) {
      if (!stopped) report(`text longer than ${MAX_TEXT_CHARS} characters (cut)`);
      stopped = true;
    }
    const taken = Math.max(0, Math.min(count, room));
    chars += taken;
    return taken;
  };

  const pending: Pending[] = [];
  const pushChildren = (node: Node, frame: Frame): void => {
    for (let child = node.lastChild; child !== null; child = child.previousSibling) pending.push({ node: child, frame });
  };
  if (root !== null) pushChildren(root, baseFrame);

  for (let next = pending.pop(); next !== undefined && !stopped; next = pending.pop()) {
    if (next.closesParagraph === true) {
      close();
      continue;
    }
    const { node, frame } = next;
    if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) {
      let data = (node.nodeValue ?? '').replace(LINE_ENDS, '');
      // Preserved spaces are written as no-break spaces (U+00A0); the renderCache runs hold ordinary spaces (both forms, every case).
      data = frame.spaceRun ? data.replace(NO_BREAK_SPACES, ' ') : data.replace(WHITESPACE, ' ');
      // White space between the paragraphs of the body is layout, not text.
      if (data === '' || (open === undefined && data.trim() === '' && !frame.spaceRun)) continue;
      const taken = spend(data.length);
      if (taken > 0) add({ kind: 'text', text: data.slice(0, taken), style: frame.style }, frame);
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const element = node as Element;
    const name = (element.localName ?? element.nodeName).toLowerCase();
    const decl = parseStyleAttribute(element.getAttribute('style') ?? undefined, once);
    const block = BLOCKS.has(name);
    if (!block && !INLINES.has(name)) once(`rich.element.${safeText(name, 40)}`);
    if (!block && (decl.textAlign !== undefined || decl.marginLeftPt !== undefined || decl.textIndentPt !== undefined)) once(`rich.css: text-align, margin-left and text-indent have no effect on <${safeText(name, 40)}>`);
    const para: ParaProps = block
      ? {
          hAlign: decl.textAlign ?? frame.para.hAlign,
          marginLeftPt: decl.marginLeftPt ?? frame.para.marginLeftPt,
          textIndentPt: decl.textIndentPt ?? frame.para.textIndentPt,
        }
      : frame.para;
    const style = withDeclaration(frame.style, decl, name === 'a');
    const own: Frame = { style, para, spaceRun: decl.spaceRun === true };
    const nestedParagraph = name === 'p' && open?.explicit === true;
    if (nestedParagraph) once('rich.element.p inside p (read as a span)');
    if (name === 'p' && !nestedParagraph) {
      begin(own, true);
      pending.push({ node, frame: own, closesParagraph: true });
      pushChildren(node, own);
      continue;
    }
    if (name === 'br') {
      add({ kind: 'break', style }, own);
      chars += 1;
      continue;
    }
    for (const name of foreignEmbedAttributes(element)) once(`rich.embed: attribute ${safeText(name, 40)} is not in the xfa namespace (ignored)`);
    const embedId = attributeOf(element, 'embed');
    if (embedId !== undefined) {
      const mode = attributeOf(element, 'embedMode');
      if (!embedId.startsWith('#') || embedId.length < 2) {
        once(`rich.embed: id is not a #reference (${safeText(embedId, 40)})`);
      } else {
        if (mode !== undefined && mode !== 'raw' && mode !== 'formatted') once(`rich.embed.embedMode: ${safeText(mode, 40)} (read as unset)`);
        add({ kind: 'embed', id: embedId.slice(1), mode: mode === 'raw' || mode === 'formatted' ? mode : undefined, style }, own);
      }
      continue;
    }
    if (decl.tabCount !== undefined) {
      for (let i = 0; i < decl.tabCount && !stopped; i += 1) {
        if (spend(1) > 0) add({ kind: 'tab', style }, own);
      }
      continue;
    }
    pushChildren(node, own);
  }
  close();
  return { styles, paragraphs };
}
