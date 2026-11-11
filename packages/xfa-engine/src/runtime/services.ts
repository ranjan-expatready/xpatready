import { z } from 'zod';
import { XfaPdfError } from '../pdf/errors.js';
import { FormNode, XfaFormError, type DomNode, type FormDom } from '../model/form/index.js';
import { resolveNode } from '../model/som/index.js';
import { FN_MARKER, UNDEF, UNSUPPORTED, type BridgeValue, type HostOp, type HostReply } from '../script/index.js';
import { describeNode, type RunContext } from './context.js';
import { XfaAnswerRequiredError } from './errors.js';
import type { HostIdentity, MessageBoxCall } from './options.js';
import type { Recorder } from './recorder.js';
import { MAX_RECORDED_TEXT_CHARS } from '../wire-limits.js';

/** Declared in `wire-limits.ts`, with its FD-38 argument (the protocol's schemas need it without the engine). */
export { MAX_RECORDED_TEXT_CHARS };

export const clip = (text: string): string => (text.length > MAX_RECORDED_TEXT_CHARS ? text.slice(0, MAX_RECORDED_TEXT_CHARS) : text);

/** A script text argument: absent or null is the empty string, a number or boolean is written out, anything else is a wrong argument. */
const textArg = z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()]).transform((v) => (v === null || v === undefined ? '' : String(v)));
const intArg = z.union([z.number(), z.null(), z.undefined()]).transform((v) => (v === null || v === undefined || !Number.isFinite(v) ? 0 : Math.trunc(v)));
const answerSchema = z.number().int();
/** A script flag: an absent argument is the default, anything else is taken by JavaScript truthiness (the Designer reference's boolean parameters, and pdf.js `Doc.print`, do the same). */
const flagArg = (fallback: boolean): z.ZodType<boolean> => z.unknown().transform((v) => (v === undefined ? fallback : Boolean(v)));
/** A page number: the host takes it as a string (`"0"`) or a number; a finite numeric one is cut to a whole number, anything else is absent. */
const pageArg = z.unknown().transform((v) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : Number.NaN;
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
});

interface Member {
  readonly get?: () => BridgeValue;
  readonly set?: (value: unknown) => void;
  readonly call?: (args: readonly unknown[]) => HostReply;
}

export interface ServicesDeps {
  readonly dom: FormDom;
  readonly context: RunContext;
  readonly recorder: Recorder;
  readonly identity: HostIdentity;
  readonly answer: (call: MessageBoxCall) => number | null;
}

/**
 * The non-node host services a form reaches by dotted member: `xfa.host.*` (identity injected by the caller, plan
 * decision D3; `messageBox` and `setFocus` recorded, never shown; `setFocus` of nothing records nothing), `app.runtimeHighlight*` and `console.*`.
 * Requests with no effect on the form (`xfa.host.print`, `app.launchURL`, `app.response`) are recorded in `requests` for the
 * viewer to show; the engine never prints, navigates or prompts. `app.alert` is a message box, and `app.viewerType` is the host
 * identity's `appType` (the same word Acrobat reports from both). A member not
 * listed here is `UNSUPPORTED`, so a form that needs a new service is caught by the unsupported log, not guessed at.
 */
export class HostServices {
  readonly #deps: ServicesDeps;
  readonly #members: ReadonlyMap<string, Member>;
  #runtimeHighlight = false;

