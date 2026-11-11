import type { BoxIssue } from '../box/types.js';
import type { LoadedFont } from '../font/catalogue.js';
import { MAX_FONT_RESOURCES } from '../limits.js';
import type { RenderItem, RenderTree } from '../render-tree.js';
import { FALLBACK_FONT_ID } from '../text/index.js';

type TextItem = Extract<RenderItem, { kind: 'text' }>;
type FontResource = RenderTree['resources']['fonts'][number];

/**
 * FD-38 exemption (correctness constant): the family a run with no font program is drawn in, and its look. The layout
 * measures such text as fixed-pitch Courier (600/1000 em per character, `font/resolve.ts`), so the generic resource must
 * name that family; it is a fact of the measurement, not a setting.
 */
const FALLBACK_FAMILY = 'Courier';

/** The one generic-family resource every fallback run names: no program, so the viewer draws it with its own font of the family. */
const fallbackResource = (): FontResource => ({ id: FALLBACK_FONT_ID, family: FALLBACK_FAMILY, weight: 'normal', posture: 'normal', format: 'truetype', bytes: new Uint8Array(0) });

const toResource = (face: LoadedFont): FontResource => ({ id: face.fontId, family: face.family, weight: face.weight, posture: face.posture, format: face.format, bytes: face.bytes });

/**
 * The font resources of a tree, once: the embedded faces its runs use (in the document's order) and, when any run has no
 * program behind it, the generic fallback. `text` items are the tree's own copies, so a run that names a face the tree
 * cannot carry (past `MAX_FONT_RESOURCES`, or not an embedded face at all) is re-pointed to the fallback, with a note, and
 * the tree always passes its own cross-reference check.
 */
export function fontResources(faces: readonly LoadedFont[], text: readonly TextItem[]): { readonly fonts: FontResource[]; readonly notes: BoxIssue[] } {
  const used = new Set<string>();
  for (const item of text) for (const line of item.lines) for (const run of line.runs) used.add(run.fontId);
  const byId = new Map(faces.map((face) => [face.fontId, face]));
  const embedded = faces.filter((face) => used.has(face.fontId));
  const unknown = [...used].filter((id) => id !== FALLBACK_FONT_ID && !byId.has(id));
  const hasFallback = used.has(FALLBACK_FONT_ID) || unknown.length > 0;
  const over = embedded.length + (hasFallback ? 1 : 0) > MAX_FONT_RESOURCES;
  const kept = over ? embedded.slice(0, MAX_FONT_RESOURCES - 1) : embedded;
  const notes: BoxIssue[] = [];
  const replaced = new Set<string>(unknown);
  if (over) for (const face of embedded.slice(kept.length)) replaced.add(face.fontId);
  if (replaced.size > 0) {
    for (const item of text) for (const line of item.lines) for (const run of line.runs) if (replaced.has(run.fontId)) run.fontId = FALLBACK_FONT_ID;
    notes.push({ som: '', feature: `${replaced.size} font(s) are not in the render tree's resources (over ${MAX_FONT_RESOURCES} fonts, or not an embedded face); their text is drawn in the fallback font` });
  }
  const fonts = kept.map(toResource);
  if (hasFallback || replaced.size > 0) fonts.push(fallbackResource());
  return { fonts, notes };
}
