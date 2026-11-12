import type { LayoutBox } from '../box/types.js';
import type { PagedLayout } from './types.js';

/**
 * The geometry of a paginated form as a list of numbers: for each page its page area, size and content areas, and for each
 * placed box (depth first) its node, rectangle, whether it is drawn and how many children it has. Two paginations of the
 * same form with the same list put every box in the same place on the same page. Text is left out on purpose: a value that
 * changes what a box SAYS but not where anything sits is not a re-layout (the box layout is deterministic, so equal
 * inputs give equal floats and the lists compare exactly).
 */
export function geometryOf(paged: PagedLayout): readonly number[] {
  const out: number[] = [paged.pages.length];
  for (const page of paged.pages) {
    out.push(page.pageArea?.id ?? -1, page.widthPt, page.heightPt, page.contentAreas.length);
    for (const area of page.contentAreas) {
      out.push(area.node?.id ?? -1, area.rect.xPt, area.rect.yPt, area.rect.widthPt, area.rect.heightPt, area.boxes.length);
      const pending: LayoutBox[] = [...area.boxes].reverse();
      for (let box = pending.pop(); box !== undefined; box = pending.pop()) {
        out.push(box.node.id, box.rect.xPt, box.rect.yPt, box.rect.widthPt, box.rect.heightPt, box.drawn ? 1 : 0, box.children.length);
        for (let i = box.children.length - 1; i >= 0; i -= 1) {
          const child = box.children[i];
          if (child !== undefined) pending.push(child);
        }
      }
    }
  }
  return out;
}

/** True when two paginations of a form have the same geometry (see `geometryOf`). */
export function sameGeometry(a: PagedLayout, b: PagedLayout): boolean {
  const left = geometryOf(a);
  const right = geometryOf(b);
  return left.length === right.length && left.every((value, i) => value === right[i]);
}
