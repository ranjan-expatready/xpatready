// C7.6 Ready to file (runtime lane, M3-E; L-SA3 under P-315, P-237, P-238): one case's readiness inputs for
// engine/runtime/readiness.ts, gathered from the prepare view's own items (api/src/case-prepare.ts) and the stored
// reviews, passes, open findings, checklist lines and accepted-until dates. Read only; the routes are api/src/readiness.ts.
// Not here yet: open checks between an answer and a document (C6.5's checks), a fee's valid-until date (no dated fee
// table yet), out-of-date signed items (C9.2) and Express Entry's police and medical block (P-172).
import { filingReadiness, WARN_CODES, type DocumentItem, type Finding, type FilingReadiness, type FormItem, type OpenCheck, type Owes, type Pass, type WarnCode } from "../../engine/runtime/readiness.ts";
import type { Channel, Signature } from "../../contracts/forms.ts";
import type { Readiness } from "../../contracts/runtime.ts";
import { createHash } from "node:crypto";
import type { Db } from "./core.ts";
import { changedGroups, type GroupFact } from "../../engine/runtime/forms.ts";
import { fileStampCurrent, stampCurrent } from "../../engine/runtime/review.ts";
import { closedOnce, readinessFigure, type ClosedFinding, type Figure } from "../../engine/runtime/readiness-figure.ts";
import { caseWork } from "./case-work.ts"; // BK-18 (QA-448): who really prepared the filing
import { preparersOf } from "../../engine/runtime/preparers.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RECEIVED = new Set(["received", "being_checked", "approved"]);
const SIGNER: Record<string, string> = { person: "the person", parent: "a parent", principal: "the principal applicant", representative: "the representative" };

/** What the prepare view already worked out for one form item (case-prepare.ts), as readiness reads it. */
export type PreparedForm = { id: string; filing: string; subject: string; person: string; form: string; channel: Channel; signature: Signature; signed_by: string | null; signers?: string[]; state: string;
  reason?: string; steps?: { key: string; done: boolean | null }[];
  /** C9.2 (BR-12, P-136): a validated, signed or uploaded copy of it is out of date: the first fact changed and when. */
  outOfDate?: { fact: string; since: string; key?: string; words?: string } | null;
  /** C7.8 (B141 BR-7): a blank official PDF the case officer added; completed once its copy is uploaded. */
  blank?: { completed: boolean; key: string } };
// Review B1 on #861: `signers` may be missing on a line (`signers?` in its type), so readiness never assumes it.
export type ReadinessInputs = {
  workspaceId: string; caseId: string; filings: string[];
  forms: PreparedForm[];
  /** Documents per person: the derived checklist's lines (required or not), by document type. */
  documents: { subject: string; person: string; filing: string; item?: string; document_type: string; label: string; required: boolean;
    /** M3-S4 (P-172): the release's line is never waivable (blocks Ready to file until received, whatever its state). */
    never_waivable?: boolean;
    /** M3-S4 break M1: a never waivable line that may be needed: the questions it waits for (it blocks until answered). */
    waiting?: string }[];
  /** The per-form fact result (engine/runtime/forms.ts readiness) and who owes each fact. */
  factsOf: (form: string, subject: string) => Readiness;
  owesFact: (fact: string, subject: string) => Owes;
  /** C7.9: the must-verify facts this form writes for this person that rest on an unchecked client-given value. */
  unverifiedOf?: (form: string, subject: string) => { fact: string; label: string; key: string }[];
  /** Whether a validated copy is read back and still matches today's facts (C-9, C-10). */
  validatedCurrent: (form: string, subject: string) => boolean;
  /** C8.3 QA-345: the fingerprint of the validated copy that counts for filing, else null. Left out: none counts. */
  validatedSha?: (form: string, subject: string) => string | null;
  /** Each form item's signing steps done (C8.1): a scan received means signed. */
  scanned: (item: string) => boolean;
  /** The edition each form is filed on (the release's), by form number and channel. */
  editionOf: (form: string, channel: string) => string | null;
  /** C7.7 (BR-9): the boxes the newest copy of a form leaves "To write by hand", in the copy's own words. Left out: none. */
  byHand?: (form: string, subject: string) => { copy: string; box: string; label: string; why: string; caption?: string | null }[];
  /** B162: the form's newest copy for filing for this person, on any release of the case: none, older than today's facts
   *  (stale) or current, with the key its line carries (the release for none, the copy for stale). Required (review M2):
   *  a caller that does not say can never leave the line out by accident. */
  copy: (form: string, subject: string) => { state: "none" | "stale" | "current"; key: string };
  /** Online sections entered before a fact changed (C7.3), per item. */
  enteredStale: Map<string, string[]>;
  barcode: (form: string) => boolean;
  /** The fingerprint of the facts one form reads for one person (engine/runtime/forms.ts inputHash of its coverage). */
  factsHash: (form: string, subject: string) => string;
  /** C9.5 (BR-6, challenge M5): whether a review with equal facts still counts after the case's newest move (made after
   *  it, or the move touched nothing on the filing); null words: it stands. Left out: every such review stands. */
  reviewAfterMove?: (filing: string, reviewedAt: Date) => string | null;
  /** C9.5 (BR-8, challenge M6): a newer release touches this filing: the warning's words and key (only touched filings). */
  releaseUpdate?: (filing: string) => { words: string; key: string } | null;
  today: Date;
};
export type ReadinessView = { filing: string; ready: boolean; status_rule: string;
  blocks: FilingReadiness["blocks"]; warns: FilingReadiness["warns"]; passed: FilingReadiness["passed"]; owes: FilingReadiness["owes"];
  reviewed: { by: string; kind: string; licence_number: string | null; at: string } | null;
  /** BK-18 (QA-448): the people the case's own work record names as having prepared it, earliest act first — never its
   *  team list. Empty when the case holds nobody's work (said plainly on the screen, never guessed). */
  prepared_by: string[];
  /** The filing's facts fingerprint now (the review route stores it) and the representative of record now. */
  facts_hash: string; representative: string | null };

