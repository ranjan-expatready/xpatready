import {
  FN_MARKER,
  UNDEF,
  UNSUPPORTED,
  type BridgeValue,
  type HostOp,
  type HostReply,
  type JsonValue,
  type LogKind,
  type NodeId,
  type NodeRef,
  type ScriptClock,
  type ScriptHost,
} from '../bridge-types.js';

type Method = (args: readonly BridgeValue[]) => HostReply;

interface FakeNode {
  readonly ref: NodeRef;
  readonly props: Map<string, HostReply>;
  readonly methods: Map<string, Method>;
}

export interface LoggedEntry {
  readonly kind: LogKind;
  readonly payload: JsonValue;
}

/** In-memory stand-in for the real form DOM (W02-T06 implements `ScriptHost` over that). Records every interaction. */
export class FakeHost implements ScriptHost {
  readonly root: NodeRef = { id: 0, cls: 'xfa' };
  readonly logs: LoggedEntry[] = [];
  /** `get:<id>:<prop>`, `set:<id>:<prop>`, `call:<id>:<method>`, `resolve:<id>:<expr>`, `host:<op>:<member>`. */
  readonly traffic: string[] = [];
  readonly sets: { id: NodeId; prop: string; value: BridgeValue }[] = [];
  readonly hostSets: { member: string; args: readonly BridgeValue[] }[] = [];
  readonly hostCalls: { member: string; args: readonly BridgeValue[] }[] = [];
  readonly resolutions = new Map<string, HostReply>();
  readonly hostMembers = new Map<string, (op: HostOp, args: readonly BridgeValue[]) => HostReply>();
  private readonly nodes = new Map<NodeId, FakeNode>();
  private nextId = 1;

  constructor() {
    this.nodes.set(0, { ref: this.root, props: new Map(), methods: new Map() });
  }

  addNode(cls: string, props: Record<string, HostReply> = {}, methods: Record<string, Method> = {}): NodeRef {
    const ref: NodeRef = { id: this.nextId++, cls };
    this.nodes.set(ref.id, { ref, props: new Map(Object.entries(props)), methods: new Map(Object.entries(methods)) });
    return ref;
  }

  node(ref: NodeRef): FakeNode {
    const node = this.nodes.get(ref.id);
    if (node === undefined) throw new Error(`fake host: unknown node ${ref.id}`);
    return node;
  }

  /** Makes `resolveNode(expression)` from any node return `result`. */
  onResolve(expression: string, result: HostReply): void {
    this.resolutions.set(expression, result);
  }

  get(id: NodeId, prop: string): HostReply {
    this.traffic.push(`get:${id}:${prop}`);
    const node = this.mustGet(id);
    if (node.methods.has(prop)) return FN_MARKER;
    return node.props.has(prop) ? (node.props.get(prop) as HostReply) : UNSUPPORTED;
  }

  set(id: NodeId, prop: string, value: BridgeValue): HostReply {
    this.traffic.push(`set:${id}:${prop}`);
    const node = this.mustGet(id);
    this.sets.push({ id, prop, value });
    if (!node.props.has(prop)) return UNSUPPORTED;
    node.props.set(prop, value);
    return UNDEF;
  }

  call(id: NodeId, method: string, args: readonly BridgeValue[]): HostReply {
    this.traffic.push(`call:${id}:${method}`);
    const fn = this.mustGet(id).methods.get(method);
    return fn === undefined ? UNSUPPORTED : fn(args);
  }

  resolve(fromId: NodeId, expression: string, many: boolean): HostReply {
    this.traffic.push(`resolve:${fromId}:${expression}`);
    this.mustGet(fromId);
    return this.resolutions.get(expression) ?? (many ? { $t: 'nodes', nodes: [] } : null);
  }

  host(op: HostOp, member: string, args: readonly BridgeValue[]): HostReply {
    this.traffic.push(`host:${op}:${member}`);
    if (op === 'set') this.hostSets.push({ member, args });
    if (op === 'call') this.hostCalls.push({ member, args });
    const handler = this.hostMembers.get(member);
    return handler === undefined ? UNSUPPORTED : handler(op, args);
  }

  log(kind: LogKind, payload: JsonValue): void {
    this.logs.push({ kind, payload });
  }

  private mustGet(id: NodeId): FakeNode {
    const node = this.nodes.get(id);
    if (node === undefined) throw new Error(`fake host: unknown node ${id}`);
    return node;
  }
}

/** A fixed clock: 2026-06-15T12:00:00Z, far from any year or day boundary in every timezone. */
export const FIXED_CLOCK: ScriptClock = { now: () => Date.UTC(2026, 5, 15, 12, 0, 0) };
