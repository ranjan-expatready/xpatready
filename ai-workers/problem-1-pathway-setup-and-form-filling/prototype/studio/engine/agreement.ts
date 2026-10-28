// P-121 agreement rule (S4 form finder; reused by S6 drafts of the shared library): every AI proposal has a draft round
// and an independent checker round, and the rules run on both. Pure: no I/O.
//  - an answer that fails the rules is dropped and listed with the rules' reason;
//  - both rounds pass the rules and give the same reading → agreed (High);
//  - the readings differ, or only one round stands → "Decide" (Low, both reasons kept; no third round, a person decides).

/** One round's answer about one item: its key (a form number, a box), its reading (always · condition …) and the item. */
export type RoundAnswer<T> = { key: string; reading: string; item: T };
export type Agreement<T> = {
  agreed: { key: string; item: T }[];
  decide: { key: string; draft: T | null; check: T | null; why: string }[];
  dropped: { key: string; why: string }[];
};

/** Compares the two rounds item by item; `rules` returns null when an answer passes, else the plain reason it fails. */
export function compareRounds<T>(draft: RoundAnswer<T>[], check: RoundAnswer<T>[], rules: (a: RoundAnswer<T>) => string | null): Agreement<T> {
  const out: Agreement<T> = { agreed: [], decide: [], dropped: [] };
  for (const key of [...new Set([...draft, ...check].map((a) => a.key))]) {
    const d = draft.find((a) => a.key === key), k = check.find((a) => a.key === key);
    const failed = [d, k].filter((a): a is RoundAnswer<T> => !!a).map((a) => ({ a, why: rules(a) })).filter((x) => x.why);
    for (const f of failed) out.dropped.push({ key, why: f.why! });
    const dv = d && !failed.some((f) => f.a === d) ? d : undefined, kv = k && !failed.some((f) => f.a === k) ? k : undefined;
    if (dv && kv && dv.reading === kv.reading) out.agreed.push({ key, item: dv.item });
    else if (dv || kv) out.decide.push({ key, draft: dv?.item ?? null, check: kv?.item ?? null, why: dv && kv ? `The two AI rounds read it differently (${dv.reading} / ${kv.reading}).` : `Only one AI round named it${failed.length ? " (the other's answer failed the rules)" : ""}.` });
  }
  return out;
}
