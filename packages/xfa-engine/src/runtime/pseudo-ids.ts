/**
 * Ids of the host objects that hang off `xfa` but are not form nodes (`xfa.event`, `xfa.layout`, `xfa.log`). The form
 * DOM numbers its nodes from 1 up to its node ceiling (one million), and 0 is the `xfa` root, so ids above that can
 * never collide with a node.
 */
export const XFA_ROOT_ID = 0;
export const EVENT_ID = 2_000_000_001;
export const LAYOUT_ID = 2_000_000_002;
export const LOG_ID = 2_000_000_003;

export const EVENT_REF = { id: EVENT_ID, cls: 'event' } as const;
export const LAYOUT_REF = { id: LAYOUT_ID, cls: 'layout' } as const;
export const LOG_REF = { id: LOG_ID, cls: 'log' } as const;

/**
 * Saved-state `delta` objects (`getDeltas()`) take ids from this base, one per delta of the saved form packet (at most
 * `MAX_SAVED_DELTAS`): above every node id and below the host objects.
 */
export const DELTA_BASE = 1_500_000_000;
export const DELTA_SPAN = 1_000_000;

export const isDeltaId = (id: number): boolean => id >= DELTA_BASE && id < DELTA_BASE + DELTA_SPAN;

export const isPseudoId = (id: number): boolean => id === XFA_ROOT_ID || id === EVENT_ID || id === LAYOUT_ID || id === LOG_ID || isDeltaId(id);
