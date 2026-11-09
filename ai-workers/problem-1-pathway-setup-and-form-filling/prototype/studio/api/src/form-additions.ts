// C7.8 Add a library form to one filing (screens lane, B141; SA-1B-177, SA-1B-102 rule 5; P-406; concept revision 2).
// The case officer adds one form from the firm's library to one filing, for one person on it. A form whose filling is
// proven (published map rows and a passed fill trial for its edition) fills from the case's facts; any other is the blank
// official PDF, filled by hand. Either way it is then listed, signed, checked, reviewed and filed like every other form,
// through the one join point (engine/runtime/added-forms.ts withAdditions, read by Runtime.snapshotOf).
//   GET  /runtime/filings/:id/addable-forms?q=&subject=   the library's forms, each with its kind in words or why not (BR-2, BR-3)
//   GET  /runtime/filings/:id/addable-forms/:form?subject= one form: its coverage on this case, or why it is blank
//   POST /runtime/filings/:id/form-additions               add it (frozen, BR-4; channel and signature set now, BR-6)
//   POST /runtime/form-additions/:id/remove                remove it, with a reason (BR-8)
//   GET  /runtime/form-additions/:id/blank                 the blank official PDF (its checksum checked first)
// Who (BR-9): case staff of the case's firm (Runtime.reach "officer": a client or configuration person 403, another
// firm 404); a case with anything recorded 409. US$0, no AI.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import type { Response } from "express";
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post, Query, Res } from "@nestjs/common";
import { ACTORS, actorOf, Audit, CaseRead, Db, fail, OFFICIAL, ROOT, RUNTIME_ACTORS, type Actor } from "./core.ts";
import { Runtime, type Reached } from "./runtime.ts";
import { refuseIfRecorded } from "./submission-record.ts";
import { trialFor, type EditionMap } from "./fill-trials.ts";
import { acceptsOf, allowedChannels } from "../../engine/channels.ts";
import { newestEdition } from "../../engine/editions.ts";
import { effective, snapEntry, snapField } from "../../engine/snapshot.ts";
import { formCoverage, releaseForms } from "../../engine/runtime/forms.ts";
import { knownOf } from "../../engine/runtime/case.ts";
import { render } from "../../engine/render.ts";
import type { Role } from "../../engine/resolver.ts";
import { ADDED_TAG, dayWords, frozenHash, KIND_WORDS, kindOf, refusalOf, withAdditions, type AddedKind, type Addition, type Frozen } from "../../engine/runtime/added-forms.ts";
import { isBarcodeForm, CHANNEL_WORDS, type Channel } from "../../contracts/forms.ts";
import { minorFromAnswers, signersOf } from "../../engine/runtime/signing.ts";

type H = string | undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const short = (id: string) => id.slice(0, 8);
const problem = (status: number, detail: string, field = "form") => new HttpException({ type: "https://expatready.local/problems/form-addition", title: "Not added", status, detail, errors: [{ field, message: detail }] }, status);
/** BR-6 (Q2): added forms are a PDF upload or on Paper in M3; Online is not offered. */
const ADD_CHANNELS: Channel[] = ["PDF_UPLOAD", "PAPER"];
/** Breaker m2: a person's name, never their id, on a screen ("Added by Case officer"). */
export const personName = (id: string) => ([...ACTORS, ...RUNTIME_ACTORS] as readonly { id: string; name: string }[]).find((x) => x.id === id)?.name ?? "a member of the firm";
/** Review M2: an audit line names a person by their role on the case, never their name. */
const roleWords = (c: Reached, subject: string) => (c.participants.find((p) => p.subjectId === subject)?.role ?? "person").replace(/_/g, " ");
const SIGNER_WORDS: Record<string, string> = { person: "the person", parent: "a parent", principal: "the principal applicant", representative: "the representative" };

/** One library form as this screen reads it: the form, its current PDF edition, its published map rows and trial. */
type LibForm = { form: string; title: string; formKind: string; editionId: string | null; edition: string | null; officialFile: string | null; sha256: string | null; inventoryFile: string | null; storedPath: string | null; entries: ReturnType<typeof snapEntry>[]; trial: ReturnType<typeof trialFor> };

