/** Attribute name/value pairs of one element, in document order, with namespace declarations already removed. */
export type AttributeEntries = readonly (readonly [name: string, value: string])[];

export interface TemplateNodeInit {
  readonly id: number;
  readonly className: string;
  readonly parent: TemplateNode | null;
  readonly index: number;
  readonly implicit: boolean;
  readonly nil: boolean;
  readonly content: string;
  readonly richContent: string | undefined;
  readonly attributes: AttributeEntries;
  /** The `renderCache.*` processing instructions written directly in this element, as `target-suffix data` strings; omitted means none. */
  readonly renderCache?: readonly string[];
  /** The child list. The builder appends to this array while it builds, then freezes it together with the node. */
  readonly children: TemplateNode[];
}

/** The widget classes that can be the single child of a `ui`. */
export const UI_WIDGET_CLASSES: ReadonlySet<string> = new Set([
  'textEdit', 'numericEdit', 'passwordEdit', 'choiceList', 'checkButton', 'dateTimeEdit', 'button', 'barcode', 'signature', 'imageEdit', 'defaultUi',
]);

/** Classes whose single child is "the one of" a choice (XFA `oneOfChild`): the widget of a `ui`, the content of a `value`, the kind of a `fill`. */
const ONE_OF_CLASSES: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['ui', UI_WIDGET_CLASSES],
  ['value', new Set(['text', 'integer', 'decimal', 'float', 'boolean', 'date', 'time', 'dateTime', 'exData', 'image', 'line', 'rectangle', 'arc'])],
  ['fill', new Set(['solid', 'linear', 'radial', 'pattern', 'stipple'])],
]);

const NO_ATTRIBUTES: ReadonlyMap<string, string> = new Map();
const NO_NODES: readonly never[] = Object.freeze([]);
const NO_PIS: readonly string[] = Object.freeze([]);

/**
 * One element of an XFA template, immutable once the model is built. The class name is the element's local name
 * (`subform`, `field`, `text`, ...); the XFA namespace and comments are not kept, and elements from other namespaces
 * (the XHTML inside `exData`) are not nodes. Of the processing instructions only the `renderCache.*` ones are kept, as
 * raw strings on `renderCache`. Identity is stable: a lookup always returns the same object, so later stages can key maps on a node. The template is never written after the build; per-run
 * changes live in the form DOM (W01-T03), which wraps template nodes and owns the only write path.
 */
export class TemplateNode {
  /** Position in `TemplateModel.nodes` (document order), or -1 for an implicit property node, which is not listed there. */
  readonly id: number;
  readonly className: string;
  readonly parent: TemplateNode | null;
  /** Position in `parent.children`, or -1 for an implicit property node that its owner does not list. */
  readonly index: number;
  /** True for a default property node created on demand (see `getProperty`); false for every node written in the template. */
  readonly implicit: boolean;
  /** True for an element marked `xsi:nil="true"` (a null item, distinct from an empty one). */
  readonly nil: boolean;
  /** Text content: the element's own text for a leaf, a plain-text projection of the markup for `exData` (rich text), empty otherwise. */
  readonly content: string;
  /** For `exData` only: the exact serialized markup inside it (XHTML). Undefined on every other class. */
  readonly richContent: string | undefined;
  /** The `name` attribute, or the empty string. */
  readonly name: string;
  readonly children: readonly TemplateNode[];
  /**
   * The processing instructions `<?renderCache.NAME data?>` written directly in this element, in document order, each as
   * `NAME data` (the `renderCache.` prefix removed). They are the renderer's own cached measurements of the node; the
   * layout reads them only to check its results (see `layout/render-cache.ts`). Empty for almost every node. Frozen.
   */
  readonly renderCache: readonly string[];
  readonly #attributes: ReadonlyMap<string, string>;
  readonly #attributeNames: readonly string[];
  // Built on first lookup; private fields stay writable on a frozen instance.
  #byName: ReadonlyMap<string, readonly TemplateNode[]> | undefined;
  #byClass: ReadonlyMap<string, readonly TemplateNode[]> | undefined;

  constructor(init: TemplateNodeInit) {
    this.id = init.id;
    this.className = init.className;
    this.parent = init.parent;
    this.index = init.index;
    this.implicit = init.implicit;
    this.nil = init.nil;
    this.content = init.content;
    this.richContent = init.richContent;
    this.children = init.children;
    this.renderCache = init.renderCache === undefined || init.renderCache.length === 0 ? NO_PIS : Object.freeze([...init.renderCache]);
    this.#attributes = init.attributes.length === 0 ? NO_ATTRIBUTES : new Map(init.attributes);
    this.#attributeNames = Object.freeze(init.attributes.map(([name]) => name));
    this.name = this.#attributes.get('name') ?? '';
  }

  /** The attribute's value as written, or undefined. */
  attr(name: string): string | undefined {
    return this.#attributes.get(name);
  }

  /** Attribute names in document order (qualified, as written). The list is frozen. */
  attributeNames(): readonly string[] {
    return this.#attributeNames;
  }

  /** Children with this `name`, in document order (never undefined). */
  namedChildren(name: string): readonly TemplateNode[] {
    this.#byName ??= this.#index((child) => child.name, false);
    return this.#byName.get(name) ?? NO_NODES;
  }

  /** Children of this class, in document order (never undefined). */
  childrenOfClass(className: string): readonly TemplateNode[] {
    this.#byClass ??= this.#index((child) => child.className, true);
    return this.#byClass.get(className) ?? NO_NODES;
  }

  firstChild(className: string): TemplateNode | undefined {
    return this.childrenOfClass(className)[0];
  }

  /** The single child that XFA calls `oneOfChild` for this class (see `ONE_OF_CLASSES`), or undefined when none is written. */
  get oneOfChild(): TemplateNode | undefined {
    const choices = ONE_OF_CLASSES.get(this.className);
    return choices === undefined ? undefined : this.children.find((child) => choices.has(child.className));
  }

  #index(keyOf: (child: TemplateNode) => string, keepUnnamed: boolean): ReadonlyMap<string, readonly TemplateNode[]> {
    const groups = new Map<string, TemplateNode[]>();
    for (const child of this.children) {
      const key = keyOf(child);
      if (key === '' && !keepUnnamed) continue;
      const group = groups.get(key);
      if (group === undefined) groups.set(key, [child]);
      else group.push(child);
    }
    for (const group of groups.values()) Object.freeze(group);
    return groups;
  }
}

/** Freezes a finished node and its child list. Called by the builder once the whole tree exists. */
export function freezeNode(node: TemplateNode): void {
  Object.freeze(node.children);
  Object.freeze(node);
}

/** Classes that merge with data, own a name scope and appear in the form: the XFA "containers" (plus the layout containers). */
const CONTAINER_CLASSES: ReadonlySet<string> = new Set(['subform', 'field', 'exclGroup', 'draw', 'area', 'pageSet', 'pageArea', 'contentArea']);

/** True for a container node (see `CONTAINER_CLASSES`); false for property and value nodes such as `ui`, `value`, `caption` or `text`. */
export function isContainer(node: TemplateNode): boolean {
  return CONTAINER_CLASSES.has(node.className);
}
