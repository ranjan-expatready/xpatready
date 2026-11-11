import { z } from 'zod';
import { XfaFormError } from '../model/form/index.js';
import { MAX_EVENT_TEXT_CHARS } from './limits.js';
import type { EventFields } from './options.js';

type Scalar = string | number | boolean;

const TEXT_FIELDS = ['newText', 'prevText', 'change', 'fullText'] as const;
const NUMBER_FIELDS = ['selStart', 'selEnd'] as const;
const FLAG_FIELDS = ['shift', 'modifier', 'keyDown'] as const;

const isIn = (list: readonly string[], member: string): boolean => list.includes(member);
const textValue = z.string().max(MAX_EVENT_TEXT_CHARS);
const numberValue = z.number().int().nonnegative();
const flagValue = z.boolean();

/**
 * The `xfa.event` object of one dispatch: the activity name, the node the event is for, and the keystroke fields a
 * `change` handler reads and may rewrite (`xfa.event.change = ""` rejects the keystroke in a viewer). A write is
 * visible to the rest of the same dispatch and is then dropped: it is NOT returned in `EventResult`, because no corpus
 * script writes `xfa.event` at all (both forms: 0 writes in ~800 scripts, the only member used is `newText`, read-only
 * use; checked at W02-T07), so surfacing it would be speculative. A form that needs it adds a field to `EventResult`.
 * A fresh state per dispatch, so nothing leaks from the previous event.
 */
export class EventState {
  readonly #values = new Map<string, Scalar>();
  readonly name: string;
  readonly target: { readonly id: number; readonly cls: string } | null;

  constructor(name: string, target: { readonly id: number; readonly cls: string } | null, fields: EventFields = {}) {
    this.name = name;
    this.target = target;
    for (const key of TEXT_FIELDS) this.#values.set(key, '');
    for (const key of NUMBER_FIELDS) this.#values.set(key, 0);
    for (const key of FLAG_FIELDS) this.#values.set(key, false);
    for (const key of [...TEXT_FIELDS, ...NUMBER_FIELDS, ...FLAG_FIELDS] as const) {
      const given = fields[key];
      if (given !== undefined) this.#values.set(key, given);
    }
  }

  /** The member's value, or undefined when `xfa.event` has no such member. */
  read(member: string): Scalar | undefined {
    return this.#values.get(member);
  }

  /** Writes a keystroke field; false when the member is not writable (the caller reports it unsupported). */
  write(member: string, value: unknown): boolean {
    const schema = isIn(TEXT_FIELDS, member) ? textValue : isIn(NUMBER_FIELDS, member) ? numberValue : isIn(FLAG_FIELDS, member) ? flagValue : undefined;
    if (schema === undefined) return false;
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw new XfaFormError('INVALID_ARGUMENT', `xfa.event.${member} was given a value of the wrong type`);
    this.#values.set(member, parsed.data);
    return true;
  }
}
