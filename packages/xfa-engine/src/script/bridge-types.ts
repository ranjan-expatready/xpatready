/**
 * The host/guest contract of the script sandbox.
 *
 * The form DOM lives on the HOST. The guest (QuickJS) only ever holds opaque numeric node ids wrapped in `Proxy`
 * objects; every property read/write/call crosses a narrow bridge as JSON text, and what crosses is limited to the
 * `BridgeValue` shapes below. No host object, function or prototype is ever reachable from the guest.
 */

/** Opaque host-assigned identity of a form node. The sandbox never interprets it. */
export type NodeId = number;

/** A node as seen by the guest: its id plus the class name used for diagnostics and the unsupported-member log. */
export interface NodeRef {
  readonly id: NodeId;
  readonly cls: string;
}

export interface UndefinedValue {
  readonly $t: 'undef';
}
/** A number JSON cannot carry. */
export interface NonFiniteValue {
  readonly $t: 'num';
  readonly v: 'NaN' | 'Infinity' | '-Infinity';
}
export interface NodeValue extends NodeRef {
  readonly $t: 'node';
}
/** A snapshot list of nodes (e.g. the result of `resolveNodes`). */
export interface NodeListValue {
  readonly $t: 'nodes';
  readonly nodes: readonly NodeRef[];
}

/** Everything that may cross the bridge in either direction. JSON-safe by construction. */
export type BridgeValue =
  | null
  | boolean
  | number
  | string
  | readonly BridgeValue[]
  | UndefinedValue
  | NonFiniteValue
  | NodeValue
  | NodeListValue;

/** Reply meaning "this member is a method": the guest returns a callable bound to (node, member). */
export interface FunctionMarker {
  readonly $t: 'fn';
}
/** Reply meaning "the host does not implement this member". Logged; strict mode makes it fatal. */
export interface UnsupportedMarker {
  readonly $t: 'unsupported';
}
/** Reply meaning "the operation failed": thrown in the guest as an ordinary, catchable `Error`. */
export interface ErrorReply {
  readonly $t: 'error';
  readonly message: string;
}

/** What a `ScriptHost` method returns. */
export type HostReply = BridgeValue | FunctionMarker | UnsupportedMarker | ErrorReply;

export const UNDEF: UndefinedValue = Object.freeze({ $t: 'undef' });
export const FN_MARKER: FunctionMarker = Object.freeze({ $t: 'fn' });
export const UNSUPPORTED: UnsupportedMarker = Object.freeze({ $t: 'unsupported' });

export const nodeValue = (ref: NodeRef): NodeValue => ({ $t: 'node', id: ref.id, cls: ref.cls });
export const nodeList = (nodes: readonly NodeRef[]): NodeListValue => ({
  $t: 'nodes',
  nodes: nodes.map((n) => ({ id: n.id, cls: n.cls })),
});
export const errorReply = (message: string): ErrorReply => ({ $t: 'error', message });

/** JSON payload of a `log` call (validated: depth-bounded, no `__proto__`/`constructor`/`prototype` keys). */
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export type HostOp = 'get' | 'set' | 'call';
export type LogKind = 'unsupported' | 'note';

/**
 * The host side of the bridge, implemented over the real form DOM by the event engine (W02-T06) and by an
 * in-memory fake in tests. All methods are synchronous (the QuickJS build is the sync variant).
 *
 * Contract for implementers:
 * - Ids and names are UNTRUSTED. An unknown id is a bug in the host or a forged value: throw, do not guess.
 * - The sandbox never forwards the member names `__proto__`, `constructor` or `prototype` (nor any dotted
 *   segment equal to them); it answers `UNSUPPORTED` itself. Still, look members up with `Map` /
 *   `Object.hasOwn`, never `table[name]` on a plain object.
 * - Return `UNSUPPORTED` for a member you do not implement; return `FN_MARKER` from `get` / `host('get')` for a
 *   member that is a method; return `errorReply(msg)` for an XFA-level failure the script may catch.
 * - A thrown exception is FATAL: it aborts the running script, closes the sandbox and surfaces to the caller of
 *   `evaluate` (an `XfaScriptError` unchanged, anything else wrapped as `HOST_ERROR`). To let a script catch a
 *   failure, return `errorReply`, do not throw.
 * - `set` returns `UNDEF` on success.
 * - `resolve(fromId, ...)` where `fromId` is the `xfa` root means "resolve relative to the node whose script is
 *   currently running" - the host owns that context; the sandbox only forwards the id.
 * - The host may re-enter the sandbox (`Sandbox.evaluate`) from inside a method (`execEvent`); depth is capped.
 */
export interface ScriptHost {
  /** Read `node.prop`. */
  get(id: NodeId, prop: string): HostReply;
  /** Write `node.prop = value`. */
  set(id: NodeId, prop: string, value: BridgeValue): HostReply;
  /** Call `node.method(...args)`. */
  call(id: NodeId, method: string, args: readonly BridgeValue[]): HostReply;
  /** `resolveNode` (`many = false`: a node or `null`) / `resolveNodes` (`many = true`: a node list). */
  resolve(fromId: NodeId, expression: string, many: boolean): HostReply;
  /**
   * Non-node host services, addressed by dotted member: `host.messageBox`, `host.name`, `app.runtimeHighlight`,
   * `console.println`. `op` says whether the guest reads, writes or calls the member; for `set` and `call`
   * `args` carries the value / the arguments.
   */
  host(op: HostOp, member: string, args: readonly BridgeValue[]): HostReply;
  /** Diagnostics from the guest. `unsupported` payload: `{ class, member }`. */
  log(kind: LogKind, payload: JsonValue): void;
}

/** Injected wall clock (D3). The guest `Date` is rebuilt on top of it; the sandbox never reads the real time for the guest. */
export interface ScriptClock {
  /** Milliseconds since the Unix epoch. */
  now(): number;
}

/**
 * Injected timezone (plan decision D9). The guest `Date` computes every local-time value (getters, setters, strings and
 * `new Date(y, m, d, ...)`) from this and the clock, so the process timezone never matters.
 */
export interface ScriptZone {
  /** Offset of local time from UTC, in milliseconds, at the UTC instant `utcMs`; positive east of Greenwich, within one day either way. */
  offsetMs(utcMs: number): number;
  /** True when the offset is the same at every instant: the guest then reads it once and never calls the host. */
  readonly fixed: boolean;
}
