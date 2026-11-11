import { createImageContext, type ImageContext } from '../layout/image/index.js';
import type { LaidOutForm } from '../layout/paginate/index.js';
import type { RenderTree } from '../layout/render-tree.js';
import { buildRenderTree } from '../layout/tree/index.js';
import type { LayoutFonts } from './layout-session.js';

/**
 * The render tree of a runtime's current layout (W02-T12). A `LaidOutForm` is the layout of one DOM revision, so the tree
 * is cached on its identity: asking again with no write in between answers the same object, a write makes a new layout
 * and so a new tree. One image context serves every pass, so an edit re-uses the images it decoded before.
 */
export class RenderTreeCache {
  readonly #fonts: LayoutFonts;
  readonly #images: ImageContext = createImageContext();
  #last: { readonly laid: LaidOutForm; readonly tree: RenderTree } | undefined;
  #builds = 0;

  constructor(fonts: LayoutFonts) {
    this.#fonts = fonts;
  }

  /** How many trees were built (a call that found its tree cached is not one). */
  get builds(): number {
    return this.#builds;
  }

  of(laid: LaidOutForm): RenderTree {
    if (this.#last?.laid === laid) return this.#last.tree;
    this.#last = undefined;
    const tree = buildRenderTree({ laid, faces: this.#fonts.faces, fontIssues: this.#fonts.issues, images: this.#images });
    this.#last = { laid, tree };
    this.#builds += 1;
    return tree;
  }

  /** How many decodes the image context holds (the decoded pictures a disposed runtime must not keep). */
  get cachedImages(): number {
    return this.#images.cached;
  }

  /** Frees the tree and the decoded images (the larger part of what a disposed runtime still holds). */
  release(): void {
    this.#last = undefined;
    this.#images.release();
  }
}
