/**
 * FD-38 exemption (correctness constant): the highest valid object number is 2^24-1 because the AES object key
 * (ISO 32000-1 Alg. 1) takes 3 bytes of it. No firm or operator has a reason to vary it.
 */
export const MAX_OBJECT_NUMBER = 0xffffff;

/**
 * FD-38 exemption (security invariant): most cross-reference entries accepted across a file's whole /Prev chain
 * (the sum of table subsection counts and xref-stream /Index counts). Real forms hold thousands of objects; the
 * ceiling is validated BEFORE any entry is allocated, so a header claiming 67 million entries (a few KB of Flate
 * zeros) cannot exhaust memory. No firm or operator has a reason to vary it.
 */
export const MAX_XREF_ENTRIES = 1_000_000;

/**
 * FD-38 exemption (correctness constant): widest xref-stream field. A JS number holds at most 7 bytes exactly (the
 * reader rejects a larger value), and real files use 1-4; a wider /W entry only invites a per-byte loop over
 * attacker-chosen zeros. No firm or operator has a reason to vary it.
 */
export const MAX_XREF_FIELD_WIDTH = 8;

/**
 * FD-38 exemption (correctness constant): most entries accepted in a stream's /Filter or /DecodeParms array. The
 * engine decodes a single FlateDecode filter, so a longer chain can only be rejected later anyway; bounding it
 * first means a hostile array (or many references to one) is never expanded. No firm or operator has a reason to
 * vary it.
 */
export const MAX_FILTER_CHAIN = 2;

/** FD-38 exemption (correctness constant): longest chain of references followed to reach a stream /Filter or /DecodeParms value. */
export const MAX_PARAM_REF_HOPS = 3;
