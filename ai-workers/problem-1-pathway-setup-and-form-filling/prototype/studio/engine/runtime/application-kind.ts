// QA-415 (P-486, P-489; the QA-400 pattern): each person's kind of application ("Visitor", "Worker", "Student", …) is
// worked out from that person's own filing, never asked. A family's members may make different applications (a Study
// permit student's spouse applies for a work permit), and forms such as IMM 5476 and IMM 5645 name the kind of the
// application of the person they are about. Who files what comes from the same derivation as the case's filings and
// fees (filings.ts deriveFilings, with the release's filing modes and the filings people's lines add), so the forms
// and the fees never disagree. The word for each filing is data (samples/application-kinds.json): a filing a line or a
// role names is read by its name, the combination's own filing by the combination's key. No form, combination or
// program is named here (P-319, P-425). Pure: no database, no clock; tests/check_qa415_application_kind.ts.
import KINDS from "../../samples/application-kinds.json" with { type: "json" };
import type { Known } from "../render.ts";
import type { Snapshot } from "../snapshot.ts";
import { releaseModes } from "../filing-modes.ts";
import { addedFilings } from "./added-filings.ts";
import { deriveFilings, FEE_TABLE, rulesFrom, type FeeTable } from "./filings.ts";
import type { Participant } from "./case.ts";
import { APPLICATION_TYPE, NotWorkedOut } from "../not-worked-out.ts";

export { APPLICATION_TYPE };
export const APPLICATION_TYPE_SOURCE = "worked out: the person's own filing";
export { NotWorkedOut };
export type KindTable = { filings: Record<string, string>; combinations: Record<string, string> };
export const KIND_TABLE = KINDS as unknown as KindTable;

/** A word from the table when it is one (an own property holding words), else none: a missing or broken entry gives no
 *  value, so the form field goes by hand with its reason, never a guess. */
const wordIn = (m: Record<string, string> | undefined, key: string): string | undefined => {
  const v = m && typeof m === "object" && Object.hasOwn(m, key) ? (m as Record<string, unknown>)[key] : undefined;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};

/** The filing a role makes in a combination when the fee table names one (BK-15's fees by role), read through the fee
 *  table's own soundness check (filings.ts rulesFrom), so a filing the fees do not use is never read here either. */
const roleFiling = (table: FeeTable, combinationKey: string, role: string): string | undefined =>
  (rulesFrom(table, combinationKey) as { byRole?: Map<string, { filing?: string }> } | undefined)?.byRole?.get(role)?.filing;

/** Per person applying (subject id), the kind of their own application: the filing their line adds when its rule holds,
 *  else the filing their role makes, else the combination's own. A person on another person's application (on the
 *  principal's) has that application's kind. A person declared only, or not applying, gets none (no form asks it of
 *  them). A person applying whose kind cannot be worked out (their own rule not answered yet, whoever's application they
 *  are on; a filing the table has no word for; no filing worked out at all) gets NotWorkedOut with the reason: by hand. */
export function applicationKindsOf(s: Snapshot, known: Known, people: Participant[], table: KindTable = KIND_TABLE, fees: FeeTable = FEE_TABLE): Map<string, string | NotWorkedOut> {
  const out = new Map<string, string | NotWorkedOut>();
  const key = s.combination?.key;
  if (!key) return out;
  const adds = addedFilings(s, known, people) as Map<string, { filing: string; waits?: string }>;
  // The same fee table for who files what and for the filing a role makes (the shipped one on a case).
  const d = deriveFilings(key, people, (k) => rulesFrom(fees, k), { modes: releaseModes(s.combination.participants ?? []), adds, label: s.combination.label });
  if (!d.derived) {
    for (const p of people) if (p.role !== "case" && p.applies) out.set(p.subjectId, new NotWorkedOut("This combination works out no filing for anyone yet, so the kind of each person's application is not known: write it by hand."));
    return out;
  }
  for (const f of d.filings) {
    if (!f.owner) continue;
    const added = adds.get(f.owner.subject);
    const named = added && !added.waits ? added.filing : roleFiling(fees, key, f.owner.role);
    const word = named !== undefined ? wordIn(table.filings, named) : wordIn(table.combinations, key);
    for (const a of f.applicants) {
      if (a.mode !== "applying") continue;
      // Review M2 (#1620): the applicant's own rule, whoever's application they are on, or the rule of the application
      // they are on: while it waits for its answer, no kind is guessed.
      const waits = adds.get(a.subject)?.waits ?? added?.waits;
      if (waits) out.set(a.subject, new NotWorkedOut(`${a.label}'s application waits for an answer: whether ${waits}. Its kind is worked out once that is answered; until then write it by hand.`));
      else if (word) out.set(a.subject, word);
      else out.set(a.subject, new NotWorkedOut(`The product has no kind of application for ${named !== undefined ? `a "${named}" application` : "this combination's application"} yet: write it by hand.`));
    }
  }
  return out;
}