@Injectable()
export class FormAdditions {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Runtime) private readonly r: Runtime, @Inject(Audit) private readonly audit: Audit) {}

  /** The filing (of a case this person may work on as case staff) and its case. */
  private async filing(actor: Actor, filingId: string) {
    const f = UUID.test(filingId) ? await this.db.filing.findUnique({ where: { id: filingId }, include: { applicants: true } }) : null;
    if (!f) fail("No such filing.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, f!.caseId, "officer");
    if (!f!.active) fail("This filing is no longer part of the case.", HttpStatus.NOT_FOUND);
    return { f: f!, c };
  }

  /** BR-1: the person on the filing it is for (default the filing's principal applicant); only an applying applicant. */
  private personOn(c: Reached, f: { subjectId: string; applicants: { subjectId: string; mode: string }[] }, subject: unknown) {
    const s = subject === undefined || subject === null || subject === "" ? f.subjectId : String(subject);
    const on = f.applicants.find((a) => a.subjectId === s && a.mode === "applying") ?? (s === f.subjectId ? { subjectId: s } : null);
    const p = on ? c.participants.find((x) => x.subjectId === s && x.role !== "case") : null;
    if (!p) throw problem(422, "That person is not on this filing: choose a person the filing is for.", "subject");
    return { subject: s, label: p!.subject.label };
  }

  /** The firm's library forms of type "form" with a current PDF edition (newest), not retired: their published map rows
   *  (the effective PUBLISHED row of each form field) and fill trial for that edition. Guides and checklists are left out
   *  (BR-2: never offered). */
  private async library(workspaceId: string, only?: string): Promise<LibForm[]> {
    const defs = await this.db.govFormDef.findMany({ where: { workspaceId, retiredAt: null, ...(only ? { formKey: only } : {}) }, include: { editions: { where: { channel: { not: "ONLINE" } } } }, orderBy: { formKey: "asc" } });
    const current = defs.map((d) => ({ d, e: newestEdition(d.editions) ?? null }));
    const ids = current.flatMap((x) => (x.e ? [x.e.id] : []));
    const rows = ids.length ? await this.db.formFieldMap.findMany({ where: { formEditionId: { in: ids } }, orderBy: { dataPath: "asc" } }) : [];
    const byEdition = new Map<string, typeof rows>();
    for (const m of rows) byEdition.set(m.formEditionId, [...(byEdition.get(m.formEditionId) ?? []), m]);
    return current.map(({ d, e }) => {
      const entries = e ? effective(byEdition.get(e.id) ?? [], (m) => m.dataPath, "published").map(snapEntry) : [];
      const map: EditionMap = { form_number: d.formKey, form_edition: e?.editionLabel ?? null, form_sha256: e?.sha256 ?? null, entries };
      return { form: d.formKey, title: d.displayName, formKind: d.formKind, editionId: e?.id ?? null, edition: e?.editionLabel ?? null, officialFile: e?.officialFile ?? null, sha256: e?.sha256 ?? null, inventoryFile: e?.inventoryFile ?? null, storedPath: e?.storedPath ?? null, entries, trial: entries.length ? trialFor(map) : { passed: false, why: null, record: null } };
    });
  }

  /** F3: whether each release form applies to each person now, and the answers it waits for (the release's own rule,
   *  engine/render.ts, as Prepare application reads it), read once per request. */
  private async releaseNow(c: Reached) {
    const rel = this.r.releaseSnapshotOf(c), people = this.r.peopleOf(c), today = new Date();
    const { answers, rows } = await this.r.state(c);
    const { known } = knownOf(rel, people, answers, rows, today);
    const r = render(rel, people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Role, label: p.label, applies: p.applies })), known, { today });
    const label = new Map([...(rel.canonical_fields as { id: string; meaning?: string | null }[]).map((f) => [f.id, f.meaning || f.id] as const), ...(rel.placements as { fact: string; question_text?: string | null }[]).filter((p) => p.question_text?.trim()).map((p) => [p.fact, p.question_text!.trim()] as const)]);
    return (form: string, subject: string) => {
      const f = (r.forms as { form: string; person: string; applies: boolean | "cannot_tell"; missing: string[] }[]).find((x) => x.form === form && x.person === subject);
      if (!f) return "it is not for this person on this application";
      if (f.applies === true) return "it applies now";
      if (f.applies === false) return "it does not apply on the answers given";
      return `not known yet: it waits for ${f.missing.length ? f.missing.map((m) => `"${label.get(m) ?? m}"`).join(" and ") : "an answer"}`;
    };
  }

  /** BR-2, BR-3: each form with its kind in words, or why it is not added, for one person on this filing. */
  private judge(c: Reached, subject: string, x: LibForm, now: (form: string, subject: string) => string) {
    const rel = this.r.releaseSnapshotOf(c);
    const k = kindOf({ publishedRows: x.entries.length, trialPassed: x.trial.passed, trialWhy: x.trial.why });
    // F3: a form the release holds (any line or map of it) is the release's, whether or not it applies now.
    const held = releaseForms(rel).has(x.form);
    const line = held ? (rel.forms as { form_number: string; condition_plain?: string | null; status?: string }[]).find((l) => l.form_number === x.form) : undefined;
    const added = (c.formAdditions ?? []).find((a) => a.formKey === x.form && a.subjectId === subject && !a.removedAt);
    // Breaker m9: an edition with no official file checksum could never be checked on download, so it has no current edition.
    const why = refusalOf({ form: x.form, formKind: x.formKind, hasEdition: !!x.editionId && !!x.sha256, kind: k.kind, barcode: isBarcodeForm(x.form), heldByRelease: held,
      releaseLine: line ? { condition: line.status === "always" ? "always" : line.condition_plain ?? null, now: now(x.form, subject) } : null, addedBy: added ? { by: personName(added.addedBy), at: added.addedAt.toISOString() } : null });
    return { form: x.form, title: x.title, edition: x.edition, kind: k.kind, kind_words: KIND_WORDS[k.kind], blank_why: k.why, why_not: why ? { code: why.code, words: why.words } : null };
  }

  /** GET …/addable-forms: the library's forms (number or title matching `q`), each addable with its kind, or shown with
   *  why it is not. Coverage is never worked out here (BR-3: only for the form picked). */
  async addable(actor: Actor, filingId: string, q: unknown, subjectIn: unknown) {
    const { f, c } = await this.filing(actor, filingId);
    const who = this.personOn(c, f, subjectIn);
    const words = typeof q === "string" ? q.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80) : "";
    const lib = (await this.library(c.workspaceId)).filter((x) => x.formKind !== "guide" && x.formKind !== "document" && x.formKind !== "checklist");
    const hit = (x: LibForm) => !words || x.form.toLowerCase().includes(words) || x.form.toLowerCase().replace(/\s+/g, "").includes(words.replace(/\s+/g, "")) || x.title.toLowerCase().includes(words);
    const people = f.applicants.filter((a) => a.mode === "applying").map((a) => ({ subject: a.subjectId, label: c.participants.find((p) => p.subjectId === a.subjectId)?.subject.label ?? "" }));
    return { filing: f.id, subject: who.subject, person: who.label, people, forms: await (async () => { const now = await this.releaseNow(c); return lib.filter(hit).map((x) => this.judge(c, who.subject, x, now)); })(),
      empty: `No form matches "${typeof q === "string" ? q.trim().slice(0, 40) : ""}". Forms come from the firm's library: add one in Library › Forms.` };
  }

  /** What is frozen for this form (BR-4): copied once; a second addition of a form already on the case copies the first's. */
  private freeze(x: LibForm, kind: AddedKind, lists: Map<string, { key: string; label: string }[]>, fields: Parameters<typeof snapField>[0][]): Frozen {
    const facts = new Set(kind === "fills" ? x.entries.map((e) => e.fact).filter((v): v is string => !!v) : []);
    return { title: x.title, edition: x.edition ?? "", official_file: x.officialFile, form_sha256: x.sha256, inventory_file: x.inventoryFile,
      entries: kind === "fills" ? x.entries as Frozen["entries"] : [], fields: fields.filter((f) => facts.has(f.canonicalFieldKey)).sort((a, b) => a.canonicalFieldKey.localeCompare(b.canonicalFieldKey)).map((f) => snapField(f, lists)) };
  }
  private async factDefs(workspaceId: string) {
    const [fields, lists] = await Promise.all([this.db.canonicalField.findMany({ where: { workspaceId } }), this.db.answerList.findMany({ where: { workspaceId }, include: { values: { orderBy: { sortOrder: "asc" } } } })]);
    return { fields: effective(fields, (f) => f.canonicalFieldKey, "published"), lists: new Map(effective(lists, (l) => l.answerListKey, "published").map((l) => [l.answerListKey, l.values.map((v) => ({ key: v.valueKey, label: v.label }))])) };
  }

  /** BR-6: the channels it may be filed by (inside what the library records IRCC accepts, never Online) and the default:
   *  the channel the filing already uses (a paper filing → Paper). */
  private async channels(c: Reached, form: string) {
    const accepts = await acceptsOf(this.db, c.workspaceId);
    const portal = (this.r.releaseSnapshotOf(c).combination as { portal?: string }).portal ?? null;
    const allowed = allowedChannels(accepts.get(form), portal).channels.filter((ch) => ADD_CHANNELS.includes(ch));
    const def: Channel | null = portal === "PAPER" ? (allowed.includes("PAPER") ? "PAPER" : null) : allowed.includes("PDF_UPLOAD") ? "PDF_UPLOAD" : allowed[0] ?? null;
    const why = portal === "PAPER" ? "This application is filed on paper, so its forms are too." : def === "PDF_UPLOAD" ? "This application's forms are uploaded as PDFs to the IRCC account." : def ? `IRCC accepts ${form} only ${CHANNEL_WORDS[def]}.` : `IRCC accepts ${form} neither as a PDF upload nor on paper here, so it is not added (an added form is not filed Online).`;
    return { allowed, def, why };
  }

  /** GET …/addable-forms/:form: one form for one person: its coverage on this case (fills), or why it is blank; the
   *  channel and signature it would take. */
  async detail(actor: Actor, filingId: string, formIn: string, subjectIn: unknown) {
    const { f, c } = await this.filing(actor, filingId);
    const who = this.personOn(c, f, subjectIn);
    const x = (await this.library(c.workspaceId, String(formIn ?? ""))).find((l) => l.formKind !== "guide" && l.formKind !== "document" && l.formKind !== "checklist");
    if (!x) fail("No such form in the firm's library.", HttpStatus.NOT_FOUND);
    const j = this.judge(c, who.subject, x!, await this.releaseNow(c));
    const same = (c.formAdditions ?? []).find((a) => a.formKey === x!.form && !a.removedAt);
    const kind: AddedKind = same ? (same.kind as AddedKind) : j.kind;
    let coverage: { fills: number; total: number; boxes: { box: string; caption: string; label: string; state: "fills" | "not_on_file" | "not_needed"; value?: unknown }[] } | null = null;
    if (kind === "fills" && !j.why_not) {
      const defs = await this.factDefs(c.workspaceId);
      const frozen = same ? (same.frozen as Frozen) : this.freeze(x!, "fills", defs.lists, defs.fields);
      const probe: Addition = { id: "probe", filing: f.id, subject: who.subject, form: x!.form, kind: "fills", frozen, channel: "PDF_UPLOAD", signature: "HAND_SCANNED", signed_by: null, added_by: actor.id, added_at: new Date().toISOString(), reason: null };
      const s = withAdditions(this.r.releaseSnapshotOf(c), [probe]);
      const { answers, rows } = await this.r.state(c);
      const cov = formCoverage(s, this.r.peopleOf(c), answers, rows, x!.form, who.subject);
      const boxes = (cov?.boxes ?? []).filter((b) => b.fact).map((b) => ({ box: b.box, caption: b.caption, label: b.meaning ?? b.fact ?? b.box,
        state: b.coverage === "confirmed fact" ? "fills" as const : b.coverage === "not needed" ? "not_needed" as const : "not_on_file" as const }));
      coverage = { fills: boxes.filter((b) => b.state === "fills").length, total: boxes.length, boxes };
    }
    const ch = await this.channels(c, x!.form);
    const people = this.r.peopleOf(c).filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role, label: p.label, applies: p.applies }));
    const signers = signersOf(people, who.subject, `person:${who.subject}`, "parent_for_minor", minorFromAnswers((await this.r.state(c)).answers, new Date())).map((s) => SIGNER_WORDS[s] ?? s);
    return { ...j, kind, kind_words: KIND_WORDS[kind], subject: who.subject, person: who.label, coverage,
      same_as: same ? { subject: same.subjectId, at: same.addedAt.toISOString(), words: `Added the same way as for ${c.participants.find((p) => p.subjectId === same.subjectId)?.subject.label ?? "another person"} on ${dayWords(same.addedAt.toISOString())}: one form is filed one way on a case.` } : null,
      channels: same ? [same.channel] : ch.allowed, channel: same ? same.channel : ch.def, channel_why: same ? "As for the first person it was added for." : ch.why,
      signature: same ? same.signature : "HAND_SCANNED", signers, signers_words: signers.length ? `Signed by ${signers.join(" and ")}` : "No signature" };
  }

  /** POST …/form-additions: add the form for one person on this filing (BR-1 to BR-6, BR-9). */
  async add(actor: Actor, filingId: string, body: unknown) {
    const b = (body ?? {}) as { form?: unknown; subject?: unknown; channel?: unknown; signature?: unknown; signature_reason?: unknown; reason?: unknown; idempotency_key?: unknown };
    if (typeof b.form !== "string" || !b.form.trim()) throw problem(400, "Name the form to add, by its number.");
    const { f, c } = await this.filing(actor, filingId);
    const who = this.personOn(c, f, b.subject);
    await refuseIfRecorded(this.db, (await this.db.filing.findMany({ where: { caseId: c.id }, select: { id: true } })).map((x) => x.id), "its forms");
    const x = (await this.library(c.workspaceId, b.form.trim())).find(Boolean);
    if (!x) throw problem(404, "No such form in the firm's library.");
    const j = this.judge(c, who.subject, x!, await this.releaseNow(c));
    if (j.why_not) throw problem(j.why_not.code === "on_release" || j.why_not.code === "already_added" ? 409 : 422, j.why_not.words);
    const same = (c.formAdditions ?? []).find((a) => a.formKey === x!.form && !a.removedAt);
    const ch = await this.channels(c, x!.form);
    const allowed = same ? [same.channel as Channel] : ch.allowed;
    const channel = b.channel === undefined || b.channel === null || b.channel === "" ? (same ? same.channel as Channel : ch.def) : String(b.channel) as Channel;
    if (!channel || !allowed.includes(channel)) throw problem(422, same ? `${x!.form} is already added on this case filed ${CHANNEL_WORDS[same.channel as Channel]}: one form is filed one way on a case.` : allowed.length ? `File ${x!.form} ${allowed.map((a) => CHANNEL_WORDS[a]).join(" or ")}: that is what IRCC accepts here, and an added form is not filed Online.` : ch.why, "channel");
    const reasonOf = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 500) : null);
    const off = b.signature === "NONE" || b.signature === false;
    if (same && (off ? "NONE" : "on") !== (same.signature === "NONE" ? "NONE" : "on")) throw problem(422, `${x!.form} is already added on this case ${same.signature === "NONE" ? "with no signature" : "needing a signature"}: one form is signed one way on a case.`, "signature");
    if (off && channel === "PAPER") throw problem(422, `A form filed on Paper is signed in pen: its signature cannot be switched off. File it as a PDF upload to switch the signature off.`, "signature");
    // C11.6's rule, as for any form moved to Paper: where an IRCC account files online, Paper is chosen with a reason.
    if (channel === "PAPER" && ch.def !== "PAPER" && !same && !reasonOf(b.reason)) throw problem(400, `Say why ${x!.form} is filed on Paper when this application is filed through an IRCC account: the reason is recorded with it.`, "reason");
    if (off && !reasonOf(b.signature_reason)) throw problem(400, "Say why this form needs no signature: switching the signature off is recorded with a reason.", "signature_reason");
    const signature = off ? "NONE" : channel === "PAPER" ? "PEN" : "HAND_SCANNED";
    const kind: AddedKind = same ? (same.kind as AddedKind) : j.kind;
    const defs = same ? null : await this.factDefs(c.workspaceId);
    const frozen = same ? (same.frozen as Frozen) : this.freeze(x!, kind, defs!.lists, defs!.fields);
    const trial = same ? same.trial : kind === "fills" && x!.trial.record ? { ...x!.trial.record } : null;
    if (kind === "fills" && !trial) throw problem(409, `${x!.form}'s fill trial could not be read, so it is not added as a form that fills.`);
    const made = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR UPDATE`;
      const twice = await tx.filingFormAddition.findFirst({ where: { filingId: f.id, subjectId: who.subject, formKey: x!.form, removedAt: null } });
      if (twice) throw problem(409, `${x!.form} is already added to this filing for this person by ${personName(twice.addedBy)} on ${dayWords(twice.addedAt.toISOString())}.`);
      // Breaker M1: one form is filed one way on a case. The case's row lock above serialises adds on this case, so the
      // first addition of this form read here is the truth: if another person's addition landed after this request read
      // the case, this one is refused rather than stored with another channel, signature or frozen form.
      const first = await tx.filingFormAddition.findFirst({ where: { caseId: c.id, formKey: x!.form, removedAt: null }, orderBy: [{ addedAt: "asc" }, { id: "asc" }] });
      if (first && first.id !== same?.id) throw problem(409, `${x!.form} was just added on this case for another person by ${personName(first.addedBy)}: read the form again, it is then added the same way (one form is filed one way on a case).`);
      return tx.filingFormAddition.create({ data: { workspaceId: c.workspaceId, caseId: c.id, filingId: f.id, subjectId: who.subject, formKey: x!.form, editionId: same?.editionId ?? x!.editionId!, editionLabel: same?.editionLabel ?? x!.edition!, kind,
        frozen: frozen as object, frozenSha256: frozenHash(frozen), trial: (trial ?? undefined) as object | undefined, channel, signature, signedBy: off ? "none" : "parent_for_minor", signatureReason: off ? reasonOf(b.signature_reason) : null,
        addedBy: actor.id, reason: reasonOf(b.reason) } });
    }).catch((e) => { if ((e as { code?: string }).code === "P2002") throw problem(409, `${x!.form} is already added to this filing for this person.`); throw e; });
    await this.audit.log(c.workspaceId, actor.id, "added", "filing form", made.id, `${actor.name} added ${x!.form} (${KIND_WORDS[kind]}) for the ${roleWords(c, who.subject)} on a filing of case ${short(c.id)}${made.reason ? " (reason given)" : ""}`);
    return this.view(made, who.label);
  }

  private view(a: { id: string; filingId: string; subjectId: string; formKey: string; kind: string; editionLabel: string; channel: string; signature: string; signatureReason: string | null; addedBy: string; addedAt: Date; reason: string | null; removedAt: Date | null; removedBy: string | null; removedReason: string | null }, person: string) {
    return { id: a.id, filing: a.filingId, subject: a.subjectId, person, form: a.formKey, kind: a.kind, kind_words: KIND_WORDS[a.kind as AddedKind] ?? a.kind, edition: a.editionLabel, channel: a.channel, signature: a.signature, signature_reason: a.signatureReason,
      tag: ADDED_TAG, added_by: a.addedBy, added_by_name: personName(a.addedBy), added_at: a.addedAt.toISOString(), reason: a.reason, removed: a.removedAt ? { by: a.removedBy, at: a.removedAt.toISOString(), reason: a.removedReason } : null };
  }

  /** The addition (of a case this person may work on as case staff), and its case. */
  private async addition(actor: Actor, id: string) {
    const a = UUID.test(id) ? await this.db.filingFormAddition.findUnique({ where: { id } }) : null;
    if (!a) fail("No such added form.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, a!.caseId, "officer");
    return { a: a!, c };
  }

  /** POST …/form-additions/:id/remove (BR-8): a reason is required; refused once anything on the case is recorded; the row
   *  is kept, marked removed. */
  async remove(actor: Actor, id: string, body: unknown) {
    const { a, c } = await this.addition(actor, id);
    const reason = typeof (body as { reason?: unknown })?.reason === "string" ? ((body as { reason: string }).reason).trim().slice(0, 500) : "";
    if (!reason) throw problem(400, "Say why the form is removed: a removal is recorded with a reason.", "reason");
    await refuseIfRecorded(this.db, (await this.db.filing.findMany({ where: { caseId: c.id }, select: { id: true } })).map((x) => x.id), "its forms");
    if (a.removedAt) throw problem(409, `${a.formKey} was already removed by ${personName(a.removedBy ?? "")} on ${dayWords(a.removedAt.toISOString())}.`);
    const n = await this.db.filingFormAddition.updateMany({ where: { id: a.id, removedAt: null }, data: { removedAt: new Date(), removedBy: actor.id, removedReason: reason } });
    if (n.count !== 1) throw problem(409, `${a.formKey} was already removed.`);
    const label = c.participants.find((p) => p.subjectId === a.subjectId)?.subject.label ?? "";
    await this.audit.log(c.workspaceId, actor.id, "removed", "filing form", a.id, `${actor.name} removed ${a.formKey} for the ${roleWords(c, a.subjectId)} from a filing of case ${short(c.id)} (reason given)`);
    return this.view((await this.db.filingFormAddition.findUnique({ where: { id: a.id } }))!, label);
  }

  /** GET …/form-additions/:id/blank (BR-5): the edition's official file, its checksum checked against the frozen one. */
  async blank(actor: Actor, id: string, res: Response) {
    const { a } = await this.addition(actor, id);
    // Breaker m8: a removed form is no longer on the filing, so its blank PDF is not handed out from it.
    if (a.removedAt) fail(`${a.formKey} was removed from this filing on ${dayWords(a.removedAt.toISOString())}, so its blank PDF is not offered here.`, HttpStatus.GONE);
    const fr = a.frozen as Frozen;
    const file = officialPath(fr.official_file) ?? (await this.storedPath(a.editionId));
    const bytes = file && existsSync(file) ? readFileSync(file) : null;
    if (!bytes) fail(`The official file of ${a.formKey} (${fr.edition}) is not in the product's files; download it from canada.ca.`, HttpStatus.CONFLICT);
    const sha = createHash("sha256").update(bytes!).digest("hex");
    if (!fr.form_sha256 || sha !== fr.form_sha256) fail(`The official file of ${a.formKey} on file is not the edition frozen when it was added (its checksum differs), so it is not handed over.`, HttpStatus.CONFLICT);
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `attachment; filename="${a.formKey.replace(/[^A-Za-z0-9]+/g, "")}-blank.pdf"`);
    res.setHeader("x-sha256", sha);
    res.end(bytes);
  }
  private async storedPath(editionId: string): Promise<string | null> {
    const e = await this.db.formEdition.findUnique({ where: { id: editionId }, select: { storedPath: true } });
    if (!e?.storedPath) return null;
    const root = resolve(ROOT), abs = resolve(root, e.storedPath);
    return abs.startsWith(`${root}${sep}`) ? abs : null;
  }
}

