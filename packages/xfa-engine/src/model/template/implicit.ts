import { freezeNode, TemplateNode, UI_WIDGET_CLASSES } from './node.js';

/**
 * XFA defines a value for every property a template leaves out, and form scripts read them (for example
 * `ui.oneOfChild.border.getElement("edge", 0).color.value` at load). This module answers those reads with frozen
 * default nodes, created on first use and then kept, so a lookup always returns the same object. The template itself
 * is not extended: an implicit node is not in `TemplateModel.nodes` or in its owner's `children`, and it is never
 * written. Every per-run change lives in the form DOM (W01-T03).
 *
 * What is spec and what is not: the attribute defaults below are those of the XFA 3.3 specification
 * (https://pdfa.org/norm-refs/XFA-3_3.pdf): `occur` p.786, `validate` p.880, `corner` radius p.663, `caption`
 * reserve p.643. Materialising a default node on read (so that `field.border.fill.color.value` finds an object) is
 * NOT in the specification; it is the behaviour of Acrobat and pdfium, which the real forms' scripts rely on.
 * The default fill colour is 255,255,255 (the plan card); the specification is not consistent about it (the
 * `color` element page, p.734, and the border/fill overview, p.39, disagree), so this value is a parity choice, not
 * a spec citation. A fill inside a `font` is the text colour and gets no default here.
 *
 * Only what the form scripts reach is modelled: border (four edges, four corners, a fill), caption (with a `value` that
 * holds an empty `text`: a caption the template omits reads as empty text, never as no text), assist, validate and their colour children. Anything else answers undefined, so a misspelt member is reported rather than defaulted.
 */

/**
 * FD-38 exemption (correctness constant): the number of sides of a box, which fixes how many edges and corners a
 * border has in XFA. It is a fact of the format, not a setting.
 */
const BORDER_SIDE_COUNT = 4;

const EDGE_COLOR = '0,0,0';
const FILL_COLOR = '255,255,255';

const defaults = (values: Readonly<Record<string, string>>): ReadonlyMap<string, string> => new Map(Object.entries(values));

/** Attribute defaults by class (XFA 3.x property tables); used both for implicit nodes and for `attrWithDefault`. */
const CLASS_DEFAULTS: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map([
  ['border', defaults({ break: 'close', hand: 'even', presence: 'visible' })],
  ['edge', defaults({ cap: 'square', presence: 'visible', stroke: 'solid', thickness: '0.5pt' })],
  ['corner', defaults({ inverted: '0', join: 'square', presence: 'visible', radius: '0in', stroke: 'solid', thickness: '0.5pt' })],
  ['fill', defaults({ presence: 'visible' })],
  ['caption', defaults({ placement: 'left', presence: 'visible', reserve: '-1' })],
  ['subform', defaults({ presence: 'visible', access: 'open', layout: 'position', anchorType: 'topLeft' })],
  ['field', defaults({ presence: 'visible', access: 'open', anchorType: 'topLeft' })],
  ['exclGroup', defaults({ presence: 'visible', access: 'open', layout: 'position', anchorType: 'topLeft' })],
  ['draw', defaults({ presence: 'visible', anchorType: 'topLeft' })],
  ['validate', defaults({ nullTest: 'disabled', formatTest: 'warning', scriptTest: 'error' })],
  // Layout defaults (W01-T01): the XFA 3.3 property defaults of each element. Checked value-for-value on 2026-10-18
  // against pdf.js `src/core/xfa/template.js` (Apache-2.0), which encodes the specification's defaults: classes Para,
  // Font, Margin, Keep, BreakBefore, Subform, ExclGroup, Field and Draw, zero mismatches. Specification page numbers are
  // still to be added (the XFA 3.3 PDF was not reachable from this session).
  ['para', defaults({ hAlign: 'left', vAlign: 'top', marginLeft: '0pt', marginRight: '0pt', spaceAbove: '0pt', spaceBelow: '0pt', textIndent: '0pt', lineHeight: '0pt' })],
  ['font', defaults({ typeface: 'Courier', size: '10pt', weight: 'normal', posture: 'normal', baselineShift: '0pt', letterSpacing: '0', underline: '0', lineThrough: '0', overline: '0' })],
  ['margin', defaults({ topInset: '0in', rightInset: '0in', bottomInset: '0in', leftInset: '0in' })],
  ['keep', defaults({ intact: 'none', next: 'none', previous: 'none' })],
  ['breakBefore', defaults({ startNew: '0', targetType: 'auto' })],
]);

/** The value an attribute has when the template does not write it, or undefined when the engine models no default. */
export function attrWithDefault(node: TemplateNode, name: string): string | undefined {
  return node.attr(name) ?? CLASS_DEFAULTS.get(node.className)?.get(name);
}

interface Spec {
  readonly className: string;
  readonly attributes: ReadonlyMap<string, string>;
  readonly children: readonly Spec[];
}

function spec(className: string, attributes: Readonly<Record<string, string>> = {}, children: readonly Spec[] = []): Spec {
  return { className, attributes: new Map([...(CLASS_DEFAULTS.get(className) ?? []), ...Object.entries(attributes)]), children };
}

