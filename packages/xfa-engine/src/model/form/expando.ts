import { limitExceeded } from './errors.js';
import { MAX_EXPANDO_CHARS, MAX_EXPANDOS } from './limits.js';
import type { DomNode } from './node-list.js';

/** What an expando holds: a scalar or a node of this form. */
export type ExpandoValue = string | number | boolean | null | undefined | DomNode;

const charsOf = (value: ExpandoValue): number => (typeof value === 'string' ? value.length : 0);

/**
 * The form-wide ceilings on expandos (properties a script stores on a container beyond the object model's own): how many
 * there are and how many characters of string they hold. A write is checked before it is stored, so a refused write
 * changes nothing. Rewriting a property replaces its old size instead of adding to it.
 */
export class ExpandoBudget {
  #count = 0;
  #chars = 0;

  /** Accounts for storing `next` where the property held `previous` (`had` false: it did not exist). Throws `LIMIT` and changes nothing when over. */
  replace(had: boolean, previous: ExpandoValue, next: ExpandoValue): void {
    const count = this.#count + (had ? 0 : 1);
    const chars = this.#chars - charsOf(previous) + charsOf(next);
    if (count > MAX_EXPANDOS) throw limitExceeded(`more than ${MAX_EXPANDOS} unmodelled properties stored on form nodes`);
    if (chars > MAX_EXPANDO_CHARS) throw limitExceeded(`more than ${MAX_EXPANDO_CHARS} characters held in unmodelled properties`);
    this.#count = count;
    this.#chars = chars;
  }
}
