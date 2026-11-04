// C7.6 Ready to file (runtime lane, M3-E; L-SA3 under P-315, P-237, P-238): one case's readiness inputs for
// engine/runtime/readiness.ts, gathered from the prepare view's own items (api/src/case-prepare.ts) and the stored
// reviews, passes, open findings, checklist lines and accepted-until dates. Read only; the routes are api/src/readiness.ts.
// Not here yet: open checks between an answer and a document (C6.5's checks), a fee's valid-until date (no dated fee
// table yet), out-of-date signed items (C9.2) and Express Entry's police and medical block (P-172).
import { filingReadiness, WARN_CODES, type DocumentItem, type Finding, type FilingReadiness, type FormItem, type Owes, type Pass, type WarnCode } from "../../engine/runtime/readiness.ts";
import type { Channel, Signature } from "../../contracts/forms.ts";
import type { Readiness } from "../../contracts/runtime.ts";
import type { Db } from "./core.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RECEIVED = new Set(["received", "being_checked", "approved"]);
const SIGNER: Record<string, string> = { person: "the person", parent: "a parent", principal: "the principal applicant", representative: "the representative" };

/** What the prepare view already worked out for one form item (case-prepare.ts), as readiness reads it. */
export type PreparedForm = { id: string; filing: string; subject: string; person: string; form: string; channel: Channel; signature: Signature; signed_by: string | null; signers: string[]; state: string;
  steps?: { key: string; done: boolean | null }[] };
export type ReadinessInputs = {
  workspaceId: string; caseId: string; filings: string[];
  forms: PreparedForm[];
  /** Documents per person: the derived checklist's lines (required or not), by document type. */
  documents: { subject: string; person: string; filing: string; item?: string; document_type: string; label: string; required: boolean }[];
  /** The per-form fact result (engine/runtime/forms.ts readiness) and who owes each fact. */
  factsOf: (form: string, subject: string) => Readiness;
  owesFact: (fact: string, subject: string) => Owes;
  /** Whether a validated copy is read back and still matches today's facts (C-9, C-10). */
  validatedCurrent: (form: string, subject: string) => boolean;
  /** Each form item's signing steps done (C8.1): a scan received means signed. */
  scanned: (item: string) => boolean;
  /** The edition each form is filed on (the release's), by form number and channel. */
  editionOf: (form: string, channel: string) => string | null;
  /** Online sections entered before a fact changed (C7.3), per item. */
  enteredStale: Map<string, string[]>;
  barcode: (form: string) => boolean;
  today: Date;
};
export type ReadinessView = { filing: string; ready: boolean; status_rule: string;
  blocks: FilingReadiness["blocks"]; warns: FilingReadiness["warns"]; passed: FilingReadiness["passed"]; owes: FilingReadiness["owes"];
  reviewed: { by: string; kind: string; licence_number: string | null; at: string } | null };

/** Every filing's readiness on one case, from the prepare view's own items and the stored reviews, passes, findings,
 *  checklist lines and accepted-until dates. */
