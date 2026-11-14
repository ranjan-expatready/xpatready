// PF-24: a secret value held by the configuration. Printing it, logging it, putting it in JSON or in a template string
// gives "[secret NAME]", never the value (SA-8-3: keys never in a log line, a response or an audit record). Only
// `reveal()` gives the value, and only the adapter that talks to the provider calls it.
import { inspect } from "node:util";

const VALUES = new WeakMap<Secret, string>();

export class Secret {
  constructor(readonly name: string, value: string) { VALUES.set(this, value); Object.freeze(this); }
  /** The value, for the one adapter that sends it to its provider. Never log or return it. */
  reveal(): string { return VALUES.get(this)!; }
  toString() { return `[secret ${this.name}]`; }
  toJSON() { return `[secret ${this.name}]`; }
  [inspect.custom]() { return `[secret ${this.name}]`; }
  [Symbol.toPrimitive]() { return `[secret ${this.name}]`; }
}
