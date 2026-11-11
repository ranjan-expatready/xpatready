import { Node } from '@xmldom/xmldom';

/**
 * Calls `visit(node, depth)` for `root` and every node below it, where `depth` is the number of element ancestors.
 * Iterative with an explicit stack because tree depth is attacker-chosen; order is unspecified (children are visited
 * after their parent, siblings last to first). `visit` may throw to stop the walk.
 */
export function forEachNode(root: Node, visit: (node: Node, depth: number) => void): void {
  const nodes: Node[] = [root];
  const depths: number[] = [0];
  for (let node = nodes.pop(), depth = depths.pop(); node !== undefined && depth !== undefined; node = nodes.pop(), depth = depths.pop()) {
    visit(node, depth);
    const childDepth = node.nodeType === Node.ELEMENT_NODE ? depth + 1 : depth;
    for (let child = node.firstChild; child !== null; child = child.nextSibling) {
      nodes.push(child);
      depths.push(childDepth);
    }
  }
}
