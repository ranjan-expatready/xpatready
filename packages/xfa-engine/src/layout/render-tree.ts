import { z } from 'zod';
import {
  MAX_FIELD_ITEMS,
  MAX_FONT_BYTES,
  MAX_FONT_RESOURCES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_RESOURCES,
  MAX_ISSUES,
  MAX_ITEMS_PER_PAGE,
  MAX_LINES_PER_TEXT,
  MAX_PAGES,
  MAX_RUNS_PER_LINE,
  MAX_SHORT_TEXT_CHARS,
  MAX_TEXT_CHARS,
} from './limits.js';

/**
 * The render tree: what the layout hands a viewer. Every length is in points, from the top-left corner of its page, y
 * growing downward; every colour is an integer `[r, g, b]` triple. All objects are strict (an unknown key is a
 * contract drift, not data), and every list has a ceiling (see `limits.ts`), so a tree can be parsed at a process
 * boundary without trusting its producer. The tree is JSON-safe except the `bytes` of the resources, which are
 * `Uint8Array` and travel by structured clone, and a consumer must COPY or clone them, never transfer (detach) them: they
 * are shared with the engine's font memo and image cache (W02-T12).
 *
 * Version 2 (W02-T12, before any consumer pinned a version): the image item's `aspect` gained `none` and lost the briefly
 * held `clip` after version 1 was set, the field item gained `checked`, and a font resource with no bytes names a generic
 * family (see `fontResourceSchema`).
 *
 * E11 changed which VALUE a field item's `access` holds (the effective access, not the field's own) without changing the schema: the
 * field already allowed all four values and no consumer pinned the old reading, so the version stays 2 (a version moves with the schema).
 */
export const RENDER_TREE_VERSION = 2;

const length = z.number();
const size = z.number().min(0);
const positiveSize = z.number().gt(0);
const shortText = z.string().min(1).max(MAX_SHORT_TEXT_CHARS);
const longText = z.string().max(MAX_TEXT_CHARS);
const channel = z.number().int().min(0).max(255);
export const colourSchema = z.tuple([channel, channel, channel]);

const rectSchema = z.strictObject({ xPt: length, yPt: length, widthPt: size, heightPt: size });

/** XFA `edge`/`line` stroke styles. */
export const strokeSchema = z.enum(['solid', 'dashDot', 'dashDotDot', 'dashed', 'dotted', 'embossed', 'etched', 'lowered', 'raised']);

export const edgeSideSchema = z.enum(['top', 'right', 'bottom', 'left']);
export const cornerSideSchema = z.enum(['topLeft', 'topRight', 'bottomRight', 'bottomLeft']);

const edgeSchema = z.strictObject({
  side: edgeSideSchema,
  thicknessPt: size,
  colour: colourSchema,
  stroke: strokeSchema,
});

const cornerSchema = z.strictObject({
  corner: cornerSideSchema,
  radiusPt: size,
  inverted: z.boolean(),
  join: z.enum(['square', 'round']),
});

const boxSchema = z.strictObject({
  kind: z.literal('box'),
  rect: rectSchema,
  fill: colourSchema.optional(),
  edges: z.array(edgeSchema).max(4).optional(),
  corners: z.array(cornerSchema).max(4).optional(),
});

const runSchema = z.strictObject({
  text: longText,
  fontId: shortText,
  sizePt: positiveSize,
  colour: colourSchema,
  letterSpacingPt: length.optional(),
});

/** `xPt` is the left end of the line and `yBaselinePt` its baseline, both on the page. */
const lineOfTextSchema = z.strictObject({ xPt: length, yBaselinePt: length, runs: z.array(runSchema).max(MAX_RUNS_PER_LINE) });

const textSchema = z.strictObject({ kind: z.literal('text'), rect: rectSchema, lines: z.array(lineOfTextSchema).max(MAX_LINES_PER_TEXT) });

const lineSchema = z.strictObject({
  kind: z.literal('line'),
  x1Pt: length,
  y1Pt: length,
  x2Pt: length,
  y2Pt: length,
  thicknessPt: size,
  colour: colourSchema,
  stroke: strokeSchema,
});

/**
 * `rect` is the final rectangle the picture is drawn in, already inside the draw's content region and placed by `aspect`
 * and the draw's `para` (W02-T11): the viewer stretches the image to it and needs nothing else. `aspect` records the
 * template's value for information only.
 */
const imageSchema = z.strictObject({
  kind: z.literal('image'),
  imageId: shortText,
  rect: rectSchema,
  aspect: z.enum(['fit', 'actual', 'height', 'none', 'width']),
});

/** The classes a `ui` may hold (mirrors `UI_WIDGET_CLASSES`; a test holds the two together). */
export const WIDGET_KINDS = [
  'textEdit',
  'numericEdit',
  'passwordEdit',
  'choiceList',
  'checkButton',
  'dateTimeEdit',
  'button',
  'barcode',
  'signature',
  'imageEdit',
  'defaultUi',
] as const;

/** The schema of one widget kind (also what the tree builder checks a field's `ui` class against). */
export const widgetKindSchema = z.enum(WIDGET_KINDS);

/** The `access` values of a field (XFA 3.3). */
export const accessSchema = z.enum(['open', 'nonInteractive', 'protected', 'readOnly']);