export async function readinessOfCase(db: Db, x: ReadinessInputs): Promise<ReadinessView[]> {
  const ids = x.filings.filter((f) => UUID.test(f));
  const [reviews, passes, findings, lines] = await Promise.all([
    db.filingReview.findMany({ where: { filingId: { in: ids } }, orderBy: [{ reviewedAt: "desc" }, { id: "asc" }] }),
    db.readinessPass.findMany({ where: { filingId: { in: ids } }, orderBy: [{ passedAt: "asc" }, { id: "asc" }] }),
    db.reviewFinding.findMany({ where: { caseId: x.caseId, filingId: { in: ids }, state: "open" }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    db.checklistLine.findMany({ where: { caseId: x.caseId }, select: { subjectId: true, documentType: true, state: true } }),
  ]);
  // P-151 (1): the newest accepted-until row of each edition the case's forms are filed on.
  const labels = [...new Set(x.forms.map((f) => x.editionOf(f.form, f.channel)).filter((l): l is string => !!l))];
  const editions = labels.length ? await db.formEdition.findMany({ where: { workspaceId: x.workspaceId, editionLabel: { in: labels } }, select: { id: true, editionLabel: true, acceptedUntil: { orderBy: [{ setAt: "desc" }, { id: "desc" }], take: 1 } } }) : [];
  const untilOf = new Map(editions.map((e) => [e.editionLabel, e.acceptedUntil[0]?.acceptedUntil ? e.acceptedUntil[0].acceptedUntil.toISOString().slice(0, 10) : null]));
  const lineState = new Map(lines.map((l) => [`${l.subjectId}|${l.documentType}`, l.state]));
  const today = x.today.toISOString().slice(0, 10);
  return x.filings.map((filing) => {
    const forms: FormItem[] = x.forms.filter((f) => f.filing === filing).map((f) => {
      const label = x.editionOf(f.form, f.channel), until = label ? untilOf.get(label) ?? null : null;
      const facts = x.factsOf(f.form, f.subject);
      const owesFact: Record<string, Owes> = Object.fromEntries(facts.missing.map((m) => [m.fact, x.owesFact(m.fact, f.subject)]));
      // Signed: a hand-signed scan received (C8.1); on Paper, the "sign in pen" step done (C7.7 part 2).
      const signed = f.signature === "HAND_SCANNED" ? x.scanned(f.id) : f.signature === "PEN" ? !!f.steps?.some((s) => s.key === "sign_in_pen" && s.done) : false;
      const signers = f.signers.map((s) => SIGNER[s] ?? s);
      return { item: f.id, form: f.form, subject: f.subject, person: f.person, channel: f.channel, readiness: facts, owesFact,
        needsValidate: x.barcode(f.form), validatedCurrent: x.validatedCurrent(f.form, f.subject), signature: f.signature, signed, signers, signedBy: f.signed_by,
        signerOwes: f.signers.length && f.signers.every((s) => s === "representative") ? "representative" : "client",
        // An accepted-until date is set only on an edition IRCC has replaced (P-151 (1)): it is superseded until then.
        edition: label ? { label, superseded: until !== null, acceptedUntil: until } : null,
        enteredOutOfDate: x.enteredStale.get(f.id) ?? [] } satisfies FormItem;
    });
    const documents: DocumentItem[] = x.documents.filter((d) => d.filing === filing).map((d) => {
      const st = lineState.get(`${d.subject}|${d.document_type}`);
      return { item: d.item, label: d.label, subject: d.subject, person: d.person, required: d.required && st !== "not_applicable", received: !!st && RECEIVED.has(st), owes: "client" };
    });
    const found: Finding[] = findings.filter((g) => g.filingId === filing).map((g) => ({ id: g.id, subject: g.subjectId, form: g.form ?? undefined, severity: (["CRITICAL", "MAJOR", "MINOR", "INFO"].includes(g.severity.toUpperCase()) ? g.severity.toUpperCase() : "INFO") as Finding["severity"], words: g.quote }));
    const review = reviews.find((r) => r.filingId === filing) ?? null;
    const mine: Pass[] = passes.filter((p) => p.filingId === filing && (WARN_CODES as readonly string[]).includes(p.code)).map((p) => ({ code: p.code as WarnCode, keys: p.keys, reason: p.reason, by: p.passedBy, at: p.passedAt.toISOString() }));
    const r = filingReadiness({ filing, forms, documents, findings: found, reviewed: !!review, passes: mine, today });
    return { ...r, status_rule: "P-315: only a barcode form without its validated copy blocks; every other line is passed with a reason or fixed.",
      reviewed: review ? { by: review.reviewedBy, kind: review.kind, licence_number: review.licenceNumber, at: review.reviewedAt.toISOString() } : null };
  });
}

