import { Node, type Element } from '@xmldom/xmldom';
import { MAX_XML_CHARS } from '../../xml/limits.js';
import { forEachNode } from '../../xml/walk.js';
import { limitExceeded } from './errors.js';
import { MAX_LOADED_CHARS, MAX_LOADED_ELEMENTS } from './limits.js';

/** Extra characters the serializer adds when it writes character `code` as markup (an upper bound). Tab and line breaks are references only inside an attribute. */
function growth(code: number, attribute: boolean): number {
  switch (code) {
    case 38: // &  -> &amp;
      return 4;
    case 34: // "  -> &quot; (attributes only)
      return attribute ? 5 : 0;
    case 60: // <  -> &lt;
    case 62: // >  -> &gt;
      return 3;
    case 13: // carriage return -> &#13; everywhere
      return 4;
    case 9: // tab -> &#9; in attributes
      return attribute ? 3 : 0;
    case 10: // line feed -> &#10; in attributes
      return attribute ? 4 : 0;
    default:
      return 0;
  }
}

/** An upper bound of the serialized length of `text` as element content or (`attribute`) an attribute value. One linear pass. */
export function serializedLength(text: string, attribute = false): number {
  let extra = 0;
  for (let i = 0; i < text.length; i += 1) extra += growth(text.charCodeAt(i), attribute);
  return text.length + extra;
}

/** What creating a data element adds to the serialized datasets, at most: both tags and a group marker. */
export const elementOverhead = (name: string): number => 2 * name.length + 5 + 40;

export interface XmlMeasure {
  /** Elements in the subtree (the root included when it is one). */
  readonly elements: number;
  /** An upper bound of the serialized length: tags, attributes, escaped text. */
  readonly serialized: number;
}

/** Counts the elements of `root` and everything below it and bounds their serialized size. Iterative. */
export function measureXml(root: Node): XmlMeasure {
  let total = 0;
  let elements = 0;
  forEachNode(root, (node) => {
    switch (node.nodeType) {
      case Node.ELEMENT_NODE: {
        const element = node as Element;
        elements += 1;
        total += 2 * element.nodeName.length + 5;
        for (let i = 0; i < element.attributes.length; i += 1) {
          const attr = element.attributes.item(i);
          if (attr !== null) total += attr.name.length + 4 + serializedLength(attr.value, true);
        }
        break;
      }
      case Node.TEXT_NODE:
        total += serializedLength(node.nodeValue ?? '');
        break;
      default:
        total += (node.nodeValue ?? '').length + 16;
    }
  });
  return { elements, serialized: total };
}

/**
 * The work bound of one merge: child elements visited by every index build, rebuild and child read of the merge (and
 * of a `remerge`). Past the ceiling it throws `LIMIT`, so no template and data shape can make the merge cost more than a fixed
 * amount, whatever it multiplies (fields times siblings was the shape that reached minutes).
 */
export class MergeWork {
  readonly #ceiling: number;
  #visits = 0;

  constructor(ceiling: number) {
    this.#ceiling = ceiling;
  }

  visit(children: number): void {
    this.#visits += children;
    if (this.#visits > this.#ceiling) throw limitExceeded(`the merge visited more than ${this.#ceiling} child elements (merge-work ceiling)`);
  }

  get visits(): number {
    return this.#visits;
  }
}

/**
 * The per-run memory bound of the data DOM: text and elements loaded with `loadXML` (charged for good, since each
 * load builds nodes that stay reachable), and the estimated size of the datasets as they would be saved, which must
 * stay re-openable (`MAX_XML_CHARS`). Every charge is checked BEFORE the write it pays for, so a refused write changes
 * nothing. The size is an upper bound, so a write the budget accepts always re-parses.
 */
export class DataBudget {
  #loadedChars = 0;
  #loadedElements = 0;
  #saved: number;

  /** `initialSaved`: the estimated serialized size of the datasets before the run changes them. */
  constructor(initialSaved: number) {
    this.#saved = initialSaved + 256;
  }

  chargeLoadedChars(chars: number): void {
    if (this.#loadedChars + chars > MAX_LOADED_CHARS) throw limitExceeded(`more than ${MAX_LOADED_CHARS} characters loaded with loadXML in one form`);
    this.#loadedChars += chars;
  }

  chargeLoadedElements(elements: number): void {
    if (this.#loadedElements + elements > MAX_LOADED_ELEMENTS) throw limitExceeded(`more than ${MAX_LOADED_ELEMENTS} elements loaded with loadXML in one form`);
    this.#loadedElements += elements;
  }

  /** Charges imported elements and their serialized size together: when either ceiling would be passed it throws `LIMIT` and neither is charged. */
  chargeImported(elements: number, serialized: number): void {
    if (this.#loadedElements + elements > MAX_LOADED_ELEMENTS) throw limitExceeded(`more than ${MAX_LOADED_ELEMENTS} elements loaded with loadXML in one form`);
    this.chargeSaved(serialized);
    this.#loadedElements += elements;
  }

  /** Adds `delta` (negative when text shrinks) to the estimated saved size; past the document ceiling it throws `LIMIT` and adds nothing. */
  chargeSaved(delta: number): void {
    if (this.#saved + delta > MAX_XML_CHARS) throw limitExceeded(`the datasets would hold more than ${MAX_XML_CHARS} characters when saved`);
    this.#saved = Math.max(0, this.#saved + delta);
  }
}
