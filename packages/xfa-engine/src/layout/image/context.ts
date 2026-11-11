import { bytesToHex } from '@noble/hashes/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';
import type { FormNode } from '../../model/form/index.js';
import { enumAttr } from '../box/attributes.js';
import { guarded } from '../box/border.js';
import type { BoxIssue, LayoutBox } from '../box/types.js';
import { safeText } from '../../pdf/safe-text.js';
import { MAX_IMAGE_RESOURCES } from '../limits.js';
import type { RenderItem, RenderTree } from '../render-tree.js';
import { OnceIssueSink } from '../text/context.js';
import { hAlignSchema, vAlignSchema } from '../text/types.js';
import { aspectSchema, naturalSizeOf, placeImage, type Aspect, type HorizontalPlacement } from './aspect.js';
import { decodeBase64 } from './base64.js';
import { costOf, decodeImage } from './decode.js';
import { overLimit, XfaImageError } from './errors.js';
import { DEFAULT_IMAGE_LIMITS, MAX_IMAGE_TEXT_MEMO, type ImageLimits } from './limits.js';
import type { DecodedImage } from './types.js';

export type ImageResource = RenderTree['resources']['images'][number];
type ImageItem = Extract<RenderItem, { kind: 'image' }>;
type PlaceholderItem = Extract<RenderItem, { kind: 'placeholder' }>;

type Entry = { readonly ok: true; readonly image: DecodedImage } | { readonly ok: false; readonly error: XfaImageError };

/** The `image` element a draw or field shows: its `value`'s one child, when that is an image. */
const imageOf = (node: FormNode): FormNode | undefined => {
  const content = node.childrenOfClass('value')[0]?.oneOfChild;
  return content?.className === 'image' ? content : undefined;
};

const hasText = (text: string | undefined): text is string => text !== undefined && text.trim() !== '';

/** Anything the decoders did not foresee (in practice an allocation failure) becomes a `limit` failure of this one image, with the cause kept; `limit` failures are never cached. */
function decodeIsolated(raw: Uint8Array, limits: ImageLimits, remainingBytes: number): DecodedImage {
  try {
    return decodeImage(raw, limits, remainingBytes);
  } catch (error) {
    if (error instanceof XfaImageError) throw error;
    throw new XfaImageError('limit', 'image decoding ran out of memory or failed unexpectedly', { cause: error });
  }
}

/**
 * Turns the images of a laid-out form into render-tree items and resources (PA-5): decodes each image once under the
 * ceilings of `limits`, deduplicates identical files by content hash, and isolates every failure to the one image
 * (a `placeholder` item and an `issues` entry, never an exception).
 *
 * One context serves many layout passes of one form: `startPass` begins a pass, keeps what the previous pass used (so
 * a re-layout after an edit does not decode again) and drops the rest. The decoded-byte ceiling counts the images used in
 * the current pass; the cache holds at most the previous and the current pass. The `bytes` of a resource are shared with the
 * cache: a consumer must not transfer (detach) them.
 *
 * Not fetched, ever: an image with an `href` is refused with an issue (the engine has no network).
 */
export class ImageContext {
  readonly #limits: ImageLimits;
  readonly #cache = new Map<string, Entry>();
  #touched = new Set<string>();
  #used = new Map<string, DecodedImage>();
  #usedBytes = 0;
  #sink = new OnceIssueSink();
  readonly #idOfText = new Map<string, string>();
  #memoChars = 0;

  constructor(limits: ImageLimits = DEFAULT_IMAGE_LIMITS) {
    this.#limits = limits;
  }

