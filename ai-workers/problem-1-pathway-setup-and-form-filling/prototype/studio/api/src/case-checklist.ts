// C6.4 (M3-B, runtime lane; P-171; M3 case view r5c "checklist per person"): a case's document checklist, one list per
// person, from its pinned release's requirements and rechecked against the case's answers on every read.
// The case officer reads it; a client and configuration people do not (deny by default, as runtime.ts). Every
// combination's list is worked out from its release (M3-S4, P-425). Sample until the immigration expert confirms. US$0.
// Storage slice (M3-C; SI-14 stand-in for the team's storage): a line the person needs is kept as a checklist_line row
// (written on read, so it keeps its id and state when the answers take it away and bring it back); the officer requests
// it, the officer or the case's client uploads it (the file is the person's: case_document), or the officer marks it Not
// applicable with a reason. A line that was requested, has a file or is Not applicable stays on the person's list when
// the answers no longer call for it (kept), so nothing asked for or received silently disappears. Audit lines name the
// document type, the person's role and the case by its short id, never a file's contents (RT-17).
import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Inject, Injectable, Param, Post, UploadedFiles, UseGuards, UseInterceptors, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { HttpException } from "@nestjs/common";
import { problemFromZod } from "../../contracts/programs.ts";
import { ChangeProviders, cleanName, MAX_DOCUMENT_BYTES, MAX_DOCUMENT_MB, MEDIA, mediaOf, NOT_APPLICABLE_FROM, NotApplicable, REQUEST_FROM, SeenVersion, STATE_WORDS, UPLOAD_FROM, WAIVE_FROM, Waive, type LineState, type StoredDocument } from "../../contracts/documents.ts";
import { candidatesOf, caseChecklist, chosenProviders, mayProvide, roleWords, type PersonLine } from "../../engine/runtime/case-checklist.ts";
import { fmtDate, onFileFrom } from "../../engine/runtime/stages.ts";
import { readSpec } from "./routes-data.ts";
import { lineKeys, pickMember, setMet, setStatus, type SetStatus } from "../../engine/document-sets.ts";
import { checkValue, knownOf } from "../../engine/runtime/case.ts";
import { actorOf, Audit, CaseRead, Db, fail, VAR, WORKSPACE_KEY, type Actor } from "./core.ts";
import { privateWords, Runtime, type Reached } from "./runtime.ts";
import { caseName, releaseLabel } from "../../contracts/runtime.ts";

type H = string | undefined;
type Upload = { fieldname?: string; originalname?: string; buffer?: Buffer; size?: number };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const short = (id: string) => id.slice(0, 8);
/** A checklist line as the API answers it: the derived line with its stored id, state and documents (M3-CONTRACT C6.4). */
export type StoredLine = Omit<PersonLine, "state" | "documents"> & { state: LineState; state_words: string; state_reason: string | null; state_by: string | null; state_at: string | null;
  version: number; documents: StoredDocument[]; kept: boolean; derived_id: string;
  /** C6.15: on a line with a substitute set, whether the person's current files meet it, by member, in words. */
  set_status: SetStatus | null;
  /** C6.14 BR-6: the officer's last change of providers on a shared line (also a return to the defaults), else null. */
  providers_change: { reason: string; by: string | null; at: string | null; defaults: boolean } | null };
const setStatusOf = setStatus;

/** Multipart file names arrive read as latin1 (busboy's default): a UTF-8 name is read back as UTF-8 when its bytes are
 *  valid UTF-8, so "Паспорт.pdf" is kept as typed (break M2); a real latin1 name stays as it is. */
export function utf8Name(name: string | undefined): string {
  const raw = String(name ?? "");
  if (![...raw].every((ch) => ch.charCodeAt(0) < 256)) return raw;
  const back = Buffer.from(raw, "latin1").toString("utf8");
  return back.includes("\uFFFD") ? raw : back;
}
const parse = <T,>(schema: { safeParse: (x: unknown) => { success: true; data: T } | { success: false; error: Parameters<typeof problemFromZod>[0] } }, body: unknown): T => {
  const r = schema.safeParse(body ?? {});
  if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST);
  return r.data;
};

