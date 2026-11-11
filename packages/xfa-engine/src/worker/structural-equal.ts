/**
 * Deep structural equality of plain data: primitives, arrays, typed arrays (byte for byte) and plain objects (same own keys,
 * equal values). For comparing two render trees, which are acyclic data. Anything else (a function, a class instance with
 * behaviour) is equal only to itself.
 */
export function structurallyEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (a instanceof Uint8Array || b instanceof Uint8Array) {
    if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
    return true;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, i) => structurallyEqual(item, b[i]));
  const left = Object.keys(a);
  if (left.length !== Object.keys(b).length) return false;
  return left.every((key) => Object.hasOwn(b, key) && structurallyEqual(Reflect.get(a, key), Reflect.get(b, key)));
}