  /** Begins a layout pass: the resources and issues of the new tree start empty; cached decodes the last pass touched are kept. */
  startPass(): void {
    for (const key of this.#cache.keys()) if (!this.#touched.has(key)) this.#cache.delete(key);
    for (const [text, id] of this.#idOfText) {
      if (this.#touched.has(id)) continue;
      this.#idOfText.delete(text);
      this.#memoChars -= text.length;
    }
    this.#touched = new Set();
    this.#used = new Map();
    this.#usedBytes = 0;
    this.#sink = new OnceIssueSink();
  }

  /** Drops every decode and the current pass: what a disposed runtime must not keep. The context can be used again (the next pass decodes afresh). */
  release(): void {
    this.#cache.clear();
    this.#idOfText.clear();
    this.#memoChars = 0;
    this.#touched = new Set();
    this.#used = new Map();
    this.#usedBytes = 0;
    this.#sink = new OnceIssueSink();
  }

  /** How many decodes (pictures and remembered failures) the context holds; bounded by the previous and the current pass. */
  get cached(): number {
    return this.#cache.size;
  }

  /** The image resources of this pass, in order of first use, for `RenderTree.resources.images`. */
  get resources(): readonly ImageResource[] {
    return [...this.#used].map(([id, image]) => ({ id, format: image.format, widthPx: image.widthPx, heightPx: image.heightPx, bytes: image.bytes }));
  }

  /** What this pass could not do for an image, for `RenderTree.issues`. */
  get issues(): readonly BoxIssue[] {
    return this.#sink.issues;
  }

  /** How many issues of this pass were not kept because the list was full (they are counted in the tree's last issue). */
  get dropped(): number {
    return this.#sink.dropped;
  }

  /**
   * The render-tree item for the image of a drawn box, in the frame of `box`: an `image` item, or a `placeholder` over the
   * same region with an issue when the image cannot be drawn. `undefined` for a box that is not drawn or shows no image.
   */
  draw(box: LayoutBox): ImageItem | PlaceholderItem | undefined {
    const image = imageOf(box.node);
    if (image === undefined || !box.drawn) return undefined;
    const region = box.widgetRect;
    const refuse = (feature: string, reason: string): PlaceholderItem => {
      this.#sink.add(box.node, feature);
      return { kind: 'placeholder', rect: region, reason };
    };
    if (box.node.className !== 'draw') return refuse('image in a field (imageEdit): not drawn', 'image in a field is not drawn');
    if (hasText(image.attr('href')) || hasText(image.attr('usehref'))) return refuse('image href: external images are never fetched', 'external image is never fetched');
    const encoding = image.attr('transferEncoding')?.trim();
    if (encoding !== undefined && encoding !== '' && encoding !== 'base64') return refuse(`image transferEncoding ${safeText(encoding)}: only base64 is read`, 'image encoding is not read');
    if (!(region.widthPt > 0 && region.heightPt > 0)) return refuse('image region has no area', 'image region has no area');
    let resolved: { readonly id: string; readonly image: DecodedImage };
    try {
      resolved = this.#acquire(image.nodeValue);
    } catch (error) {
      if (!(error instanceof XfaImageError)) throw error;
      return refuse(`image ${error.reason}: ${error.message}`, `image not drawn (${error.reason})`);
    }
    const aspect = guarded<Aspect>(image, this.#sink, 'image aspect', () => enumAttr(image, 'aspect', aspectSchema, 'fit'), 'fit');
    const rect = placeImage(region, naturalSizeOf(resolved.image.widthPx, resolved.image.heightPx, resolved.image.dpiX, resolved.image.dpiY), aspect, ...this.#alignmentOf(box.node));
    return { kind: 'image', imageId: resolved.id, rect, aspect };
  }

  /** `para hAlign` / `vAlign` of the draw, as the placement the image can take (`justify`, `justifyAll`, `radix` are left, reported). */
  #alignmentOf(node: FormNode): readonly [HorizontalPlacement, 'top' | 'middle' | 'bottom'] {
    const para = node.childrenOfClass('para')[0];
    if (para === undefined) return ['left', 'top'];
    const h = guarded(para, this.#sink, 'para hAlign', () => enumAttr(para, 'hAlign', hAlignSchema, 'left'), 'left');
    const v = guarded(para, this.#sink, 'para vAlign', () => enumAttr(para, 'vAlign', vAlignSchema, 'top'), 'top');
    if (h !== 'left' && h !== 'center' && h !== 'right') this.#sink.add(node, `para hAlign ${h}: an image is placed at the left`);
    return [h === 'center' || h === 'right' ? h : 'left', v];
  }

  /**
   * The decoded image for the base64 text of an `image` element: from the cache, or decoded now; counted against this
   * pass's ceilings. An image the form may not hold (past the distinct-image ceiling) is refused as soon as its id is
   * known, before it is touched, decoded or cached.
   */
  #acquire(text: string): { readonly id: string; readonly image: DecodedImage } {
    let raw: Uint8Array | undefined;
    let id = this.#idOfText.get(text);
    if (id === undefined || !this.#cache.has(id)) {
      raw = decodeBase64(text, this.#limits);
      id = `sha256:${bytesToHex(sha256(raw))}`;
    }
    if (!this.#used.has(id) && this.#used.size >= MAX_IMAGE_RESOURCES) throw overLimit(`form uses more than ${MAX_IMAGE_RESOURCES} distinct images`);
    this.#touched.add(id);
    let entry = this.#cache.get(id);
    if (entry === undefined) {
      try {
        entry = { ok: true, image: decodeIsolated(raw ?? decodeBase64(text, this.#limits), this.#limits, this.#limits.maxTotalBytes - this.#usedBytes) };
      } catch (error) {
        if (!(error instanceof XfaImageError)) throw error;
        // A `limit` failure may come from the bytes this pass has already used, so it is not remembered; the others are facts about the file.
        if (error.reason === 'limit') throw error;
        entry = { ok: false, error };
      }
      this.#cache.set(id, entry);
    }
    if (!entry.ok) throw entry.error;
    if (!this.#used.has(id)) {
      const cost = costOf(entry.image);
      if (this.#usedBytes + cost > this.#limits.maxTotalBytes) throw overLimit(`images of this form would hold more than ${this.#limits.maxTotalBytes} bytes`);
      this.#used.set(id, entry.image);
      this.#usedBytes += cost;
    }
    this.#remember(text, id);
    return { id, image: entry.image };
  }

  /** Remembers which image a text is, within `MAX_IMAGE_TEXT_MEMO` texts and `maxBase64Chars` characters in all, so an unchanged text is not decoded and hashed again. */
  #remember(text: string, id: string): void {
    if (this.#idOfText.has(text) || this.#idOfText.size >= MAX_IMAGE_TEXT_MEMO || this.#memoChars + text.length > this.#limits.maxBase64Chars) return;
    this.#idOfText.set(text, id);
    this.#memoChars += text.length;
  }
}

export const createImageContext = (limits: ImageLimits = DEFAULT_IMAGE_LIMITS): ImageContext => new ImageContext(limits);
