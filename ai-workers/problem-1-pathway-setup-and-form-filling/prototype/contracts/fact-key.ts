// The one naming rule for a library field (a "fact"), e.g. person.date_of_birth (Lead check A1, 23 Oct 2026).
// Every place that names or checks a fact uses this file: the field-map entry contract and the AI output schema carry
// FACT_KEY_PATTERN verbatim, the field-map prompt states FACT_KEY_RULE and the pattern, the conversion checks each AI
// entry with factKeyProblem, and the studio checks a person-typed key with newKeyProblem. tests/check_fact_key.ts fails
// when any of those copies differs from this file.
//
// Area: lower-case letters and underscores. Name: starts with a letter, then lower-case letters, digits and
// underscores. Digits are allowed because the library already allows them (released-configuration and
// combination-config definition ids, and the studio's own key check): the entry contract used to forbid them, so one
// AI name with "5" in it (person.became_pr_as_sponsored_partner_within_5_years) rejected 232 good IMM 1344 entries.

export const FACT_KEY_PATTERN = "^[a-z][a-z_]*\\.[a-z][a-z0-9_]*$";
export const FACT_KEY_MAX = 80;
/** Areas a person or the AI may start a new library field in. Older released fields keep their own areas (document.*). */
export const FACT_KEY_AREAS = ["person", "relationship", "case", "organisation", "representative"] as const;
export const FACT_KEY_RULE = "area.name in lower case: the area is person, relationship, case, organisation or representative; the name starts with a letter and uses only lower-case letters, digits and underscores (at most 80 characters in all)";

const RE = new RegExp(FACT_KEY_PATTERN);

/** Why a fact name breaks the rule, in plain words; null when it is fine. */
export function factKeyProblem(key: unknown): string | null {
  if (typeof key !== "string" || !key) return "no field name";
  if (key.length > FACT_KEY_MAX) return `"${key.slice(0, 40)}…" is longer than ${FACT_KEY_MAX} characters`;
  if (!RE.test(key)) return `"${key}" breaks the naming rule (${FACT_KEY_RULE})`;
  return null;
}

/** A new key a person types (or accepts from the AI) must also start in one of the areas. */
export function newKeyProblem(key: unknown): string | null {
  const p = factKeyProblem(key);
  if (p) return p;
  const area = String(key).split(".")[0];
  return (FACT_KEY_AREAS as readonly string[]).includes(area) ? null : `"${key}" starts in "${area}", which is not one of ${FACT_KEY_AREAS.join(", ")}`;
}
