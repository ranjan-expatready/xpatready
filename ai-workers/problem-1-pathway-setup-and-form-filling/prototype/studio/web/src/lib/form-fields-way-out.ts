// B86, QA-237, QA-402: which problem on Review and release gets "Form fields that read this answer" under it. Pure (no
// React), so the release check's own messages are tested against it (tests/check_forms_held_conditions_pure.ts).
/** B86: the rule's own opening words; the problem's item is the question it names. */
export const HIDING = /^Hiding a value a form reads/;
/** QA-237, QA-239: a library condition this combination cannot honour is held (engine/held-conditions.ts HELD_OPENING). */
export const HELD = /^Condition not used on this combination/;
/** QA-402: a form that writes the answer only under its own condition (a gate, B107) is not changed from that door. */
const GATED = /\(the form's own condition\)/;
/** The door is the way out of a refusal whose form field reads the answer outside the condition, and of a held condition
 *  whose own words send the author there; never of one whose only reason is a form's own condition (QA-402: the door
 *  lists no gated form field, so it read "No form reads this answer" under a warning that names that form). */
export const wayOut = (m?: string) => (HIDING.test(m ?? "") && !GATED.test(m ?? "")) || (HELD.test(m ?? "") && /\(Form fields that read this answer\)/.test(m ?? ""));
