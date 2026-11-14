// PF-0p (rows rev 16): the document render port (contracts §0.3: docxtemplater, in-process; FO-5 builds the real
// adapter). A template key and plain data in, a document's bytes out. This folder imports only zod and its own files.
import { z } from "zod";

export const TemplateKey = z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/, "a dotted lower-case template key").max(100);
/** The data a template reads: plain JSON. */
export const RenderData = z.record(z.string(), z.json());
export type RenderData = z.infer<typeof RenderData>;

export type RenderedDocument = { bytes: Uint8Array; contentType: string };

export interface DocumentRenderPort {
  /** Renders `templateKey` with `data`. Throws on an unknown template or data the template cannot take. */
  render(templateKey: string, data: RenderData): Promise<RenderedDocument>;
}

/** Plain JSON with object keys sorted, so the same data always gives the same text. */
export function stableJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stableJson((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

/** The fake: deterministic bytes (the same key and data always give the same bytes, whatever the key order), a text
 *  document naming the template and its data. `templates` limits the known keys; `failOn` forces a failure. */
export function fakeRender(opts: { templates?: string[]; contentType?: string; failOn?: (templateKey: string, data: RenderData) => boolean } = {}): DocumentRenderPort & { readonly calls: ReadonlyArray<{ templateKey: string; data: RenderData }> } {
  const calls: { templateKey: string; data: RenderData }[] = [];
  return {
    async render(templateKey, data) {
      const k = TemplateKey.parse(templateKey), d = RenderData.parse(data);
      if (opts.templates && !opts.templates.includes(k)) throw new Error(`unknown template ${k}`);
      if (opts.failOn?.(k, d)) throw new Error(`forced render failure: ${k}`);
      calls.push({ templateKey: k, data: structuredClone(d) });
      return { bytes: new TextEncoder().encode(`FAKE DOCUMENT\ntemplate: ${k}\ndata: ${stableJson(d)}\n`), contentType: opts.contentType ?? "text/plain; charset=utf-8" };
    },
    get calls() { return [...calls]; },
  };
}
