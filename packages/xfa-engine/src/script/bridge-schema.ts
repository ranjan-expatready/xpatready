import { z } from 'zod';
import type { BridgeValue, HostReply, JsonValue } from './bridge-types.js';

/** FD-38 security invariant: longest member name (property, method or dotted host member) accepted from the guest. */
export const MAX_MEMBER_CHARS = 128;
/**
 * FD-38 security invariant: longest SOM / resolve expression accepted from the guest, in characters. Equal to the SOM
 * resolver's own ceiling (`MAX_SOM_CHARS`, 16 KiB, in `model/som/limits.ts`; a test holds the two together), so the bridge
 * never cuts off an expression the resolver would accept, and never lets through one it must refuse by length.
 */
export const MAX_EXPRESSION_CHARS = 16 * 1024;
/** FD-38 security invariant: most arguments in one bridge call. */
export const MAX_BRIDGE_ARGS = 64;
/** FD-38 security invariant: deepest array nesting in a bridge value (form values are scalars or flat arrays). */
export const MAX_VALUE_DEPTH = 6;
/** FD-38 security invariant: deepest object nesting in a log payload (the guest writes `{ class, member }`). */
export const MAX_LOG_DEPTH = 4;
/** FD-38 security invariant: most keys in one log payload object. */
export const MAX_LOG_KEYS = 16;

/** Names that would reach `Object.prototype` machinery if a host looked a member up in a plain object. */
const FORBIDDEN_NAMES: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

/** True for a JSON object key that would reach `Object.prototype` machinery. */
export function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_NAMES.has(key);
}

/** True when a member name, or any dotted segment of it, is a prototype-reaching name. */
export function isForbiddenMember(member: string): boolean {
  return member.split('.').some((segment) => FORBIDDEN_NAMES.has(segment));
}

const nodeId = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const className = z.string().min(1).max(64);
const memberName = z.string().min(1).max(MAX_MEMBER_CHARS);
const nodeRef = { id: nodeId, cls: className };

/** A node reference supplied by the caller of the sandbox (the `xfa` root, a script's `this`); extra fields on a richer host object are ignored, never forwarded. */
export const callerNodeRefSchema = z.object(nodeRef);

const undefTag = z.strictObject({ $t: z.literal('undef') });
const numTag = z.strictObject({ $t: z.literal('num'), v: z.enum(['NaN', 'Infinity', '-Infinity']) });
const nodeTag = z.strictObject({ $t: z.literal('node'), ...nodeRef });
const nodesTag = z.strictObject({ $t: z.literal('nodes'), nodes: z.array(z.strictObject(nodeRef)) });

function valueSchemaAt(depth: number): z.ZodType<BridgeValue> {
  const leaves = [z.null(), z.boolean(), z.number().finite(), z.string(), undefTag, numTag, nodeTag, nodesTag] as const;
  return depth === 0 ? z.union(leaves) : z.union([...leaves, z.array(valueSchemaAt(depth - 1))]);
}

/** A value crossing the bridge in either direction. Depth-bounded; tagged objects are strict, so no foreign key survives. */
export const bridgeValueSchema: z.ZodType<BridgeValue> = valueSchemaAt(MAX_VALUE_DEPTH);

const hostReplySchema: z.ZodType<HostReply> = z.union([
  bridgeValueSchema,
  z.strictObject({ $t: z.literal('fn') }),
  z.strictObject({ $t: z.literal('unsupported') }),
  z.strictObject({ $t: z.literal('error'), message: z.string().max(4096) }),
]);

const safeKey = z.string().max(MAX_MEMBER_CHARS).refine((key) => !FORBIDDEN_NAMES.has(key), 'forbidden key');

function jsonSchemaAt(depth: number): z.ZodType<JsonValue> {
  const scalars = [z.null(), z.boolean(), z.number().finite(), z.string().max(4096)] as const;
  if (depth === 0) return z.union(scalars);
  const inner = jsonSchemaAt(depth - 1);
  return z.union([...scalars, z.array(inner).max(MAX_LOG_KEYS), z.record(safeKey, inner)]);
}

const logPayloadSchema = jsonSchemaAt(MAX_LOG_DEPTH).refine(
  (value) => typeof value !== 'object' || value === null || Array.isArray(value) || Object.keys(value).length <= MAX_LOG_KEYS,
  'too many keys',
);

const args = z.array(bridgeValueSchema).max(MAX_BRIDGE_ARGS);

/** Request shape of each guest -> host function (the JSON text the guest sends parses to exactly one of these tuples). */
export const requestSchemas = {
  get: z.tuple([nodeId, memberName]),
  set: z.tuple([nodeId, memberName, bridgeValueSchema]),
  call: z.tuple([nodeId, memberName, args]),
  resolve: z.tuple([nodeId, z.string().max(MAX_EXPRESSION_CHARS), z.boolean()]),
  host: z.tuple([z.enum(['get', 'set', 'call']), memberName, args]),
  log: z.tuple([z.enum(['unsupported', 'note']), logPayloadSchema]),
} as const;

export { hostReplySchema };
