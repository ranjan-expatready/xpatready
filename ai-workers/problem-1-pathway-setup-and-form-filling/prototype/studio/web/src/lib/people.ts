/** One way to say who can be in an application (QA-77, C11.12; board P-161 (2)): "Principal applicant (always)",
 *  "Child (travelling), 0–4 (optional)". The header's facts line, the folded Who can be line on Forms and the
 *  Questionnaires note all use it, so a person reads the same on every page of the combination (#113, runtime builder).
 *  A role whose most is 0 cannot be in the application and is left out (#139 review). */
export const personWords = (label: string, l: { min: number; max: number }) => `${label}${l.max > 1 ? `, ${l.min}–${l.max}` : ""} (${l.min > 0 ? "always" : "optional"})`;
export const peopleWords = <T extends { min: number; max: number }>(ps: T[] | null | undefined, name: (p: T) => string, sep = " · ") =>
  (ps ?? []).filter((p) => p.max > 0).map((p) => personWords(name(p), p)).join(sep);
