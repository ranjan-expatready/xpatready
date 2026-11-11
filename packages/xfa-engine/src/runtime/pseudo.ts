import { z } from 'zod';
import { FormNode, XfaFormError } from '../model/form/index.js';
import { FN_MARKER, UNDEF, UNSUPPORTED, nodeValue, type BridgeValue, type HostReply } from '../script/index.js';
import type { RunContext } from './context.js';
import type { LayoutQuery } from './layout-session.js';
import { EVENT_ID, EVENT_REF, LAYOUT_ID, LAYOUT_REF, LOG_ID, LOG_REF } from './pseudo-ids.js';
import type { Recorder } from './recorder.js';
import { clip } from './services.js';

const logArgs = z.tuple([z.unknown(), z.union([z.string(), z.number(), z.boolean(), z.null()])]);
/** `xfa.layout.page(node)`: one form node (a script's extra arguments are ignored, as JavaScript does). */
const pageArgs = z.tuple([z.instanceof(FormNode)]).rest(z.unknown());

/**
 * The host objects under `xfa` that are not form nodes: `xfa.event` (per-dispatch fields), `xfa.layout` (`page(node)` and
 * `pageCount()`, answered from the layout the runtime keeps, W02-T09; every other member is unsupported) and `xfa.log`
 * (the form's own error logging, recorded with the console). Each answers `get` / `set` / `call` like a node, or says it
 * does not model the member.
 */
export class PseudoNodes {
  readonly #context: RunContext;
  readonly #recorder: Recorder;
  readonly #layout: LayoutQuery;

  constructor(context: RunContext, recorder: Recorder, layout: LayoutQuery) {
    this.#context = context;
    this.#recorder = recorder;
    this.#layout = layout;
  }

  /** The `xfa.<member>` that is a host object, as a node handle; undefined when `member` is not one. */
  rootMember(member: string): HostReply | undefined {
    if (member === 'event') return nodeValue(EVENT_REF);
    if (member === 'layout') return nodeValue(LAYOUT_REF);
    if (member === 'log') return nodeValue(LOG_REF);
    return undefined;
  }

  get(id: number, member: string): HostReply {
    if (id === EVENT_ID) return this.#getEvent(member);
    if (id === LAYOUT_ID) return member === 'page' || member === 'pageCount' ? FN_MARKER : UNSUPPORTED;
    if (id === LOG_ID) return member === 'message' ? FN_MARKER : UNSUPPORTED;
    return UNSUPPORTED;
  }

  set(id: number, member: string, value: unknown): HostReply {
    if (id !== EVENT_ID) return UNSUPPORTED;
    const state = this.#context.eventState;
    return state !== undefined && state.write(member, value) ? UNDEF : UNSUPPORTED;
  }

  call(id: number, member: string, args: readonly unknown[]): HostReply {
    if (id === LAYOUT_ID && member === 'page') {
      const parsed = pageArgs.safeParse(args);
      if (!parsed.success) throw new XfaFormError('INVALID_ARGUMENT', 'xfa.layout.page takes a form node');
      return this.#layout.page(parsed.data[0]);
    }
    if (id === LAYOUT_ID && member === 'pageCount') return this.#layout.pageCount();
    if (id === LOG_ID && member === 'message') {
      const parsed = logArgs.safeParse(args);
      if (!parsed.success) throw new XfaFormError('INVALID_ARGUMENT', 'xfa.log.message takes a level and a text');
      this.#recorder.addConsole(clip(String(parsed.data[1])));
      return UNDEF;
    }
    return UNSUPPORTED;
  }

  #getEvent(member: string): HostReply {
    const state = this.#context.eventState;
    if (state === undefined) return UNSUPPORTED;
    if (member === 'name') return state.name;
    if (member === 'target') return state.target === null ? null : nodeValue(state.target);
    const value: BridgeValue | undefined = state.read(member);
    return value === undefined ? UNSUPPORTED : value;
  }
}