/** B162: the state of a form's newest copy for filing, as the copy view judges it (fill-case.ts: changedFacts and
 *  changedGroups). `copy` is that copy (its id, its facts fingerprint, the repeating groups it was made with; an older
 *  copy without a group record compares facts only, as changedGroups does), `now` the form's facts fingerprint and groups
 *  today. Current only when both are unchanged (Devin on #1344: a group-only change, an entry added or removed or "none
 *  apply" changed, leaves the fingerprint equal). The key is the release for none and the copy for stale. */
export function copyStateOf(copy: { id: string; hash: string; groups?: GroupFact[] | null } | undefined, now: { hash: string; groups: GroupFact[] }, releaseKey: string): { state: "none" | "stale" | "current"; key: string } {
  if (!copy) return { state: "none", key: releaseKey };
  return copy.hash === now.hash && !changedGroups(copy.groups ?? undefined, now.groups).length ? { state: "current", key: copy.id } : { state: "stale", key: copy.id };
}

/** Breaker N1 (#861 round 2) with C9.5's build discovery D1: the part of a form's facts fingerprint that holds every fact
 *  it still waits for, with each answer given to it now. The answers are sorted, so the order a read returns them in
 *  never changes the fingerprint (a review was withdrawn with no fact changed, 2 of 4 pack runs). */
export function waitingFactsKey(missing: { fact: string; about: string; reason: string }[], answers: { field: string; subjectId: string; rowKey: string | null; value: unknown }[]): string {
  return JSON.stringify(missing.map((m) => [m.fact, m.about, m.reason, answers.filter((x) => x.field === m.fact).map((x) => [x.subjectId, x.rowKey, x.value]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))]));
}

/** Every filing's readiness on one case, from the prepare view's own items and the stored reviews, passes, findings,
 *  checklist lines and accepted-until dates. */
