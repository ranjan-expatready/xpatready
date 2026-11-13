// BK-23 (Lead 36's ruling on #1698; #1695's IMM 1295 line): the facts a form field's "A equals B" step compares its own
// value with. Such a fact is asked of the person who files the form (engine/render.ts, engine/runtime/case.ts fills) and
// handed to the filler with the form field (engine/runtime/forms.ts `compared`, engine/form-values.ts), as the facts a
// "recorded" Yes/No names already are (recordedDerivation), even where no form field of that form reads it itself.
// The filler is asked, never a second reading of the step's words: the step is run once on a stand-in value, and the facts
// it reads from the same person are the ones it compares. So every spelling the filler runs is covered, and a spelling it
// cannot run names nothing. Only a step that says "equals" is read (a tick by a word, "A if <fact> = <word>", is not a
// comparison of two facts); a "recorded" Yes/No is left to recordedDerivation. Pure: no database, no clock. US$0.
import { recordedDerivation, runTransform } from "../../../p5/transforms.ts";

const PROBE = "same";
const cache = new Map<string, string[]>();

/** The facts (other than the form field's own) that its steps compare the field's own value with; [] when none. */
export function comparedFacts(transform: string | null | undefined, ownFact: string | null | undefined): string[] {
  if (!transform || !ownFact || !/\bequals\b/i.test(transform) || recordedDerivation(transform)) return [];
  const key = `${ownFact}\n${transform}`;
  let out = cache.get(key);
  if (!out) {
    const read: string[] = [];
    runTransform(transform, PROBE, {}, { ownFact, fact: (k) => { if (!read.includes(k)) read.push(k); return PROBE; } });
    out = read.filter((k) => k !== ownFact);
    cache.set(key, out);
  }
  return [...out];
}
