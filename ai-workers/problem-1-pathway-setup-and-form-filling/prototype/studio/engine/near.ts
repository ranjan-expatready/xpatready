// The one near-duplicate rule (QA-159, folded into G-CORE B1's R3; first written for a draft in parts, engine/parts.ts):
// two names are near when they hold the same words in another order, when they are the same name in the singular and the
// plural (given name / given names), when one name holds every word of the other (at least two words in common, or the
// other is one word and the longer name starts with it: email / email address, citizenship / citizenship country;
// QA-159 retest, 3 Nov), or when their
// meanings are the same. Two names sharing one word only (family name / given name) are not near. Pure (P-249). An exact
// duplicate is not "near": R3's exact check refuses it.
const STOP = new Set(["of", "the", "a", "an"]);
/** The words of a library key ("person.full_name" → full, name; its group is left out) or of a label ("Full name"). */
export function nearWords(s: string, isKey = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(s)): string[] {
  const body = isKey ? s.split(".").slice(1).join("_") : s;
  return body.toLowerCase().normalize("NFKC").split(/[^\p{L}\p{N}]+/u).filter((w) => w && !STOP.has(w));
}
/** The rule's own words for why two items are near (C11.13: a reason a person gave is any other text). */
export const NEAR_WHY = { meaning: "the same meaning under two names", order: "the same words in another order", plural: "the same name in the singular and the plural", contained: "one name holds the other" } as const;
/** One word in the singular (names → name, countries → country, addresses → address); "address", "status" and short
 *  words stay as they are. */
const singular = (w: string) => (w.length > 4 && w.endsWith("ies") ? `${w.slice(0, -3)}y` : w.length > 4 && /(sses|ches|shes|xes)$/.test(w) ? w.slice(0, -2)
  : w.length > 3 && w.endsWith("s") && !/(ss|us|is)$/.test(w) ? w.slice(0, -1) : w);
/** A word's possible singulars: a word in -uses may be -us or -use ("statuses" → status, "causes" → cause; Devin on #700);
 *  two words match when any of their forms do. Only -uses gets a second form, so "notes" never reads as "not". */
const forms = (w: string): string[] => { const s = singular(w); return w.length > 5 && w.endsWith("uses") ? [s, w.slice(0, -2)] : [s]; };
export const isRuleWhy = (s: string) => (Object.values(NEAR_WHY) as string[]).includes(s);
const normMeaning = (m: string) => m.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
/** Why two names are near duplicates, in words, or null. `meanings` compares what they mean when both are given. */
export function nearWhy(a: string, b: string, meanings?: { a?: string | null; b?: string | null }, opts: { oneWord?: boolean } = {}): string | null {
  const ra = nearWords(a), rb = nearWords(b);
  if (!ra.length || !rb.length) return null;
  const fa = ra.map(forms), fb = rb.map(forms);
  const has = (x: string[], ys: string[][]) => ys.some((y) => x.some((f) => y.includes(f)));
  const inB = fa.filter((x) => has(x, fb)).length, inA = fb.filter((y) => has(y, fa)).length;
  const sameWords = inB === fa.length && inA === fb.length;
  const sameOrder = sameWords && fa.length === fb.length && fa.every((x, i) => has(x, [fb[i]])) && ra.join(" ") !== rb.join(" ");
  // QA-159 retest: a one-word name that is the first word of a longer one (email / email address, citizenship /
  // citizenship country) is near; one word in common between two longer names (family name / given name), or a one-word
  // name inside another's middle (citizenship / subject of citizenship revocation, review m1 on #700), is not.
  // Not across groups (opts.oneWord false): "Name" (organisation.name) is not near "Given name" (person.given_name).
  const [short, long] = fa.length <= fb.length ? [fa, fb] : [fb, fa];
  const oneWord = opts.oneWord !== false && short.length === 1 && long.length > 1 && has(short[0], [long[0]]);
  const contained = (inB === fa.length || inA === fb.length) && (Math.min(inB, inA) >= 2 || oneWord);
  const sameMeaning = !!meanings?.a && !!meanings?.b && normMeaning(meanings.a) === normMeaning(meanings.b);
  return sameMeaning ? NEAR_WHY.meaning : sameOrder ? NEAR_WHY.plural : sameWords ? NEAR_WHY.order : contained ? NEAR_WHY.contained : null;
}

export type NearItem = { key?: string | null; name: string; meaning?: string | null };
/** The candidates an item is a near duplicate of: by key (within one group when both have a key) or by name, each with
 *  why; an exact same key or name is left to the exact check. */
export function nearMatches(item: NearItem, candidates: NearItem[]): { key: string | null; name: string; why: string }[] {
  const out: { key: string | null; name: string; why: string }[] = [];
  const group = (k?: string | null) => (k && k.includes(".") ? k.split(".")[0] : null);
  for (const c of candidates) {
    if ((item.key && c.key && item.key === c.key) || item.name.trim().toLowerCase() === c.name.trim().toLowerCase()) continue;
    const byKey = item.key && c.key && group(item.key) === group(c.key) ? nearWhy(item.key, c.key, { a: item.meaning, b: c.meaning }) : null;
    const otherGroup = !!item.key && !!c.key && group(item.key) !== group(c.key);
    const why = byKey ?? nearWhy(item.name, c.name, { a: item.meaning, b: c.meaning }, { oneWord: !otherGroup });
    if (why && !out.some((o) => o.name === c.name)) out.push({ key: c.key ?? null, name: c.name, why });
  }
  return out;
}
