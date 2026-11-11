import type { FormDom, FormNode } from '../../model/form/index.js';
import type { TemplateModel } from '../../model/template/index.js';
import { IssueSink } from '../box/issues.js';
import type { LoadedFont } from '../font/catalogue.js';
import { createFontResolver, DEFAULT_TYPEFACE, type FontResolver, type ResolvedFont } from '../font/resolve.js';
import type { TextDeps } from './layout.js';
import { createEmbedResolver } from './rich/embed.js';
import type { EmbedResolver } from './rich/types.js';
import type { TextStyle } from './types.js';

/** An `IssueSink` that records each (node, feature) pair once, so a text laid out twice (a caption measured, then drawn) reports once. */
export class OnceIssueSink extends IssueSink {
  readonly #seen = new Set<string>();

  /** How many (node, feature) pairs are remembered; bounded by `MAX_ISSUES` because nothing is remembered once the sink is full. */
  get tracked(): number {
    return this.#seen.size;
  }

  override add(node: FormNode, feature: string): void {
    if (this.full) {
      super.add(node, feature);
      return;
    }
    const key = `${node.id}\u0000${feature}`;
    if (this.#seen.has(key)) return;
    this.#seen.add(key);
    super.add(node, feature);
  }
}

/** The typeface of every `font` element of the template, in document order: what the font resolver counts to find the most-used typeface. */
export const templateTypefacesOf = (model: TemplateModel): string[] =>
  model.nodes.filter((n) => n.className === 'font').map((n) => n.attr('typeface') ?? DEFAULT_TYPEFACE);

/**
 * What one text layout run shares: the font resolver (so a missing typeface is reported once however often it is used),
 * the memoised resolutions, and the `issues` of the text layer. The issues of the box layer are in its own context; the
 * caller concatenates the two lists.
 */
export class TextContext {
  readonly sink = new OnceIssueSink();
  readonly #resolver: FontResolver;
  readonly #memo = new Map<string, ResolvedFont>();
  /** The node the resolver is working for, so a fallback it raises is reported against the first node that needed it. */
  #asking: FormNode | undefined;

  /** Resolves `xfa:embed` of rich text; undefined when no form is given (every embed is then reported missing). */
  readonly embed: EmbedResolver | undefined;

  constructor(faces: readonly LoadedFont[], templateTypefaces: readonly string[], dom?: FormDom) {
    this.#resolver = createFontResolver(faces, templateTypefaces, (feature) => {
      if (this.#asking !== undefined) this.sink.add(this.#asking, feature);
    });
    this.embed = dom === undefined ? undefined : createEmbedResolver(dom);
  }

  /** The font for `style`, reporting any fallback the resolver took against `node` (the first node that needed it). */
  resolve(node: FormNode, style: TextStyle): ResolvedFont {
    const key = `${style.typeface ?? ''}\u0000${style.weight}\u0000${style.posture}`;
    let found = this.#memo.get(key);
    if (found === undefined) {
      this.#asking = node;
      try {
        found = this.#resolver.resolve(style.typeface, style.weight, style.posture);
      } finally {
        this.#asking = undefined;
      }
      this.#memo.set(key, found);
    }
    return found;
  }

  /** The dependencies `layoutText` needs for text owned by `node`. */
  depsFor(node: FormNode): TextDeps {
    return { resolveFont: (style) => this.resolve(node, style), report: (feature) => this.sink.add(node, feature) };
  }
}

/** A text context over the embedded faces (`loadFonts`) and the typefaces the template names; `dom` lets rich text embed field values. */
export const createTextContext = (faces: readonly LoadedFont[], templateTypefaces: readonly string[], dom?: FormDom): TextContext => new TextContext(faces, templateTypefaces, dom);