/** C6.15: which member of the line's set a file is (engine/document-sets.ts pickMember), or refused in its words. */
export function memberOf(line: Parameters<typeof pickMember>[0], raw: unknown): { key: string; name: string } {
  const m = pickMember(line, raw);
  if ("problem" in m) fail(m.problem);
  return m as { key: string; name: string };
}

/** The working files' folder for documents (the person's own, by the row id). */
const DOCS = () => VAR(WORKSPACE_KEY);

/** M3-S4 (P-172): why a never waivable line is refused a waiver or Not applicable, in words. */
const neverWords = (doc: string, who: string, act: string) => `${doc} for ${who} cannot be ${act}: its line in the release is never waivable, so Ready to file waits until it is received. Nothing was changed.`;

@Injectable()
export class CaseChecklists {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit) {}

  async list(actor: Actor, caseId: string) {
    return this.stored(await this.r.reach(actor, caseId, "officer"));
  }

  /** The derived checklist (nothing stored), as #325, and everyone on the case with their age (C6.14's provider rules). */
  private async derive(c: Reached) {
    const s = this.r.snapshotOf(c), pin = c.pins[0];
    // The release must describe the case's own combination (as case-filings.ts): never another combination's lines.
    const own = await this.db.combination.findUnique({ where: { id: c.combinationId }, select: { combinationKey: true } });
    if (!own || s?.combination?.key !== own.combinationKey) fail("This case's release does not describe the case's own combination; no checklist was worked out. Ask the Lead.", HttpStatus.CONFLICT);
    const people = this.r.peopleOf(c), today = new Date();
    const { answers, rows } = await this.r.state(c);
    // B-M2: an answer its own checks reject (a date that is not real, 1900 or 2200 as the application date) never decides
    // a line: only answers without problems are read, so the line asks for the answer again instead.
    const { known } = knownOf(s, people, answers.filter((x) => checkValue(s, x.field, x.value, today).length === 0), rows, today);
    const d = { case_id: c.id, reference: caseName(c), release_version: pin.release.version, release_label: releaseLabel(pin.release), today: today.toISOString().slice(0, 10), ...caseChecklist(s, own!.combinationKey, people, known, today) };
    return { d, everyone: d.derived ? candidatesOf(people, known, d.today) : [] }; // C6.14 BR-4: ages on the day it is read
  }

  /** The derived checklist with its stored lines: every needed line gets its row (created once, then kept). */
  private async stored(c: Reached) {
    const { d, everyone } = await this.derive(c); // M3-S4 (P-425): always worked out from the case's release
    const needed = d.people.flatMap((p) => p.lines.map((l) => ({ workspaceId: c.workspaceId, caseId: c.id, stageId: c.stage.id, subjectId: p.subject, documentType: l.document.key, lineage: l.lineage })));
    if (needed.length) await this.db.checklistLine.createMany({ data: needed, skipDuplicates: true });
    const rows = await this.db.checklistLine.findMany({ where: { caseId: c.id, stageId: c.stage.id } });
    const subjects = d.people.map((p) => p.subject);
    const docs = await this.db.caseDocument.findMany({ where: { subjectId: { in: subjects } }, orderBy: [{ uploadedAt: "asc" }, { id: "asc" }] });
    const types = ((this.r.snapshotOf(c).document_types ?? []) as { key: string; name: string }[]);
    // C6.15: a set's members are named in the release with the set (they need not be lines of their own).
    const memberNames = new Map(d.people.flatMap((p) => [...p.lines, ...p.waiting, ...p.not_needed]).flatMap((l) => l.set?.members ?? []).map((m) => [m.key, m.name]));
    const typeName = (k: string) => types.find((t) => t.key === k)?.name ?? memberNames.get(k) ?? k;
    const rowOf = new Map(rows.map((x) => [`${x.subjectId}|${x.documentType}`, x]));
    const docsOf = (subject: string, type: string | string[]): StoredDocument[] => docs.filter((x) => x.subjectId === subject && (Array.isArray(type) ? type.includes(x.documentType) : x.documentType === type)).map((x) => ({
      id: x.id, current: x.current, file_name: x.fileName, media_type: x.mediaType, size_bytes: x.sizeBytes, sha256: x.sha256, uploaded_by: x.uploadedBy,
      uploaded_at: x.uploadedAt.toISOString(), superseded_at: x.supersededAt?.toISOString() ?? null,
      // C6.15: on a line with a set, which member the file is.
      ...(Array.isArray(type) && type.length > 1 ? { member: { key: x.documentType, name: typeName(x.documentType) } } : {}) }));
    const filesOf = (subject: string, l: PersonLine) => (l.set ? docsOf(subject, lineKeys(l)) : docsOf(subject, l.document.key));
    // C6.17 (BR-6): on a stage started from the one before, a file this person uploaded before it started, of the line's
    // type or of a type the route pairs with it (Sample), is shown "On file from <stage>": check it for this application.
    const pairs = readSpec(c.stage.spec).same_documents, before = c.stage.startedFrom === "NEXT_STAGE" ? c.stages.find((x) => x.ord === c.stage.ord - 1) : undefined;
    const onFile = (subject: string, type: string) => {
      if (!before) return null;
      const hit = onFileFrom(type, pairs, docs.filter((x) => x.subjectId === subject && x.current), c.stage.startedAt);
      return hit ? { from: before.staffName, file_name: (hit as (typeof docs)[number]).fileName, uploaded_at: hit.uploadedAt.toISOString(), words: `On file from ${before.clientName}, uploaded ${fmtDate(hit.uploadedAt.toISOString())}: check it for this application.` } : null;
    };
    const currentKeys = (subject: string, l: PersonLine) => new Set(docs.filter((x) => x.subjectId === subject && x.current && lineKeys(l).includes(x.documentType)).map((x) => x.documentType));
    /** C6.14 BR-6: a shared line's providers with the officer's stored choice, read against the case as it is now: a chosen
     *  person no longer on the case or now under 18 is dropped and named; none left, the defaults apply and the line says so. */
    const providersNow = (l: PersonLine, row: (typeof rows)[number] | undefined): Pick<StoredLine, "providers" | "providers_rule" | "providers_words" | "providers_change"> => {
      const change = row?.providersReason ? { reason: row.providersReason, by: row.providersBy, at: row.providersAt?.toISOString() ?? null, defaults: row.providers.length === 0 } : null;
      if (!l.shared || !row || !row.providers.length) return { providers: l.providers, providers_rule: l.providers_rule, providers_words: l.shared && change?.defaults ? `${l.providers_words} The case officer went back to the defaults: ${change.reason}` : l.providers_words, providers_change: l.shared ? change : null };
      const chosen = chosenProviders(row.providers, everyone, d.today);
      const left = chosen.dropped.filter((x) => !(l.providers_words ?? "").includes(x)); // a reason the defaults already give is said once
      const dropped = left.length ? ` Left out now: ${left.map((x) => x.replace(/\.?$/, ".")).join(" ")}` : ""; // break m6: each reason ends with a full stop
      if (!chosen.providers.length) return { providers: l.providers, providers_rule: l.providers_rule, providers_words: `The case officer's choice no longer applies.${dropped} ${l.providers_words}`, providers_change: change };
      return { providers: chosen.providers, providers_rule: "changed", providers_words: `Provided by ${chosen.providers.map((x) => x.label).join(" and ")}: chosen by the case officer (${change!.reason}).${dropped}`, providers_change: change };
    };
    const people = d.people.map((p) => {
      const out = (l: PersonLine, kept: boolean): StoredLine => {
        const row = rowOf.get(`${p.subject}|${l.document.key}`), documents = filesOf(p.subject, l);
        const state = (row?.state ?? "not_requested") as LineState;
        const reason = kept ? `${l.reason} Kept on the list: it is ${STATE_WORDS[state]}${documents.length ? " and has a file" : ""}, so it is not dropped when the answers change.` : l.reason;
        // M3-S4 review m1: a kept line no longer needed blocks nothing, so it does not say never waivable either.
        return { ...l, ...providersNow(l, row), ...(kept ? { never_waivable: false, never_if: undefined } : {}), id: row?.id ?? l.id, derived_id: l.id, reason, required: kept || ((state === "not_applicable" || state === "waived") && !l.never_waivable) ? false : l.required, state, state_words: STATE_WORDS[state], state_reason: row?.stateReason ?? null,
          state_by: row?.stateBy ?? null, state_at: row?.stateAt?.toISOString() ?? null, version: row?.version ?? 0, documents, kept, set_status: setStatusOf(l, currentKeys(p.subject, l)), ...((): { on_file?: NonNullable<ReturnType<typeof onFile>> } => { const f = onFile(p.subject, l.document.key); return f ? { on_file: f } : {}; })() };
      };
      // A line no longer needed that was acted on (requested, a file, Not applicable) stays on the person's list.
      const acted = (l: PersonLine) => { const row = rowOf.get(`${p.subject}|${l.document.key}`); return !!row && (row.state !== "not_requested" || filesOf(p.subject, l).length > 0); };
      const keptWaiting = p.waiting.filter(acted), keptNot = p.not_needed.filter(acted);
      // Break M1: a person marked not travelling has no derived lines at all; a line acted on for them is kept as it was.
      const listed = new Set([...p.lines, ...p.waiting, ...p.not_needed].map((l) => l.document.key));
      const orphans = rows.filter((x) => x.subjectId === p.subject && !listed.has(x.documentType) && (x.state !== "not_requested" || docsOf(p.subject, x.documentType).length > 0))
        .map((x): PersonLine => ({ id: `${p.subject}:${x.lineage}`, document_type: x.documentType, label: typeName(x.documentType), state: "not_requested", required: false, documents: [],
          reason: p.applies ? `No longer required: ${d.release_label ?? "the case's release"} no longer asks this person for it; its uploads are kept and listed.` : `${p.label} is not travelling with the application now, so the release asks nothing of them.`,
          need: "not_needed", lineage: x.lineage, also_from: [], document: { key: x.documentType, name: typeName(x.documentType) }, missing: [], base: false, provided_by: "client", alternatives: [], quote: null, rule: null, set: null, waivable: false, never_waivable: false, who: "", who_words: "", shared: null, providers: [], providers_rule: null, providers_words: null }));
      const lines = [...p.lines.map((l) => out(l, false)), ...keptWaiting.map((l) => out(l, true)), ...keptNot.map((l) => out(l, true)), ...orphans.map((l) => out(l, true))];
      return { ...p, lines, waiting: p.waiting.filter((l) => !acted(l)).map((l) => out(l, false)), not_needed: p.not_needed.filter((l) => !acted(l)).map((l) => out(l, false)) };
    });
    return { ...d, people };
  }

  /** The stored line by its id on a case this person may reach, and the line as the checklist now shows it. A line the
   *  answers no longer call for and nobody acted on is not on the list: it cannot be acted on (409). */
  private async line(actor: Actor, id: string, want: "answer" | "officer") {
    if (!UUID.test(id)) fail("No such checklist line.", HttpStatus.NOT_FOUND);
    id = id.toLowerCase(); // break m6: an id in capitals is the same line
    const workspaceId = (await this.db.case.findFirst({ where: { checklistLines: { some: { id } } }, select: { workspaceId: true } }))?.workspaceId;
    const row = workspaceId ? await this.db.checklistLine.findFirst({ where: { id, workspaceId } }) : null;
    if (!row) fail("No such checklist line.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, row!.caseId, want);
    // C6.16 BR-7 (challenge M3): a client never uploads to, or reads the line of, a person kept private from them.
    const who = c.participants.find((p) => p.subjectId === row!.subjectId);
    if (who && !(actor.duties as readonly string[]).includes("case") && this.r.hiddenFromClient(c, who.subjectId)) fail(privateWords(who.subject.label), HttpStatus.FORBIDDEN);
    // C6.17 (BR-10, P-444): a line of a stage that has ended is history, said so (never "the answers no longer call for it").
    if (row!.stageId !== c.stage.id) throw new HttpException({ type: "https://expatready.local/problems/checklist-line", title: "Changed since you read it", status: 409, code: "stage_ended",
      detail: "This document line belongs to an earlier stage of the case, which has ended: it is kept as it was and can no longer be changed. Nothing was changed." }, HttpStatus.CONFLICT);
    const list = await this.stored(c);
    const person = list.derived ? list.people.find((p) => p.subject === row!.subjectId) : undefined;
    const shown = person?.lines.find((l) => l.id === id);
    if (!shown) fail(`This document is not on ${person?.label ?? "the person"}'s list now: the answers no longer call for it. Nothing was changed.`, HttpStatus.CONFLICT);
    return { c, row: row!, shown: shown!, person: person!, id };
  }

  private async moved(c: Reached, id: string) {
    const list = await this.stored(c);
    return list.derived ? list.people.flatMap((p) => p.lines).find((l) => l.id === id)! : null;
  }

  private async setState(actor: Actor, lineId: string, from: readonly LineState[], to: LineState, reason: string | null, words: string, seen?: number) {
    const { c, row, shown, person, id } = await this.line(actor, lineId, "officer");
    // Break M3: the version the person saw, when sent, must still be the line's: never overwrite a newer state. Checked
    // first, so a stale view is told the line changed even when it is already Requested (Devin review).
    if (seen !== undefined && seen !== row.version) fail(`${shown.label} for ${person.label} changed after you opened it (it is ${STATE_WORDS[row.state as LineState]} now): read the checklist again to see its state now, then try again. Nothing was changed.`, HttpStatus.CONFLICT);
    if (row.state === to && to === "requested") return this.moved(c, id); // asking again for what is already asked: nothing changes
    if (!from.includes(row.state as LineState)) fail(`${shown.label} for ${person.label} is ${STATE_WORDS[row.state as LineState]}: it cannot be marked ${STATE_WORDS[to]} now. Nothing was changed.`, HttpStatus.CONFLICT);
    const n = await this.db.checklistLine.updateMany({ where: { id, version: row.version }, data: { state: to, stateReason: reason, stateBy: actor.id, stateAt: new Date(), version: { increment: 1 } } });
    if (n.count !== 1) {
      // Break m4: the same request at the same moment (a double click) is one request, not a conflict.
      const now = await this.db.checklistLine.findUnique({ where: { id }, select: { state: true } });
      if (to === "requested" && now?.state === "requested" && seen === undefined) return this.moved(c, id);
      fail("Someone changed this line after you opened it: read the checklist again to see its state now, then try again.", HttpStatus.CONFLICT);
    }
    // M3-S3 break M2: the history keeps the reason given and, when a line leaves Waived or Not applicable, the reason and
    // person it had, so a waiver taken back still says who waived it and why.
    const was = row.stateReason ? { from: row.state, from_reason: row.stateReason, from_by: row.stateBy, from_at: row.stateAt?.toISOString() ?? null } : {};
    await this.audit.log(c.workspaceId, actor.id, words, "checklist line", id, `${actor.name} ${words} ${shown.label} for the ${person.role} on case ${short(c.id)} (${STATE_WORDS[row.state as LineState]} to ${STATE_WORDS[to]})${reason ? `: ${reason}` : ""}`,
      { to, ...(reason ? { reason } : {}), ...was });
    return this.moved(c, id);
  }

  request(actor: Actor, id: string, body: unknown) { const b = parse(SeenVersion, body); return this.setState(actor, id, REQUEST_FROM, "requested", null, "requested", b.version); }

  /** M3-S4 (P-172): a line its release marks never waivable cannot be marked Not applicable either (that would lift its
   *  block on Ready to file by another name); refused in words, nothing changed. */
  async notApplicable(actor: Actor, id: string, body: unknown) {
    const { shown, person } = await this.line(actor, id, "officer"); // review m3: who may act is checked before the body
    const b = parse(NotApplicable, body);
    if (shown.never_waivable) fail(neverWords(shown.label, person.label, "marked not applicable"), HttpStatus.UNPROCESSABLE_ENTITY);
    return this.setState(actor, id, NOT_APPLICABLE_FROM, "not_applicable", b.reason, "marked not applicable", b.version);
  }

  /** M3-S3 (P-171 (6)): the case officer waives a line its release marks waivable, with a reason; who and when are kept
   *  on the line and in the history. A line not marked waivable is refused in words (Not applicable stays its way). */
  async waive(actor: Actor, lineId: string, body: unknown) {
    const { shown, person } = await this.line(actor, lineId, "officer"); // review m3: who may act is checked before the body
    const b = parse(Waive, body);
    if (shown.never_waivable) fail(neverWords(shown.label, person.label, "waived"), HttpStatus.UNPROCESSABLE_ENTITY);
    if (!shown.waivable) fail(`${shown.label} for ${person.label} cannot be waived: its line in the release is not marked waivable. Nothing was changed.`, HttpStatus.UNPROCESSABLE_ENTITY);
    return this.setState(actor, lineId, WAIVE_FROM, "waived", b.reason, "waived", b.version);
  }

  /** C6.14 BR-6 (SA-1B-214 rule 2): the case officer changes who provides a shared line, or goes back to the type's
   *  defaults (providers null), always with a reason. Each provider is a person on the case, 18 or older (BR-4), once. */
  async providers(actor: Actor, lineId: string, body: unknown) {
    const b = parse(ChangeProviders, body);
    const { c, row, shown, person, id } = await this.line(actor, lineId, "officer");
    if (b.version !== undefined && b.version !== row.version) fail(`${shown.label} for ${person.label} changed after you opened it: read the checklist again, then try again. Nothing was changed.`, HttpStatus.CONFLICT);
    if (!shown.shared) fail(`${shown.label} is asked of each person, not once for the application: it has no providers to change. Nothing was changed.`, HttpStatus.UNPROCESSABLE_ENTITY);
    const { everyone, d } = await this.derive(c);
    const on = d.today;
    const chosen = b.providers;
    if (chosen) {
      if (new Set(chosen.map((x) => x.toLowerCase())).size !== chosen.length) fail("Each person once. Nothing was changed.");
      for (const raw of chosen) {
        const p = everyone.find((x) => x.id === raw.toLowerCase());
        if (!p) fail("A provider must be a person on this case. Nothing was changed.");
        const m = mayProvide(p!, on);
        if (!m.ok) fail(`${m.why} Nothing was changed.`);
      }
    }
    const ids = (chosen ?? []).map((x) => x.toLowerCase());
    if (!chosen && !row.providers.length) fail(`${shown.label} already uses the document type's defaults. Nothing was changed.`, HttpStatus.CONFLICT);
    // Break m5: the same people again is no change (nothing saved, nothing audited).
    if (chosen && row.providers.length === ids.length && ids.every((x, i) => x === row.providers[i])) fail(`${shown.label} is already provided by exactly these people. Nothing was changed.`, HttpStatus.CONFLICT);
    const n = await this.db.checklistLine.updateMany({ where: { id, version: row.version }, data: { providers: ids, providersReason: b.reason, providersBy: actor.id, providersAt: new Date(), version: { increment: 1 } } });
    if (n.count !== 1) fail("Someone changed this line after you opened it: read the checklist again to see it now, then try again. Nothing was changed.", HttpStatus.CONFLICT);
    const names = ids.map((x) => everyone.find((p) => p.id === x)).map((p) => roleWords(p!.role)).join(" and "); // break m6: words, never keys
    await this.audit.log(c.workspaceId, actor.id, "providers changed", "checklist line", id, `${actor.name} ${chosen ? `set the providers of ${shown.label} to ${names}` : `went back to the default providers of ${shown.label}`} on case ${short(c.id)}`, { from: row.providers, to: ids, reason: b.reason });
    return this.moved(c, id);
  }

  /** One file on the line: stored as the person's, the person's earlier file of this type kept as history. */
  async upload(actor: Actor, lineId: string, files: Upload[] | undefined, body: unknown) {
    const seen = parse(SeenVersion, body).version;
    const { c, row, shown, person, id } = await this.line(actor, lineId, "answer");
    if (seen !== undefined && seen !== row.version) fail(`${shown.label} for ${person.label} changed after you opened it (it is ${STATE_WORDS[row.state as LineState]} now): read the checklist again to see its state now, then try again. Nothing was stored.`, HttpStatus.CONFLICT);
    const f = (files ?? []).filter((x) => x.buffer);
    if (f.length !== 1 || f[0].fieldname !== "file") fail(`Send one file, in the field "file". Nothing was stored.`);
    const bytes = f[0].buffer!;
    if (!bytes.length) fail("The file is empty. Nothing was stored.");
    if (bytes.length > MAX_DOCUMENT_BYTES) fail(`The file is larger than ${MAX_DOCUMENT_MB} MB. Nothing was stored.`, HttpStatus.PAYLOAD_TOO_LARGE);
    const media = mediaOf(bytes);
    if (!media) fail("Send a PDF, JPEG or PNG file (judged by the file itself, not its name). Nothing was stored.", HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    if (!UPLOAD_FROM.includes(row.state as LineState)) fail(`${shown.label} for ${person.label} is ${STATE_WORDS[row.state as LineState]}: request it again before uploading. Nothing was stored.`, HttpStatus.CONFLICT);
    // C6.15 (SA-1B-19 rule 1): on a line with a substitute set, the file is one member of it ("member": its document type
    // key); left out, it is the line's own type when that is a member. Any member of the set the line uses counts.
    const member = memberOf(shown, (body as { member?: unknown } | null)?.member);
    const docId = randomUUID(), sha256 = createHash("sha256").update(bytes).digest("hex");
    const rel = join("people", row.subjectId, "documents", `${docId}.${MEDIA[media!]}`), abs = join(DOCS(), rel);
    try {
      // Inside the clean-up (Devin review): a write that fails half way (a full disk) leaves no partial file.
      mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, bytes);
      await this.db.$transaction(async (tx) => {
        // One upload at a time per line: the row's version is the lock (a second upload in the same moment is refused).
        // C6.15: a line with a set is Received once its files meet the set (any one of: this file; all of: every member's
        // current file); until then it is Requested, with what is still to come in its words.
        const have = new Set((await tx.caseDocument.findMany({ where: { subjectId: row.subjectId, current: true, documentType: { in: lineKeys(shown) } }, select: { documentType: true } })).map((x) => x.documentType));
        have.add(member.key);
        const met = shown.set ? setMet(shown.set, shown.document.key, have).met : true;
        const n = await tx.checklistLine.updateMany({ where: { id, version: row.version }, data: { state: met ? "received" : "requested", stateReason: null, stateBy: actor.id, stateAt: new Date(), version: { increment: 1 } } });
        if (n.count !== 1) fail("Someone changed this line after you opened it: read the checklist again to see its state now, then try again. Nothing was stored.", HttpStatus.CONFLICT);
        const now = new Date();
        await tx.caseDocument.updateMany({ where: { subjectId: row.subjectId, documentType: member.key, current: true }, data: { current: false, supersededAt: now } });
        await tx.caseDocument.create({ data: { id: docId, workspaceId: c.workspaceId, subjectId: row.subjectId, documentType: member.key, checklistLineId: id, fileName: cleanName(utf8Name(f[0].originalname)),
          mediaType: media!, sizeBytes: bytes.length, sha256, path: rel, uploadedBy: actor.id, uploadedAt: now } });
      });
    } catch (e) { rmSync(abs, { force: true }); throw e; } // a refused upload leaves no file behind
    await this.recount(actor, c, row.subjectId, member.key, id);
    await this.audit.log(c.workspaceId, actor.id, "uploaded", "case document", docId, `${actor.name} uploaded ${shown.set && member.key !== shown.document.key ? `${member.name} (in the set for ${shown.label})` : shown.label} for the ${person.role} on case ${short(c.id)} (${MEDIA[media!].toUpperCase()}, ${bytes.length} bytes)`);
    const line = await this.moved(c, id);
    return { ...line, document: line?.documents.find((x) => x.id === docId) ?? null };
  }

  /** C6.15 (break F1): a file of one type can count on several lines of the person (its own line, and any line whose set
   *  has it as a member). After an upload, every other such line not yet received is worked out again: Received once its
   *  set is met (a line with no set: its own type's file), so a line never says "All received" while it waits. */
  private async recount(actor: Actor, c: Reached, subject: string, type: string, except: string) {
    const list = await this.stored(c);
    const person = list.derived ? list.people.find((p) => p.subject === subject) : undefined;
    for (const l of person?.lines ?? []) {
      if (l.id === except || !lineKeys(l).includes(type) || !["not_requested", "requested", "rejected"].includes(l.state)) continue;
      if (l.set ? !l.set_status?.met : !l.documents.some((d) => d.current)) continue;
      const n = await this.db.checklistLine.updateMany({ where: { id: l.id, version: l.version, state: l.state }, data: { state: "received", stateReason: null, stateBy: actor.id, stateAt: new Date(), version: { increment: 1 } } });
      if (n.count === 1) await this.audit.log(c.workspaceId, actor.id, "received", "checklist line", l.id, `${actor.name}'s upload of ${l.set?.members.find((m) => m.key === type)?.name ?? l.document.name} also meets ${l.label} for the ${person!.role} on case ${short(c.id)} (${STATE_WORDS[l.state]} to Received)`);
    }
  }

  /** A stored document's bytes, checked against its sha256 (for C6.5's reading; no route). */
  async bytesOf(documentId: string): Promise<Buffer> {
    const d = await this.db.caseDocument.findUnique({ where: { id: documentId } });
    if (!d) fail("No such document.", HttpStatus.NOT_FOUND);
    const b = readFileSync(join(DOCS(), d!.path));
    if (createHash("sha256").update(b).digest("hex") !== d!.sha256) fail("This document's file changed on disk since it was uploaded; upload it again.", HttpStatus.CONFLICT);
    return b;
  }
}

