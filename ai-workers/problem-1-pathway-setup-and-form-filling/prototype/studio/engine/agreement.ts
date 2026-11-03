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

// ─────────────────────────────────────── QA-176 (G-CORE B3 part A): the one P-121 rating every proposal is held to
/** Why an AI item is not Ready, in plain words (the review box shows it). */
export const P121_WHY = {
  oneRound: "Needs a checker round: only one AI reading is saved, so it is never Ready and is decided on its own.",
  noRounds: "No AI reading is saved for it (neither the draft nor the checker round), so it is never Ready and is decided on its own.",
  differ: "The two AI readings differ: a person chooses.",
  noRules: "No rules check was recorded for it, so a person checks it.",
  ruleFailed: (whys: string[]) => `A rule did not pass (${whys.join("; ")}), so a person checks it.`,
} as const;
type Band = "ready" | "check" | "decide";
export type Rateable = { origin: "ai" | "rules"; agreement: string; rounds: { draft: unknown; check: unknown }; rules: { rule: string; passed: boolean; why: string | null }[]; confidence: Band; reason: string | null };
/** P-121: an AI item is Ready only when both rounds were read, they agree, and the rules ran and all passed. Any other AI
 *  item a producer rated Ready is lowered, with the reason in front of the producer's own: one round or no checker round →
 *  Decide; readings that differ → Decide; no rules recorded, or a rule failed → Check. Items not rated Ready, and items
 *  the rules made (no AI reading), keep their rating. Pure: no I/O. */
export function p121Rating(x: Rateable): { confidence: Band; reason: string | null } {
  if (x.confidence !== "ready" || x.origin !== "ai") return { confidence: x.confidence, reason: x.reason };
  const say = (why: string) => `${why}${x.reason ? ` ${x.reason}` : ""}`.slice(0, 500);
  // A producer that says one round (the saved field-map runs keep their one reading in the run, not in `rounds`).
  if (x.agreement === "one_round") return { confidence: "decide", reason: say(P121_WHY.oneRound) };
  if (!x.rounds.draft && !x.rounds.check) return { confidence: "decide", reason: say(P121_WHY.noRounds) };
  if (!x.rounds.draft || !x.rounds.check) return { confidence: "decide", reason: say(P121_WHY.oneRound) };
  if (x.agreement !== "agreed") return { confidence: "decide", reason: say(P121_WHY.differ) };
  if (!x.rules.length) return { confidence: "check", reason: say(P121_WHY.noRules) };
  const failed = x.rules.filter((r) => !r.passed);
  if (failed.length) return { confidence: "check", reason: say(P121_WHY.ruleFailed(failed.map((r) => r.why ?? r.rule))) };
  return { confidence: "ready", reason: x.reason };
}
