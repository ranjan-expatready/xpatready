import { attrWithDefault, getProperty } from './implicit.js';
import type { TemplateNode } from './node.js';
import { scriptOf, type ScriptView } from './scripts.js';

export interface ValidateView {
  readonly node: TemplateNode;
  readonly nullTest: string;
  readonly formatTest: string;
  readonly scriptTest: string;
  /** Message texts by the `name` of their `text` element (`nullTest`, `scriptTest`, `formatTest`; unnamed under ""). Null-prototype record. */
  readonly messages: Readonly<Record<string, string>>;
  readonly script: ScriptView | undefined;
  readonly picture: string | undefined;
}

export interface ValueContent {
  /** The `value` element. */
  readonly node: TemplateNode;
  /** The content element (`text`, `integer`, `date`, `exData`, ...). */
  readonly contentNode: TemplateNode;
  readonly kind: string;
  readonly content: string;
}

export interface ItemsView {
  readonly node: TemplateNode;
  /** True for the hidden list of values that are stored (`save="1"`); false for the list that is shown. */
  readonly save: boolean;
  readonly presence: string;
  /** One entry per item; null for an `xsi:nil` item. */
  readonly values: readonly (string | null)[];
}

export interface BindItemsView {
  readonly node: TemplateNode;
  readonly ref: string;
  readonly labelRef: string;
  readonly valueRef: string;
}

export interface BindView {
  readonly node: TemplateNode;
  /** `once` (the default: implicit binding by name), `none`, `global` or `dataRef`, as written. */
  readonly match: string;
  readonly ref: string;
  readonly picture: string | undefined;
}

const NO_ITEMS: readonly never[] = Object.freeze([]);

/**
 * `validate` of a container, written or implicit (a field, exclGroup or subform without one answers the XFA defaults
 * `nullTest` disabled, `formatTest` warning, `scriptTest` error from the same table as `getProperty`), or undefined
 * for an owner that has no validate property.
 */
export function validateOf(owner: TemplateNode): ValidateView | undefined {
  const node = getProperty(owner, 'validate');
  if (node === undefined) return undefined;
  const messages: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const message of node.childrenOfClass('message')) {
    for (const text of message.childrenOfClass('text')) {
      const name = text.name;
      if (!(name in messages)) messages[name] = text.content;
    }
  }
  const script = node.firstChild('script');
  return {
    node,
    nullTest: attrWithDefault(node, 'nullTest') ?? 'disabled',
    formatTest: attrWithDefault(node, 'formatTest') ?? 'warning',
    scriptTest: attrWithDefault(node, 'scriptTest') ?? 'error',
    messages: Object.freeze(messages),
    script: script === undefined ? undefined : scriptOf(script),
    picture: pictureOf(node),
  };
}

/** The content of `owner`'s `value` child (a field, a draw or a caption), or undefined when it has none. */
export function valueContentOf(owner: TemplateNode | undefined): ValueContent | undefined {
  const node = owner?.firstChild('value');
  const contentNode = node?.oneOfChild;
  if (node === undefined || contentNode === undefined) return undefined;
  return { node, contentNode, kind: contentNode.className, content: contentNode.content };
}

/** The `items` blocks of a field, in document order. */
export function itemsOf(owner: TemplateNode): readonly ItemsView[] {
  const blocks = owner.childrenOfClass('items');
  if (blocks.length === 0) return NO_ITEMS;
  return blocks.map((node) => ({
    node,
    save: node.attr('save') === '1',
    presence: node.attr('presence') ?? 'visible',
    values: node.children.map((item) => (item.nil ? null : item.content)),
  }));
}

/** The `bindItems` of a field. Attributes are returned as written, empty when absent. */
export function bindItemsOf(owner: TemplateNode): readonly BindItemsView[] {
  return owner.childrenOfClass('bindItems').map((node) => ({ node, ref: node.attr('ref') ?? '', labelRef: node.attr('labelRef') ?? '', valueRef: node.attr('valueRef') ?? '' }));
}

/** The text of a `picture` child of `owner` (a `format`, `bind`, `validate` or `ui`), or undefined. */
export function pictureOf(owner: TemplateNode | undefined): string | undefined {
  return owner?.firstChild('picture')?.content;
}

/** The `bind` of a container with `match` defaulted to `once`, or undefined when the container has none. */
export function bindOf(owner: TemplateNode): BindView | undefined {
  const node = owner.firstChild('bind');
  return node === undefined ? undefined : { node, match: node.attr('match') ?? 'once', ref: node.attr('ref') ?? '', picture: pictureOf(node) };
}
