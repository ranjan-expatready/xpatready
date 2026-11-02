// QA-73 (F8): the words in the Item column of a combination's Review and release tab. A calculated answer's label is its
// whole definition (up to about 250 characters), so it shows the answer's short name and keeps the definition in the
// tip. Every other kind keeps its own label (its key would mislead: "Single" for a combination, "R-01" for a rule);
// a long one is clamped on screen with the full text in the tip. Pure, so tests/check_review_item_words.ts can run it.
export const ITEM_MAX = 60;
export const CALCULATED_KIND = "Derived definition";

export function itemCell(c: { kind: string; key: string; label?: string | null }, inWords: (s: string) => string, shortName: (key: string) => string) {
  const label = c.label ? inWords(c.label) : "";
  if (!label) return { text: c.key, tip: c.key, clamp: false };
  if (label.length <= ITEM_MAX) return { text: label, tip: c.key, clamp: false };
  if (c.kind === CALCULATED_KIND) return { text: shortName(c.key), tip: label, clamp: false };
  return { text: label, tip: label, clamp: true };
}
