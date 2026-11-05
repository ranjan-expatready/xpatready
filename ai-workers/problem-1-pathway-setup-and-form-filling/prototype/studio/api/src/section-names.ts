// B78 (C10.1 row 7; P-319: never a form number in code): the names a person gives the sections the rules pass holds for a
// name, from samples/section-names.json. A section with no entry is never named: it stays waiting on To review.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STUDIO } from "./core.ts";

export type HeldSectionName = { form: string; first_field: string; name: string; printed: string; page: number; basis: "printed" | "sample" };
const flat = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const keyOf = (form: string, firstField: string) => `${form}\n${firstField}`;

/** The entries, checked as the naming box on To review checks a typed name: two characters or more, never a placeholder. */
export function heldSectionNames(raw: { sections: HeldSectionName[] }): Map<string, HeldSectionName> {
  const out = new Map<string, HeldSectionName>();
  for (const s of raw.sections) {
    if (flat(s.name).length < 2 || flat(s.name).startsWith("unnamedsection")) throw new Error(`section-names: "${s.name}" (${s.form}) is not a name a person could give`);
    if (s.basis !== "printed" && s.basis !== "sample") throw new Error(`section-names: "${s.name}" (${s.form}) says neither printed nor sample`);
    if (out.has(keyOf(s.form, s.first_field))) throw new Error(`section-names: ${s.form} names ${s.first_field} twice`);
    out.set(keyOf(s.form, s.first_field), s);
  }
  return out;
}
export const readHeldSectionNames = () => heldSectionNames(JSON.parse(readFileSync(join(STUDIO, "samples", "section-names.json"), "utf8")) as { sections: HeldSectionName[] });
/** The name a person gives this held section (its form edition and first form field), or null: it stays waiting. */
export const nameOfHeld = (names: Map<string, HeldSectionName>, form: string | null, firstField: string | undefined) => (form && firstField ? names.get(keyOf(form, firstField)) ?? null : null);
/** The reason on the naming edit: where the words come from, always marked (AGENTS.md rule 4). */
export const namedReason = (s: HeldSectionName) => s.basis === "printed"
  ? `Named by the sample loader through the person's naming step, from the words the form prints, "${s.printed}" (${s.form}, page ${s.page}) (Sample); rename it on Shared library if a person words it better.`
  : `Named by the sample loader through the person's naming step, in a person's words built from the form's own captions (${s.form}, page ${s.page}) (Sample, Unconfirmed: expert); rename it on Shared library if a person words it better.`;