/**
 * The interactive overlay of one drawn field (W02-T12 makes one per drawn field; a field that is not drawn has none). `som` is
 * the canonical SOM the runtime's `setValue` / `event` take. `rect` is the field's box and `contentRect` where the control
 * goes: the text interior of a text-like widget (where the engine laid its text), the check square of a check button, else the
 * widget region. `value` is the RAW stored value; what the field shows when it is not being edited is its `text` item.
 * `access` is the effective access: the field's own, made at least as restrictive as every ancestor's (E11; nonInteractive over protected over readOnly over open). `items` is a choice list's stored values with their labels; `checked` and `mark` are a check
 * button's state and the mark it shows when on.
 */
const fieldSchema = z.strictObject({
  kind: z.literal('field'),
  som: shortText,
  widget: widgetKindSchema,
  rect: rectSchema,
  contentRect: rectSchema,
  access: accessSchema,
  presence: z.enum(['visible', 'hidden', 'invisible', 'inactive']),
  value: longText,
  items: z.array(z.strictObject({ value: longText, label: longText })).max(MAX_FIELD_ITEMS).optional(),
  maxChars: z.number().int().min(1).optional(),
  multiLine: z.boolean().optional(),
  ariaLabel: longText.optional(),
  mark: z.enum(['check', 'circle', 'cross', 'diamond', 'square', 'star']).optional(),
  /** A check button or radio button only: true when the field holds its "on" value. `mark` is the mark it shows then. */
  checked: z.boolean().optional(),
});

const placeholderSchema = z.strictObject({ kind: z.literal('placeholder'), rect: rectSchema, reason: shortText });

export const itemSchema = z.discriminatedUnion('kind', [boxSchema, textSchema, lineSchema, imageSchema, fieldSchema, placeholderSchema]);

const pageSchema = z.strictObject({
  index: z.number().int().min(0),
  widthPt: positiveSize,
  heightPt: positiveSize,
  items: z.array(itemSchema).max(MAX_ITEMS_PER_PAGE),
});

const bytesOf = (max: number): z.ZodType<Uint8Array> =>
  z.instanceof(Uint8Array).refine((bytes) => bytes.length <= max, { message: `more than ${max} bytes` });

/**
 * An embedded font program, or, when `bytes` is empty, a generic family: the text of a typeface the document embeds no
 * program for (`fallback:Courier`, fixed pitch at 600/1000 em) names such a resource, and the viewer draws it with its own
 * font of that family (`family`, then its generic fixed-pitch font).
 */
const fontResourceSchema = z.strictObject({
  id: shortText,
  family: shortText,
  weight: z.enum(['normal', 'bold']),
  posture: z.enum(['normal', 'italic']),
  format: z.enum(['opentype', 'truetype']),
  bytes: bytesOf(MAX_FONT_BYTES),
});

const imageResourceSchema = z
  .strictObject({
    id: shortText,
    /** `rgba`: decoded, 4 bytes per pixel, row-major from the top. `jpeg`: the original JPEG stream. */
    format: z.enum(['rgba', 'jpeg']),
    widthPx: z.number().int().min(1),
    heightPx: z.number().int().min(1),
    bytes: bytesOf(MAX_IMAGE_BYTES),
  })
  .refine((image) => image.format !== 'rgba' || image.bytes.length === image.widthPx * image.heightPx * 4, {
    message: 'an rgba image must hold width x height x 4 bytes',
  });

const issueSchema = z.strictObject({ som: z.string().max(MAX_SHORT_TEXT_CHARS), feature: shortText });

const hasDuplicates = (ids: readonly string[]): boolean => new Set(ids).size !== ids.length;

interface ReferenceView {
  readonly pages: readonly { readonly items: readonly z.infer<typeof itemSchema>[] }[];
  readonly resources: { readonly fonts: readonly { readonly id: string }[]; readonly images: readonly { readonly id: string }[] };
}

/** Cross-references: unique resource ids, and every run and image item names a resource the tree holds. */
function checkReferences(tree: ReferenceView, ctx: z.RefinementCtx): void {
  const fontIds = tree.resources.fonts.map((font) => font.id);
  const imageIds = tree.resources.images.map((image) => image.id);
  if (hasDuplicates(fontIds) || hasDuplicates(imageIds)) ctx.addIssue({ code: 'custom', message: 'duplicate resource id' });
  const fonts = new Set(fontIds);
  const images = new Set(imageIds);
  for (const page of tree.pages) {
    for (const item of page.items) {
      if (item.kind === 'image' && !images.has(item.imageId)) ctx.addIssue({ code: 'custom', message: 'an image item names an image the resources do not hold' });
      if (item.kind === 'text' && item.lines.some((line) => line.runs.some((run) => !fonts.has(run.fontId)))) {
        ctx.addIssue({ code: 'custom', message: 'a text run names a font the resources do not hold' });
      }
    }
  }
}

export const renderTreeSchema = z
  .strictObject({
    version: z.literal(RENDER_TREE_VERSION),
    pages: z.array(pageSchema).max(MAX_PAGES),
    resources: z.strictObject({
      fonts: z.array(fontResourceSchema).max(MAX_FONT_RESOURCES),
      images: z.array(imageResourceSchema).max(MAX_IMAGE_RESOURCES),
    }),
    /** Layout features met but not supported, or fallbacks taken: the layout's equivalent of the runtime's `unsupported` log. */
    issues: z.array(issueSchema).max(MAX_ISSUES),
  })
  .superRefine(checkReferences);

export type RenderTree = z.infer<typeof renderTreeSchema>;
export type RenderItem = z.infer<typeof itemSchema>;
export type RenderPage = RenderTree['pages'][number];
