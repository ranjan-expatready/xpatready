import type { FormNode } from '../model/form/index.js';

/** The master page (`pageArea`) a node sits on, the node itself included; undefined for a node of the body of the form. */
export const masterPageOf = (node: FormNode): FormNode | undefined => {
  for (let up: FormNode | null = node; up !== null; up = up.parent) if (up.className === 'pageArea') return up;
  return undefined;
};
