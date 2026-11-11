import type { FormDom } from '../../../model/form/index.js';
import type { TemplateNode } from '../../../model/template/index.js';
import type { EmbedResolver } from './types.js';

/**
 * The resolver of `xfa:embed="#id"`: the `#id` names the template element whose `id` attribute is `id`, and the embed shows
 * that node's CURRENT value in the form (`raw`: as stored, `formatted`: as its picture shows it). The id index is built once,
 * on first use, from the template (the first element with an id wins); the value is read from the form DOM each time, so a
 * script that changed the field is seen. An id no element carries, or an element the form does not mirror, resolves to
 * `undefined`. A master-page field holds one value here: per-page values belong to W02-T09.
 */
export function createEmbedResolver(dom: FormDom): EmbedResolver {
  let index: Map<string, TemplateNode> | undefined;
  const nodes = (): Map<string, TemplateNode> => {
    if (index === undefined) {
      index = new Map();
      for (const node of dom.model.nodes) {
        const id = node.attr('id');
        if (id !== undefined && id !== '' && !index.has(id)) index.set(id, node);
      }
    }
    return index;
  };
  return (id) => {
    const template = nodes().get(id);
    const node = template === undefined ? undefined : dom.formNodeFor(template);
    if (node === undefined) return undefined;
    const raw = node.rawValue;
    return { raw: raw === null ? '' : String(raw), formatted: node.formattedValue };
  };
}