const colorSpec = (value: string): Spec => spec('color', { value });
const edgeSpec = (): Spec => spec('edge', {}, [colorSpec(EDGE_COLOR)]);
const cornerSpec = (): Spec => spec('corner', {}, [colorSpec(EDGE_COLOR)]);
const fillSpec = (): Spec => spec('fill', {}, [colorSpec(FILL_COLOR)]);
/** A caption's `value` property holds an empty default `text`, so `caption.value.resolveNode("#text")` finds one locally (and not a text variable elsewhere in the form). */
const captionValueSpec = (): Spec => spec('value', {}, [spec('text')]);
const borderSpec = (): Spec =>
  spec('border', {}, [
    ...Array.from({ length: BORDER_SIDE_COUNT }, edgeSpec),
    ...Array.from({ length: BORDER_SIDE_COUNT }, cornerSpec),
    fillSpec(),
  ]);

const BORDER_OWNERS: ReadonlySet<string> = new Set(['subform', 'field', 'exclGroup', 'draw', ...UI_WIDGET_CLASSES]);
const CAPTION_OWNERS: ReadonlySet<string> = new Set(['field', 'exclGroup']);
const ASSIST_OWNERS: ReadonlySet<string> = new Set(['subform', 'field', 'exclGroup', 'draw']);
const VALIDATE_OWNERS: ReadonlySet<string> = new Set(['field', 'exclGroup', 'subform']);

/** The default subtree for property `className` of `owner`, or undefined when XFA gives `owner` no such property (as modelled). */
function specFor(owner: TemplateNode, className: string): Spec | undefined {
  const ownerClass = owner.className;
  switch (className) {
    case 'border':
      return BORDER_OWNERS.has(ownerClass) ? borderSpec() : undefined;
    case 'caption':
      return CAPTION_OWNERS.has(ownerClass) ? spec('caption', {}, [captionValueSpec()]) : undefined;
    case 'validate':
      return VALIDATE_OWNERS.has(ownerClass) ? spec('validate') : undefined;
    case 'assist':
      return ASSIST_OWNERS.has(ownerClass) ? spec('assist', {}, [spec('speak'), spec('toolTip')]) : undefined;
    case 'edge':
      return ownerClass === 'border' ? edgeSpec() : undefined;
    case 'corner':
      return ownerClass === 'border' ? cornerSpec() : undefined;
    case 'fill':
      return ownerClass === 'border' ? fillSpec() : undefined;
    case 'color':
      if (ownerClass === 'edge' || ownerClass === 'corner') return colorSpec(EDGE_COLOR);
      // A fill inside a font is the text colour, which has a different default; only a border fill is modelled.
      return ownerClass === 'fill' && owner.parent?.className === 'border' ? colorSpec(FILL_COLOR) : undefined;
    case 'value':
      return ownerClass === 'caption' ? captionValueSpec() : undefined;
    case 'speak':
    case 'toolTip':
      return ownerClass === 'assist' ? spec(className) : undefined;
    default:
      return undefined;
  }
}

function instantiate(from: Spec, parent: TemplateNode, index: number): TemplateNode {
  const children: TemplateNode[] = [];
  const node = new TemplateNode({
    id: -1,
    className: from.className,
    parent,
    index,
    implicit: true,
    nil: false,
    content: '',
    richContent: undefined,
    attributes: [...from.attributes],
    children,
  });
  from.children.forEach((child) => children.push(instantiate(child, node, children.length)));
  freezeNode(node);
  return node;
}

/** Implicit nodes already created, per owner, keyed `className#slot`. */
const CREATED = new WeakMap<TemplateNode, Map<string, TemplateNode>>();

function implicitFor(owner: TemplateNode, className: string, slot: number): TemplateNode | undefined {
  const key = `${className}#${slot}`;
  const known = CREATED.get(owner)?.get(key);
  if (known !== undefined) return known;
  const wanted = specFor(owner, className);
  if (wanted === undefined) return undefined;
  const node = instantiate(wanted, owner, -1);
  const forOwner = CREATED.get(owner) ?? new Map<string, TemplateNode>();
  forOwner.set(key, node);
  CREATED.set(owner, forOwner);
  return node;
}

/**
 * The property `className` of `owner` as XFA scripts see it (`owner.border`, `owner.caption`): the node written in the
 * template if there is one, else the default node, else undefined.
 */
export function getProperty(owner: TemplateNode, className: string): TemplateNode | undefined {
  return owner.firstChild(className) ?? implicitFor(owner, className, 0);
}

/**
 * The `index`-th child of `owner` with class `className` (XFA `getElement`). A written child wins; a border's four
 * edges and four corners that the template leaves out are answered with defaults (not copies of a written one).
 */
export function getElement(owner: TemplateNode, className: string, index: number): TemplateNode | undefined {
  if (!Number.isInteger(index) || index < 0) return undefined;
  const written = owner.childrenOfClass(className)[index];
  if (written !== undefined) return written;
  const isBorderSide = owner.className === 'border' && (className === 'edge' || className === 'corner');
  if (index === 0 || (isBorderSide && index < BORDER_SIDE_COUNT)) return implicitFor(owner, className, index);
  return undefined;
}
