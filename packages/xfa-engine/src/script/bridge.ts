import type { z } from 'zod';
import { hostReplySchema, isForbiddenKey, isForbiddenMember, requestSchemas } from './bridge-schema.js';
import { UNSUPPORTED, type HostReply, type JsonValue, type ScriptHost } from './bridge-types.js';
import { safeText } from '../pdf/safe-text.js';
import { XfaScriptError, type ScriptLimitKind, type ScriptLocation, type XfaScriptErrorCode } from './errors.js';
import type { SandboxLimits } from './limits.js';

/** The six guest -> host functions of the bridge. */
export type BridgeFunction = keyof typeof requestSchemas;

export interface BridgeConfig {
  readonly host: ScriptHost;
  readonly strict: boolean;
  readonly limits: SandboxLimits;
  /** Where the running script is, for error messages. Optional: absent in unit tests of the bridge alone. */
  readonly locate?: () => ScriptLocation | undefined;
}

/**
 * Host side of the bridge: takes the JSON text a guest wrapper sent, validates it against the wire schema, calls
 * the `ScriptHost`, validates the reply, and returns the reply as JSON text. It never returns or exposes a host
 * object, and every failure is an `XfaScriptError` (the sandbox treats those as fatal and fails closed).
 */
export class Bridge {
  private runCalls = 0;
  private total = 0;

  constructor(private readonly config: BridgeConfig) {}

  /** Calls made over the whole form run so far. */
  get totalCalls(): number {
    return this.total;
  }

  /** Starts a new outermost script run: resets the per-run call counter (the form-run counter keeps counting). */
  beginRun(): void {
    this.runCalls = 0;
  }

  dispatch(fn: BridgeFunction, payload: string): string {
    this.countCall();
    const limit = this.config.limits.payloadChars;
    if (payload.length > limit) throw this.payloadTooLarge(fn, 'request', limit);
    const json = this.parseJson(fn, payload);
    const { host } = this.config;
    switch (fn) {
      case 'get': {
        const [id, prop] = this.validate('get', requestSchemas.get, json);
        return this.reply(fn, () => (isForbiddenMember(prop) ? UNSUPPORTED : host.get(id, prop)));
      }
      case 'set': {
        const [id, prop, value] = this.validate('set', requestSchemas.set, json);
        return this.reply(fn, () => (isForbiddenMember(prop) ? UNSUPPORTED : host.set(id, prop, value)));
      }
      case 'call': {
        const [id, method, args] = this.validate('call', requestSchemas.call, json);
        return this.reply(fn, () => (isForbiddenMember(method) ? UNSUPPORTED : host.call(id, method, args)));
      }
      case 'resolve': {
        const [fromId, expression, many] = this.validate('resolve', requestSchemas.resolve, json);
        return this.reply(fn, () => host.resolve(fromId, expression, many));
      }
      case 'host': {
        const [op, member, args] = this.validate('host', requestSchemas.host, json);
        return this.reply(fn, () => (isForbiddenMember(member) ? UNSUPPORTED : host.host(op, member, args)));
      }
      case 'log': {
        const [kind, logPayload] = this.validate('log', requestSchemas.log, json);
        this.callHost(fn, () => host.log(kind, logPayload));
        if (kind === 'unsupported' && this.config.strict) throw this.unsupportedMember(logPayload);
        return 'null';
      }
    }
  }

  private countCall(): void {
    const { runBridgeCalls, formRunBridgeCalls } = this.config.limits;
    this.total += 1;
    this.runCalls += 1;
    if (this.runCalls > runBridgeCalls) {
      throw this.fail('SCRIPT_LIMIT', `more than ${runBridgeCalls} bridge calls in one script run`, { limit: 'run-bridge-calls' });
    }
    if (this.total > formRunBridgeCalls) {
      throw this.fail('SCRIPT_LIMIT', `more than ${formRunBridgeCalls} bridge calls in one form run`, { limit: 'bridge-calls' });
    }
  }

  private parseJson(fn: BridgeFunction, payload: string): unknown {
    try {
      // The reviver sees every key, including an own `__proto__` that JSON.parse creates as plain data; schemas would silently drop it.
      return JSON.parse(payload, (key, value: unknown) => {
        if (isForbiddenKey(key)) throw new SyntaxError('forbidden key');
        return value;
      });
    } catch (error) {
      throw this.fail('BRIDGE_VIOLATION', `bridge ${fn}: request is not valid or too deeply nested JSON`, { cause: error });
    }
  }

  private validate<S extends z.ZodType>(fn: BridgeFunction, schema: S, json: unknown): z.output<S> {
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw this.fail('BRIDGE_VIOLATION', `bridge ${fn}: request violates the wire contract (${describeIssue(parsed.error)})`);
    }
    return parsed.data;
  }

  /** Runs host code. Anything thrown is fatal: an `XfaScriptError` passes through unchanged, the rest becomes `HOST_ERROR`. */
  private callHost<T>(fn: BridgeFunction, run: () => T): T {
    try {
      return run();
    } catch (error) {
      if (error instanceof XfaScriptError) throw error;
      throw this.fail('HOST_ERROR', `host threw during bridge ${fn}`, { cause: error });
    }
  }

  private reply(fn: BridgeFunction, run: () => HostReply): string {
    return this.encodeReply(fn, this.callHost(fn, run));
  }

  private unsupportedMember(payload: JsonValue): XfaScriptError {
    const text = (key: string): string => {
      const value: unknown = typeof payload === 'object' && payload !== null ? Reflect.get(payload, key) : undefined;
      return typeof value === 'string' ? safeText(value, 64, true) : '?';
    };
    const member = `${text('class')}.${text('member')}`;
    return this.fail('UNSUPPORTED_MEMBER', `script touched unsupported member ${member}`, { member });
  }

  private payloadTooLarge(fn: BridgeFunction, direction: 'request' | 'reply', limit: number): XfaScriptError {
    return this.fail('SCRIPT_LIMIT', `bridge ${fn}: ${direction} is longer than ${limit} characters`, { limit: 'payload' });
  }

  private fail(
    code: XfaScriptErrorCode,
    message: string,
    extra: { readonly cause?: unknown; readonly limit?: ScriptLimitKind; readonly member?: string } = {},
  ): XfaScriptError {
    const location = this.config.locate?.();
    return new XfaScriptError(code, message, location === undefined ? extra : { ...extra, location });
  }

  private encodeReply(fn: BridgeFunction, reply: HostReply): string {
    const parsed = hostReplySchema.safeParse(reply);
    if (!parsed.success) {
      throw this.fail('BRIDGE_VIOLATION', `bridge ${fn}: host reply violates the wire contract (${describeIssue(parsed.error)})`);
    }
    const text = JSON.stringify(parsed.data);
    const limit = this.config.limits.payloadChars;
    if (text.length > limit) throw this.payloadTooLarge(fn, 'reply', limit);
    return text;
  }
}

/** First issue only, code and path - never the offending value, which is guest- or host-controlled. */
function describeIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (issue === undefined) return 'unknown';
  return `${issue.code} at ${safeText(issue.path.join('.') || '<root>', 40, true)}`;
}