/** Runs before the upload is read (guards come before interceptors): someone with no case duty (configuration people)
 *  is refused without the server first holding up to 20 MB of their file (breaker m10, Devin review). The case itself is
 *  checked after, by Runtime.reach. */
@Injectable()
export class CaseActorGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const h = ctx.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>().headers["x-actor"];
    const a = actorOf(Array.isArray(h) ? h[0] : h);
    const duties = a.duties as readonly string[];
    if (!duties.includes("case") && !duties.includes("answer")) fail(`${a.name} (simulated) works on configuration, not on cases.`, HttpStatus.FORBIDDEN);
    return true;
  }
}

@CaseRead()
@Controller("api/runtime")
export class CaseChecklistsController {
  constructor(@Inject(CaseChecklists) private readonly x: CaseChecklists) {}
  @Get("cases/:id/checklist") list(@Headers("x-actor") a: H, @Param("id") id: string) { return this.x.list(actorOf(a), id); }
  @Post("checklist-lines/:id/request") @HttpCode(200) request(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.request(actorOf(a), id, b); }
  @Post("checklist-lines/:id/waive") @HttpCode(200) waive(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.waive(actorOf(a), id, b); }
  @Post("checklist-lines/:id/not-applicable") @HttpCode(200) notApplicable(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.notApplicable(actorOf(a), id, b); }
  @Post("checklist-lines/:id/providers") @HttpCode(200) providers(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.providers(actorOf(a), id, b); }
  // The limit is one byte over 20 MB so a file of exactly 20 MB is taken (break m5); the route's own check refuses more.
  @Post("checklist-lines/:id/documents") @UseGuards(CaseActorGuard) @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MAX_DOCUMENT_BYTES + 1, files: 1 } }))
  upload(@Headers("x-actor") a: H, @Param("id") id: string, @UploadedFiles() files: Upload[], @Body() b: unknown) { return this.x.upload(actorOf(a), id, files, b); }
}
