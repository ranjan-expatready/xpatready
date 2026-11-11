import type { RenderTree } from '../../src/layout/render-tree.js';

type Stroke = RenderTree['pages'][number]['items'][number] extends infer I ? (I extends { kind: 'line'; stroke: infer S } ? S : never) : never;

export interface DumpOptions {
  /** The engine's public stroke rule (`dashArrayOf`). */
  readonly dashArrayOf: (stroke: Stroke, thicknessPt: number) => readonly number[];
  /** Label -> text rows for the index page. */
  readonly args: Readonly<Record<string, string>>;
}
export interface DumpFile {
  readonly file: string;
  readonly html: string;
}
export function esc(value: unknown): string;
export function pngOfRgba(widthPx: number, heightPx: number, rgba: Uint8Array): Uint8Array;
export function imageDataUrl(image: RenderTree['resources']['images'][number]): string;
export function renderPageHtml(tree: RenderTree, pageIndex: number, ctx: Pick<DumpOptions, 'dashArrayOf'>): string;
export function renderIndexHtml(tree: RenderTree, args: DumpOptions['args']): string;
export function renderDump(tree: RenderTree, options: DumpOptions): readonly DumpFile[];
export function isDumpFile(name: string): boolean;
export function outDirAllowed(outDir: string, repoRoot: string | null, separator?: string): boolean;
