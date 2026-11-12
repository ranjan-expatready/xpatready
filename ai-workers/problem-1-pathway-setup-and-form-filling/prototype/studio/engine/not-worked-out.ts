// Review M1 on #1620 (QA-415): a fact the case works out but cannot work out for this person yet (for example, their
// application waits for an answer, or the product has no word for their filing). Its form fields are written by hand
// with this reason, never left blank in silence and never guessed. It is no value: stored or compared it is null, and
// as text it is empty. The coverage row carries the reason as plain text (BoxRow.by_hand, engine/render.ts), since a copy
// freezes its rows as JSON before it is filled (api/src/fill-case.ts); engine/form-values.ts writes it by hand.
// No imports: render.ts and the derivations both read it.
export class NotWorkedOut {
  constructor(readonly why: string) {}
  toJSON() { return null; }
  toString() { return ""; }
}