export async function readinessOfCase(db: Db, x: ReadinessInputs): Promise<(ReadinessView & { figure: Figure })[]> {
  const ids = x.filings.filter((f) => UUID.test(f));
  // One query at a time (C6.12 break B1: 120 reads at once on one case must not starve the connection pool; parallel
  // reads here made the view's own read transaction wait past its start limit and answer 500).
  const rows = ids.length ? await db.filing.findMany({ where: { id: { in: ids } }, select: { id: true,
    reviews: { orderBy: [{ reviewedAt: "desc" }, { id: "asc" }], take: 1 }, passes: { orderBy: [{ passedAt: "asc" }, { id: "asc" }] } } }) : [];
  const reviews = rows.flatMap((f) => f.reviews), passes = rows.flatMap((f) => f.passes);
  const findings = ids.length ? await db.reviewFinding.findMany({ where: { caseId: x.caseId, filingId: { in: ids }, state: "open" }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }) : [];
  // C7.10 (challenge M3): the filings' findings no longer open (closed in Review findings with a reason, or resolved by the
  // rules) stay counted in the readiness figure; handed to the figure only, never to C7.6's readiness.
  const closedFindings = ids.length ? await db.reviewFinding.findMany({ where: { caseId: x.caseId, filingId: { in: ids }, state: { in: ["acknowledged", "waived", "dismissed", "resolved"] } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, filingId: true, subjectId: true, form: true, severity: true, state: true, quote: true, source: true, ruleKey: true } }) : [];
  // Review M1 on #1389: a rules finding is one check per rule and person, however many rows its edits left (closedOnce).
  const checkOf = (g: { source: string; ruleKey: string | null; subjectId: string }) => (g.source === "rules" && g.ruleKey ? `${g.ruleKey}|${g.subjectId}` : null);
  const rep = (await db.caseTeamMember.findFirst({ where: { caseId: x.caseId, role: "LEAD_REPRESENTATIVE", endedAt: null }, select: { userId: true } }))?.userId ?? null;
  // BK-18 (QA-448): who prepared the filings, from the case's own work record (api/src/case-work.ts), for the record the
  // Ready to file panel shows; the case team's officers are who may work on it, never proof that they did. Read once for
  // the case; each filing names who had worked on it when its review was made (review B2: later work never rewrites a
  // record that was already made).
  const work = await caseWork(db, x.caseId);
  // C8.3 (break B1): each filing's newest review round row; a review counts only while that row is the approval that
  // wrote it (a filing sent for review again, or sent back, is no longer approved). Filings never sent: none.
  // QA-345: with each form's stamped file kind, so an approval counts only while it stamped the validated copy filed.
  const newestRow = new Map<string, { filingReviewId: string | null; forms: { formNumber: string; subjectId: string; stampFileKind: string | null; stampFileSha256: string | null; stampedAt: Date | null }[] }>();
  for (const r of ids.length ? await db.reviewRoundFiling.findMany({ where: { filingId: { in: ids } }, orderBy: [{ filingId: "asc" }, { filingRound: "desc" }], select: { filingId: true, filingReviewId: true, forms: { select: { formNumber: true, subjectId: true, stampFileKind: true, stampFileSha256: true, stampedAt: true } } } }) : []) if (!newestRow.has(r.filingId)) newestRow.set(r.filingId, r);
  // C6.5 (BR-7; C7.6 P-238): an open typed-versus-document check on a person of the filing is a CRITICAL warning.
  const openChecks = await db.answerCheck.findMany({ where: { caseId: x.caseId, state: "open" }, orderBy: [{ openedAt: "asc" }, { id: "asc" }], select: { subjectId: true, fact: true } });
  // Break M4: a check on the application's own facts (a letter's visit contact) warns on every filing of the case.
  const caseSubject = openChecks.length ? (await db.caseParticipant.findFirst({ where: { caseId: x.caseId, role: "case", subject: { stage: { state: "CURRENT" } } }, select: { subjectId: true } }))?.subjectId ?? null : null;
  const lines = x.documents.length ? await db.checklistLine.findMany({ where: { caseId: x.caseId, stage: { state: "CURRENT" } }, select: { subjectId: true, documentType: true, state: true } }) : [];
  // P-151 (1): the newest accepted-until row of each edition the case's forms are filed on.
  const labels = [...new Set(x.forms.map((f) => x.editionOf(f.form, f.channel)).filter((l): l is string => !!l))];
  const editions = labels.length ? await db.formEdition.findMany({ where: { workspaceId: x.workspaceId, editionLabel: { in: labels } }, select: { id: true, editionLabel: true, acceptedUntil: { orderBy: [{ setAt: "desc" }, { id: "desc" }], take: 1 } } }) : [];
  const untilOf = new Map(editions.map((e) => [e.editionLabel, e.acceptedUntil[0]?.acceptedUntil ? e.acceptedUntil[0].acceptedUntil.toISOString().slice(0, 10) : null]));
  const lineState = new Map(lines.map((l) => [`${l.subjectId}|${l.documentType}`, l.state]));
  const today = x.today.toISOString().slice(0, 10);
  return x.filings.map((filing) => {
    const mineForms = x.forms.filter((f) => f.filing === filing);
    // Break B2: what the representative reviews is the filing's forms and the facts they read, as they are now.
    const factsHash = createHash("sha256").update(mineForms.map((f) => `${f.form}|${f.subject}|${f.state === "cannot_start" ? "waits" : x.factsHash(f.form, f.subject)}`).sort().join("\n")).digest("hex");
    const forms: FormItem[] = mineForms.map((f) => {
      // Break B3: a form that cannot start yet (an answer decides whether it applies) is never dropped: it stands as a
      // CRITICAL "missing facts" line until that answer is in. No signature or Validate is waited for until it applies.
      // Break N5 (#861 round 2): a barcode form that may apply still waits for its own Validate: P-237's one hard stop is
      // never skipped by passing "whether it applies".
      if (f.state === "cannot_start") return { item: f.id, form: f.form, subject: f.subject, person: f.person, channel: f.channel, needsValidate: x.barcode(f.form), validatedCurrent: x.validatedCurrent(f.form, f.subject), signature: "TYPED_NAME", signed: false, edition: null,
        readiness: { ready: false, missing: [{ fact: `applies:${f.form}`, label: `whether ${f.form} applies (${(f.reason ?? "it waits for an answer").replace(/\.$/, "")})`, about: f.person, reason: "not answered" }] }, owesFact: { [`applies:${f.form}`]: "staff" } } satisfies FormItem;
      const label = x.editionOf(f.form, f.channel), until = label ? untilOf.get(label) ?? null : null;
      const facts = x.factsOf(f.form, f.subject);
      // B107 (QA-300): who owes a fact is told by the fact's own subject (a fact about the representative is the firm's, never
      // the client's); a fact missing for two people on one form is the client's if either owes it.
      const owesFact: Record<string, Owes> = {};
      for (const m of facts.missing) { const o = x.owesFact(m.fact, m.subject ?? f.subject); owesFact[m.fact] = owesFact[m.fact] === "client" ? "client" : o; }
      // Signed: a hand-signed scan received (C8.1); on Paper, the "sign in pen" step done (C7.7 part 2).
      const signed = f.signature === "HAND_SCANNED" ? x.scanned(f.id) : f.signature === "PEN" ? !!f.steps?.some((s) => s.key === "sign_in_pen" && s.done) : false;
      const who = f.signers ?? []; // never trusted to be there: a line without it reads as "each person who signs it"
      const signers = who.map((s) => SIGNER[s] ?? s);
      return { item: f.id, form: f.form, subject: f.subject, person: f.person, channel: f.channel, readiness: facts, owesFact, unverified: x.unverifiedOf?.(f.form, f.subject) ?? [],
        needsValidate: x.barcode(f.form), validatedCurrent: x.validatedCurrent(f.form, f.subject), signature: f.signature, signed, signers, signedBy: f.signed_by,
        signerOwes: who.length && who.every((s) => s === "representative") ? "representative" : "client",
        // An accepted-until date is set only on an edition IRCC has replaced (P-151 (1)): it is superseded until then.
        edition: label ? { label, superseded: until !== null, acceptedUntil: until } : null,
        enteredOutOfDate: x.enteredStale.get(f.id) ?? [], outOfDate: f.outOfDate ?? null, byHand: x.byHand?.(f.form, f.subject) ?? [], copy: x.copy(f.form, f.subject), blank: f.blank ?? null } satisfies FormItem;
    });
    const documents: DocumentItem[] = x.documents.filter((d) => d.filing === filing).map((d) => {
      const st = lineState.get(`${d.subject}|${d.document_type}`);
      return { item: d.item, label: d.label, subject: d.subject, person: d.person, required: d.required && st !== "not_applicable" && st !== "waived", received: !!st && RECEIVED.has(st), owes: "client", never_waivable: !!d.never_waivable, ...(d.waiting ? { waiting: d.waiting } : {}) };
    });
    const found: Finding[] = findings.filter((g) => g.filingId === filing).map((g) => ({ id: g.id, subject: g.subjectId, form: g.form ?? undefined, severity: (["CRITICAL", "MAJOR", "MINOR", "INFO"].includes(g.severity.toUpperCase()) ? g.severity.toUpperCase() : "INFO") as Finding["severity"], words: g.source === "ai" ? `the AI review (${g.agreement === "low" ? "Low: the two rounds disagree" : "High"}) flags what the form says, “${g.quote}”` : g.quote }));
    // Break B2: a review counts only when it was made by the representative of record now, for the facts as they are now.
    const latest = reviews.find((r) => r.filingId === filing) ?? null;
    // C8.3 (P-412 F1, challenge M2): the same rule function as each form's stamp on the representative's review.
    const row = newestRow.get(filing);
    const sameFacts = stampCurrent(latest ? { hash: latest.factsHash, by: latest.reviewedBy, superseded: !!row && row.filingReviewId !== latest.id } : null, { hash: factsHash, representative: rep }).current;
    // C9.5: a review made before a move that changed this filing is withdrawn by the move, and says so, whether or not
    // the move also changed the facts' fingerprint (a channel or signing change leaves it equal; a new form does not).
    const withdrawn = latest && latest.reviewedBy === rep ? x.reviewAfterMove?.(filing, latest.reviewedAt) ?? null : null;
    // QA-345 (ruling (a)): and only while every validated copy that counts for filing is the file its form's stamp holds
    // (the same rule as each form's stamp on the representative's review, fileStampCurrent).
    const fileStamped = !row || row.forms.every((f) => !f.stampedAt || fileStampCurrent({ kind: f.stampFileKind, sha256: f.stampFileSha256 }, x.validatedSha?.(f.formNumber, f.subjectId) ?? null));
    const review = sameFacts && !withdrawn && fileStamped ? latest : null;
    const mine: Pass[] = passes.filter((p) => p.filingId === filing && (WARN_CODES as readonly string[]).includes(p.code)).map((p) => ({ code: p.code as WarnCode, keys: p.keys, reason: p.reason, by: p.passedBy, at: p.passedAt.toISOString() }));
    const personOf = new Map(mineForms.map((f) => [f.subject, f.person]));
    if (caseSubject) personOf.set(caseSubject, "The application");
    const checks: OpenCheck[] = openChecks.filter((k) => personOf.has(k.subjectId)).map((k) => ({ fact: k.fact, label: k.fact.split(".").pop()!.replace(/_/g, " "), subject: k.subjectId, person: personOf.get(k.subjectId)! }));
    const input = { filing, forms, documents, openChecks: checks, findings: found, reviewed: !!review, reviewedBefore: !review && latest ? latest.reviewedAt.toISOString() : null, factsKey: factsHash.slice(0, 16), reviewWithdrawn: withdrawn, reviewFileUnstamped: sameFacts && !withdrawn && !fileStamped, releaseUpdate: x.releaseUpdate?.(filing) ?? null, passes: mine, today };
    const r = filingReadiness(input);
    // C7.10 (B143, BR-30): the filing's readiness figure from the same input and lines; the prepare view puts it beside
    // `readiness[]`, never inside an entry (C7.6's finish line stays: its entries carry no percentage).
    const openRuleChecks = findings.filter((g) => g.filingId === filing).map(checkOf).filter((k): k is string => !!k);
    const closed = closedOnce(closedFindings.filter((g) => g.filingId === filing).map((g) => ({ id: g.id, state: g.state as ClosedFinding["state"], check: checkOf(g),
      words: `${g.severity.toUpperCase()} finding${g.form ? ` on ${g.form}` : ""} (${g.state === "resolved" ? "resolved: the facts now agree" : `${g.state} with a reason in Review findings`}): ${g.source === "ai" ? "flagged by the AI review" : g.quote}` })), openRuleChecks);
    return { ...r, figure: readinessFigure(input, r, closed), status_rule: "P-315: only a barcode form without its validated copy blocks; every other line is passed with a reason or fixed.",
      reviewed: review ? { by: review.reviewedBy, kind: review.kind, licence_number: review.licenceNumber, at: review.reviewedAt.toISOString() } : null,
      prepared_by: preparersOf(work.acts, work.staff, review?.reviewedAt ?? null), facts_hash: factsHash, representative: rep };
  });
}