/** The path of an official file named in the manifest (official-sources/ircc/manifest.json), inside that folder only. */
function officialPath(name: string | null): string | null {
  if (!name) return null;
  try {
    const items = (JSON.parse(readFileSync(join(OFFICIAL, "manifest.json"), "utf8")) as { items: { file: string; path: string }[] }).items;
    const rel = items.find((i) => i.file === name)?.path;
    if (!rel) return null;
    const abs = resolve(OFFICIAL, rel);
    return abs.startsWith(`${resolve(OFFICIAL)}${sep}`) ? abs : null;
  } catch { return null; }
}

@CaseRead()
@Controller("api/runtime")
export class FormAdditionsController {
  constructor(@Inject(FormAdditions) private readonly s: FormAdditions) {}
  @Get("filings/:id/addable-forms") addable(@Headers("x-actor") a: H, @Param("id") id: string, @Query("q") q: unknown, @Query("subject") subject: unknown) { return this.s.addable(actorOf(a), id, q, subject); }
  @Get("filings/:id/addable-forms/:form") detail(@Headers("x-actor") a: H, @Param("id") id: string, @Param("form") form: string, @Query("subject") subject: unknown) { return this.s.detail(actorOf(a), id, form, subject); }
  @Post("filings/:id/form-additions") @HttpCode(HttpStatus.CREATED) add(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.add(actorOf(a), id, b); }
  @Post("form-additions/:id/remove") @HttpCode(HttpStatus.OK) remove(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.remove(actorOf(a), id, b); }
  @Get("form-additions/:id/blank") blank(@Headers("x-actor") a: H, @Param("id") id: string, @Res() res: Response) { return this.s.blank(actorOf(a), id, res); }
}