  constructor(deps: ServicesDeps) {
    this.#deps = deps;
    const { identity } = deps;
    this.#members = new Map<string, Member>([
      ['host.name', { get: () => identity.name }],
      ['host.appType', { get: () => identity.appType }],
      ['host.version', { get: () => identity.version }],
      ['host.variation', { get: () => identity.variation }],
      ['host.platform', { get: () => identity.platform }],
      ['host.language', { get: () => identity.language }],
      ['host.messageBox', { call: (args) => this.#messageBox(args) }],
      ['host.print', { call: (args) => this.#print(args) }],
      ['app.alert', { call: (args) => this.#alert(args) }],
      ['app.response', { call: (args) => this.#response(args) }],
      ['app.launchURL', { call: (args) => this.#launchURL(args) }],
      // Read-only, as in pdf.js v4.10.38 `scripting_api/app.js` (Apache-2.0): a write is a catchable error.
      [
        'app.viewerType',
        {
          get: () => identity.appType,
          set: () => {
            throw new XfaFormError('INVALID_ARGUMENT', 'app.viewerType is read-only');
          },
        },
      ],
      ['host.setFocus', { call: (args) => this.#setFocus(args) }],
      ['app.runtimeHighlight', { get: () => this.#runtimeHighlight, set: (v) => this.#setHighlight(v) }],
      // Neutral: a gray, so the colour helpers of the forms get an array of the shape a viewer returns without any viewer.
      ['app.runtimeHighlightColor', { get: () => ['G', 1] }],
      ['console.println', { call: (args) => this.#println(args) }],
      ['console.show', { call: () => UNDEF }],
      ['console.hide', { call: () => UNDEF }],
      ['console.clear', { call: () => UNDEF }],
    ]);
  }

  handle(op: HostOp, member: string, args: readonly unknown[]): HostReply {
    const entry = this.#members.get(member);
    if (entry === undefined) return UNSUPPORTED;
    if (op === 'get') {
      if (entry.call !== undefined) return FN_MARKER;
      return entry.get === undefined ? UNSUPPORTED : entry.get();
    }
    if (op === 'set') {
      if (entry.set === undefined) return UNSUPPORTED;
      entry.set(args[0]);
      return UNDEF;
    }
    return entry.call === undefined ? UNSUPPORTED : entry.call(args);
  }

  #setHighlight(value: unknown): void {
    const parsed = z.boolean().safeParse(value);
    if (!parsed.success) throw new XfaFormError('INVALID_ARGUMENT', 'app.runtimeHighlight takes true or false');
    this.#runtimeHighlight = parsed.data;
  }

  #messageBox(args: readonly unknown[]): HostReply {
    const parsed = z.tuple([textArg, textArg, intArg, intArg]).safeParse([args[0], args[1], args[2], args[3]]);
    if (!parsed.success) throw new XfaFormError('INVALID_ARGUMENT', 'xfa.host.messageBox takes a message, a title, an icon and a button type');
    const [text, title, icon, buttons] = parsed.data;
    return this.#raise({ text: clip(text), title: clip(title), icon, buttons });
  }

  /**
   * `app.alert(cMsg, nIcon, nType, cTitle)`: the same box as `xfa.host.messageBox(cMsg, cTitle, nIcon, nType)` (icon and button
   * numbering agree: 0 error, 1 warning, 2 question, 3 status; 0 OK, 1 OK/Cancel, 2 Yes/No, 3 Yes/No/Cancel), answered the same way.
   * Semantics: an `nType` outside 0..3 is 0, and an empty message shows nothing and returns 0. Origin: pdf.js v4.10.38 `scripting_api/app.js alert` (Apache-2.0). Only the positional form is bound: the guest bridge cannot pass an object to the host.
   */
  #alert(args: readonly unknown[]): HostReply {
    const parsed = z.tuple([textArg, intArg, intArg, textArg]).safeParse([args[0], args[1], args[2], args[3]]);
    if (!parsed.success) throw new XfaFormError('INVALID_ARGUMENT', 'app.alert takes a message, an icon, a button type and a title');
    const [text, icon, type, title] = parsed.data;
    if (text === '') return 0;
    return this.#raise({ text: clip(text), title: clip(title), icon, buttons: type < 0 || type > 3 ? 0 : type });
  }

  /** Records and answers a message box; shared by `xfa.host.messageBox` and `app.alert`. */
  #raise(call: MessageBoxCall): HostReply {
    const { context, recorder } = this.#deps;
    const node = context.current;
    const given = this.#deps.answer(call);
    // `null` is the host saying "nobody has answered yet": fatal and typed, so a script cannot absorb it in a try/catch (see `ANSWER_REQUIRED`).
    if (given === null) throw new XfaAnswerRequiredError(call, { event: context.activity, nodeSom: node === undefined ? undefined : describeNode(node) });
    // A caller's answer function that returns something else is a bug in the caller, not in the form: fatal, never swallowed.
    const result = answerSchema.parse(given);
    recorder.addMessage({ ...call, result, event: context.activity ?? '', nodeSom: node === undefined ? '' : describeNode(node) });
    return result;
  }

  /** Where a request was made from, as a message box records it. */
  #origin(): { readonly event: string; readonly nodeSom: string } {
    const { context } = this.#deps;
    const node = context.current;
    return { event: context.activity ?? '', nodeSom: node === undefined ? '' : clip(describeNode(node)) };
  }

  /**
   * `xfa.host.print(bUI, nStart, nEnd, bSilent, bShrinkToFit, bPrintAsImage, bReverse, bAnnotations)`: recorded as a `print`
   * request and nothing else; the engine never prints. Origin: Adobe's Designer Scripting Reference, hostPseudoModel `print`
   * (canonical call `xfa.host.print(1, "0", "0", 0, 1, 0, 0, 0)`): `nStart` and `nEnd` are zero-based page numbers given as
   * strings (numbers are accepted too), so that call is the first page only; the fourth parameter suppresses the cancel dialog
   * (default true), `bShrinkToFit` and `bPrintAsImage` default true, `bReverse` false, `bAnnotations` true, `bUI` true. With no page numbers at all the range is every page
   * (0 to -1); with only `nStart` it is that page alone (Acrobat's Doc.print convention, the nearest precedent).
   */
  #print(args: readonly unknown[]): HostReply {
    const parsed = z.tuple([flagArg(true), pageArg, pageArg, flagArg(true), flagArg(true), flagArg(true), flagArg(false), flagArg(true)]).parse(Array.from({ length: 8 }, (_, i) => args[i]));
    const [ui, start, end, noCancelDialog, shrinkToFit, asImage, reverse, annotations] = parsed;
    // Page range, after Acrobat's documented Doc.print convention (the nearest precedent; the host reference does not say): neither given is
    // every page (0 to -1), only `nStart` given is that one page, a negative `nEnd` is "to the last page".
    const first = Math.max(0, start ?? 0);
    const last = end === undefined ? (start === undefined ? -1 : first) : end < 0 ? -1 : end;
    this.#deps.recorder.addRequest({ kind: 'print', ui, start: first, end: last, noCancelDialog, shrinkToFit, asImage, reverse, annotations, ...this.#origin() });
    return UNDEF;
  }

  /**
   * `app.response(cQuestion, cTitle, cDefault, bPassword, cLabel)`: recorded as a `response` request; the script gets `null`, what
   * Acrobat returns when the user cancels, because the engine is synchronous and the protocol's answers are whole numbers, not text.
   * Positional form only. Origin: pdf.js v4.10.38 `scripting_api/app.js response`, which also answers null when it cannot ask (Apache-2.0).
   */
  #response(args: readonly unknown[]): HostReply {
    const parsed = z.tuple([textArg, textArg, textArg, flagArg(false), textArg]).safeParse([args[0], args[1], args[2], args[3], args[4]]);
    if (!parsed.success) throw new XfaFormError('INVALID_ARGUMENT', 'app.response takes a question, a title, a default answer, a password flag and a label');
    const [question, title, answer, password, label] = parsed.data;
    this.#deps.recorder.addRequest({ kind: 'response', question: clip(question), title: clip(title), default: clip(answer), password, label: clip(label), ...this.#origin() });
    return null;
  }

  /**
   * `app.launchURL(cURL, bNewFrame)`: recorded as a `launchURL` request; nothing is opened. The URL is data for the viewer to show, never fetched or followed here.
   * Origin: pdf.js v4.10.38 `scripting_api/app.js launchURL`, also a no-op (Apache-2.0).
   */
  #launchURL(args: readonly unknown[]): HostReply {
    const parsed = z.tuple([textArg, flagArg(false)]).safeParse([args[0], args[1]]);
    if (!parsed.success) throw new XfaFormError('INVALID_ARGUMENT', 'app.launchURL takes a URL and a new-frame flag');
    const [url, newFrame] = parsed.data;
    this.#deps.recorder.addRequest({ kind: 'launchURL', url: clip(url), newFrame, ...this.#origin() });
    return UNDEF;
  }

  #setFocus(args: readonly unknown[]): HostReply {
    const target = args[0];
    // A script that names a node its template lacks reads undefined (Validate on one real form does, at the end of its
    // success path). There is nothing to focus: record nothing and let the script go on. Acrobat parity is unconfirmed (Plan 3).
    if (target === undefined || target === null) return UNDEF;
    let som: string;
    if (target instanceof FormNode) som = describeNode(target);
    else if (typeof target === 'string') som = this.#canonical(target);
    else throw new XfaFormError('INVALID_ARGUMENT', 'xfa.host.setFocus takes a node or a SOM expression');
    this.#deps.recorder.addFocus(clip(som));
    return UNDEF;
  }

  /** The canonical SOM of what a focus string names from the running script, else the string as written. */
  #canonical(text: string): string {
    const from: DomNode = this.#deps.context.current ?? this.#deps.dom.root;
    try {
      const found = resolveNode(from, text);
      return found === null ? text : describeNode(found);
    } catch (error) {
      // A focus string that is not valid SOM is recorded as written; any other failure is not ours to hide.
      if (error instanceof XfaPdfError || error instanceof XfaFormError) return text;
      throw error;
    }
  }

  #println(args: readonly unknown[]): HostReply {
    const first = args[0];
    const parsed = textArg.safeParse(Array.isArray(first) ? first.map(String).join(',') : first);
    if (!parsed.success) throw new XfaFormError('INVALID_ARGUMENT', 'console.println takes a value that can be written out');
    this.#deps.recorder.addConsole(clip(parsed.data));
    return UNDEF;
  }
}
