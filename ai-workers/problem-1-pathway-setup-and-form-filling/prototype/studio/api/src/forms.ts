// F1 forms channels (forms lane, slice 1; P-61, P-62, P-65, P-66). No AI anywhere in this file.
//   captures:   a person adds blank portal screens (saved pages or the template) to a capture; a screen holding any
//               answer is refused and not kept; "finish" builds the capture record, its fingerprint, the portal twin and
//               the review document; a second person approves it (P-57 amended for this kind) → an online version
//               (FormEdition, channel ONLINE). The same structure again is "already in the library"; a different one is
//               held with its field-by-field difference (P-66 §2.3).
//   screen map: drafted without AI from an earlier version's element ids, the PDF twin, then shared-field aliases; a
//               person accepts it; leftovers wait for drafting (slice 2) or a person.
//   channels:   each line's channel and the combination's portal; the filing method and signatures are derived.
//   library:    aliases, answer lists and option maps per channel, and reviewed merges (P-65).
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Patch, Post, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { promisify } from "node:util";
import type { FormEdition, PortalCapture, Prisma } from "@prisma/client";
import type { Response } from "express";
import { AcceptScreenMap, CHANNEL_WORDS, SetOptionMap, DecideMerge, LinkAnswerList, NewAlias, NewAnswerList, NewCapture, NewMerge, PORTALS, portalLabel, RECHECK_DAYS, ReturnCapture, SetChannel, SetPortal } from "../../contracts/forms.ts";
import { buildRecord, contractProblems, difference, fingerprint, noAnswers, reviewHtml, type CaptureInput, type CaptureRecord } from "../../engine/capture.ts";
import { channelProblems, channelsView } from "../../engine/channels.ts";
import { draftOptionMap, type FormOption } from "../../engine/options.ts";
import { buildSnapshot, effective } from "../../engine/snapshot.ts";
import { draftScreenMap, normLabel, type PdfEntry, type Proposal } from "../../engine/twin.ts";
import { actorOf, ACTORS, Audit, Db, fail, NODE, need, PY, revise, ROOT, SOLUTION, STUDIO, strip, VAR, Workspace, type Actor } from "./core.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import type { z } from "zod";

const run = promisify(execFile);
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const nameOf = (id: string) => ACTORS.find((a) => a.id === id)?.name ?? id;
const day = (d: Date) => d.toISOString().slice(0, 10);
const rel = (p: string) => relative(SOLUTION, p);
const conflict = (msg: string) => fail(msg, HttpStatus.CONFLICT);
type Upload = { originalname: string; buffer: Buffer };
type Refusal = { id: string | null; label: string; why: string };
type ReaderResult = { ok: boolean; screens?: { title: string; inputs: CaptureInput[] }[]; refused?: Refusal[]; error?: string };
/** A screen as added (before "finish" numbers it): its structure and the checksum of the file it came from. */
type DraftScreen = { title: string; inputs: CaptureInput[]; file: string; sha256: string; way: string };
type KeptFile = { file: string; sha256: string; bytes: number; way: string; screens: number };
type AddResult = { file: string; outcome: "added" | "refused" | "duplicate"; message: string; refused?: Refusal[] };
type Versioned = { id: string; version: number; status: string };
type Delegate = Parameters<typeof revise>[0];
const json = (v: unknown) => v as Prisma.InputJsonValue;
/** The screens of a capture: as added (open), or numbered in its record (finished; a returned capture reopens). */
const screensOf = (record: Prisma.JsonValue): DraftScreen[] => ((record as { screens?: (DraftScreen | CaptureRecord["screens"][number])[] } | null)?.screens ?? [])
  .map((x) => ("source" in x ? { title: x.title, inputs: x.inputs, file: x.source.file, sha256: x.source.sha256, way: x.source.way } : x));
/** A request body checked against its contract; a mismatch is a 400 Problem Details with field errors. */
function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST);
  return r.data;
}

@Injectable()
export class Forms {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit) {}

  portals() { return PORTALS; }

  // ───────────────────────────────────────────────────────────── captures (P-66 §1 ways B and C)
  async createCapture(actor: Actor, body: unknown) {
    need(actor, "author");
    const b = parse(NewCapture, body);
    const workspaceId = await this.ws.id();
    const c = await this.db.portalCapture.create({ data: { workspaceId, portalKey: b.portal, formKey: b.form, title: b.title, applicationType: b.applicationType ?? null, way: "saved_page", status: "OPEN", statusDetail: "Add the blank screens in portal order: saved pages or the template.", record: { screens: [] }, capturedBy: actor.id } });
    await this.audit.log(workspaceId, actor.id, "started", "portal capture", b.form, `${actor.name} started capturing ${b.form} from the ${portalLabel(b.portal)}`);
    return this.view(c);
  }

  /** Adds screens: each saved page is one screen, a template file holds many. A file holding an answer is refused and
   *  nothing of it is kept; the others are added. Only the structure and each file's checksum are stored. */
  async addScreens(actor: Actor, id: string, files: Upload[] | undefined) {
    need(actor, "author");
    if (!files?.length) fail("Choose at least one saved screen or template file.");
    const c = await this.db.portalCapture.findUniqueOrThrow({ where: { id } });
    if (!["OPEN", "RETURNED"].includes(c.status)) conflict(`This capture is ${c.status.toLowerCase()}: start a new capture to record the screens again.`);
    const tmp = join(VAR("demo"), "capture-reading"); mkdirSync(tmp, { recursive: true });
    const screens = screensOf(c.record), kept = [...(c.files as unknown as KeptFile[])], results: AddResult[] = [];
    for (const f of files!) {
      const name = basename(f.originalname || "screen").replace(/[^A-Za-z0-9._ -]/g, "_").slice(-100);
      const hash = sha(f.buffer ?? Buffer.alloc(0));
      const mode = /\.csv$/i.test(name) ? "template" : "page";
      if (!f.buffer?.length) { results.push({ file: name, outcome: "refused", message: "The file is empty." }); continue; }
      if (kept.some((k) => k.sha256 === hash)) { results.push({ file: name, outcome: "duplicate", message: "This file is already part of the capture; nothing added." }); continue; }
      const path = join(tmp, `${hash.slice(0, 12)}.${mode === "template" ? "csv" : "html"}`);
      writeFileSync(path, f.buffer);
      let r: ReaderResult;
      try { const { stdout } = await run(PY, ["-I", join(STUDIO, "tools", "read_portal_capture.py"), mode, path], { cwd: ROOT, timeout: 60_000, maxBuffer: 10 * 1024 * 1024 }); r = JSON.parse(stdout.trim().split("\n").pop()!); }
      catch { r = { ok: false, error: "the file could not be read" }; }
      finally { rmSync(path, { force: true }); } // the page itself is never kept (it may show a client's data as text)
      if (r.refused) {
        const what = r.refused.slice(0, 3).map((x) => `${x.label}: ${x.why}`).join("; ");
        results.push({ file: name, outcome: "refused", message: `Refused: this screen holds an answer (${what}). Nothing of it was kept. Save the screen from a blank application, before anything is typed or chosen.`, refused: r.refused });
        await this.audit.log(c.workspaceId, actor.id, "refused", "portal screen", c.formKey, `${actor.name}'s screen ${name} was refused: it held an answer (nothing kept)`, { sha256: hash, inputs: r.refused.length });
        continue;
      }
      if (!r.ok || !r.screens) { results.push({ file: name, outcome: "refused", message: `Not read: ${r.error}. Nothing was added.` }); continue; }
      const way = mode === "template" ? "template" : "saved_page";
      for (const s of r.screens) screens.push({ title: s.title, inputs: s.inputs as CaptureInput[], file: name, sha256: hash, way });
      kept.push({ file: name, sha256: hash, bytes: f.buffer.length, way, screens: r.screens.length });
      results.push({ file: name, outcome: "added", message: `${r.screens.length} screen${r.screens.length > 1 ? "s" : ""} read (${r.screens.reduce((a, s) => a + s.inputs.length, 0)} questions): ${r.screens.map((s) => s.title).join(", ")}.` });
    }
    const added = results.filter((x) => x.outcome === "added").length;
    const u = await this.db.portalCapture.update({ where: { id }, data: { record: json({ screens }), files: json(kept), way: kept[0]?.way ?? c.way, status: "OPEN", statusDetail: `${screens.length} screen${screens.length === 1 ? "" : "s"} so far. Add the next screen, or finish the capture.` } });
    if (added) await this.audit.log(c.workspaceId, actor.id, "captured", "portal screens", c.formKey, `${actor.name} added ${added} file${added > 1 ? "s" : ""} to the ${c.formKey} capture (${screens.length} screens in all; structure only)`);
    return { capture: this.view(u), results };
  }

  /** Builds the record, its fingerprint, the twin and the review document; then holds it for a second person, or says
   *  it is already in the library. */
  async finish(actor: Actor, id: string) {
    need(actor, "author");
    const c = await this.db.portalCapture.findUniqueOrThrow({ where: { id } });
    if (c.status !== "OPEN") conflict(`This capture is ${c.status.toLowerCase()}; only an open capture can be finished.`);
    const screens = screensOf(c.record);
    if (!screens.length) fail("Add at least one screen before finishing the capture.");
    const record = buildRecord({ portal: c.portalKey, form: c.formKey, title: c.title, applicationType: c.applicationType, way: c.way }, screens);
    const problems = [...contractProblems(record), ...noAnswers(record).map((p) => `${p}: a capture holds structure only`)];
    if (problems.length) fail(`The capture does not meet the capture contract: ${problems.join("; ")}.`, HttpStatus.UNPROCESSABLE_ENTITY);
    const fp = fingerprint(record);
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId: c.workspaceId, formKey: c.formKey } } });
    const versions = def ? await this.db.formEdition.findMany({ where: { govFormDefId: def.id, channel: "ONLINE", portalKey: c.portalKey }, orderBy: { capturedOn: "desc" } }) : [];
    const same = versions.find((v) => v.contentSha256 === fp);
    if (same) {
      const u = await this.db.portalCapture.update({ where: { id }, data: { record: json(record), contentSha256: fp, status: "IN_LIBRARY", formEditionId: same.id, statusDetail: `Already in the library: the screens are identical to ${same.editionLabel} (same fingerprint). Nothing new to approve; its re-check date can be confirmed.` } });
      await this.audit.log(c.workspaceId, actor.id, "finished", "portal capture", c.formKey, `${actor.name} finished the ${c.formKey} capture: identical to ${same.editionLabel}, nothing new`);
      return this.view(u);
    }
    const previous = versions[0] ?? null;
    const diff = previous ? difference(this.twinOf(previous.inventoryFile!).record, record) : null;
    const dir = join(VAR("demo"), "portal-twins"); mkdirSync(dir, { recursive: true });
    const twinPath = join(dir, `${c.formKey.replace(/\W+/g, "")}-${c.portalKey}-${fp.slice(0, 12)}.twin.json`);
    writeFileSync(twinPath, JSON.stringify({ contract: "portal-twin/v1", fingerprint: fp, capture_id: c.id, record }, null, 1));
    const status = "HELD";
    // Every prototype capture comes from the Sample fixtures until a real blank screen exists (challenge point 5).
    const html = reviewHtml({ id: c.id, status, capturedBy: nameOf(c.capturedBy), capturedOn: day(c.capturedOn), fingerprint: fp, record, difference: diff, changes: previous?.editionLabel ?? null, sample: true });
    const htmlPath = twinPath.replace(/\.twin\.json$/, ".review.html"); writeFileSync(htmlPath, html);
    const pdfPath = htmlPath.replace(/\.html$/, ".pdf");
    let printed = true;
    try { await run(NODE, [join(STUDIO, "tools", "print_pdf.mjs"), htmlPath, pdfPath], { cwd: STUDIO, timeout: 90_000 }); } catch (e) { printed = false; console.error(e); }
    const u = await this.db.portalCapture.update({ where: { id }, data: { record: json(record), contentSha256: fp, status, twinFile: rel(twinPath), reviewFile: rel(printed ? pdfPath : htmlPath), changesEditionId: previous?.id ?? null, difference: diff ? json(diff) : undefined,
      statusDetail: previous ? `Held for a second person: ${diff!.length} difference${diff!.length === 1 ? "" : "s"} from ${previous.editionLabel} (impact review). Not used until approved.` : "Held for a second person: a new online version. Not used until approved." } });
    await this.audit.log(c.workspaceId, actor.id, "finished", "portal capture", c.formKey, `${actor.name} finished the ${c.formKey} capture (${record.screens.length} screens): held for a second person${previous ? `, ${diff!.length} differences from ${previous.editionLabel}` : ""}`, { fingerprint: fp });
    return this.view(u);
  }

  /** The second person (never the one who captured it) approves: the capture becomes an online version. */
  async approve(actor: Actor, id: string) {
    need(actor, "review");
    const c = await this.db.portalCapture.findUniqueOrThrow({ where: { id } });
    if (c.status !== "HELD") conflict(c.status === "APPROVED" ? "Already approved." : `This capture is ${c.status.toLowerCase()}; only a held capture can be approved.`);
    if (c.capturedBy === actor.id) fail("A second person approves a capture: the person who captured the screens cannot approve them (P-57 as amended by P-66).", HttpStatus.FORBIDDEN);
    const record = c.record as unknown as CaptureRecord;
    const inputs = record.screens.reduce((a, s) => a + s.inputs.length, 0);
    const recheck = new Date(c.capturedOn); recheck.setUTCDate(recheck.getUTCDate() + RECHECK_DAYS);
    try {
      const ed = await this.db.$transaction(async (tx) => {
        const def = await tx.govFormDef.upsert({ where: { workspaceId_formKey: { workspaceId: c.workspaceId, formKey: c.formKey } }, update: {}, create: { workspaceId: c.workspaceId, formKey: c.formKey, displayName: c.title, formKind: "data_form" } });
        const base = `${c.formKey} online · ${portalLabel(c.portalKey)} · ${day(c.capturedOn)}`;
        let label = base; for (let n = 2; await tx.formEdition.findUnique({ where: { workspaceId_editionLabel: { workspaceId: c.workspaceId, editionLabel: label } } }); n++) label = `${base} (${n})`;
        const e = await tx.formEdition.create({ data: { workspaceId: c.workspaceId, govFormDefId: def.id, editionLabel: label, channel: "ONLINE", portalKey: c.portalKey, capturedOn: c.capturedOn, recheckBy: recheck, contentSha256: c.contentSha256, inventoryFile: c.twinFile, dataBoundBoxes: inputs } });
        const claimed = await tx.portalCapture.updateMany({ where: { id, status: "HELD" }, data: { status: "APPROVED", approvedBy: actor.id, approvedAt: new Date(), formEditionId: e.id, statusDetail: `Approved by ${actor.name}: online version ${label}, re-check by ${day(recheck)}. Next: draft its screen map (no AI).` } });
        if (!claimed.count) conflict("Already approved.");
        return e;
      });
      await this.audit.log(c.workspaceId, actor.id, "approved", "portal capture", c.formKey, `${actor.name} approved the ${c.formKey} capture by ${nameOf(c.capturedBy)}: online version ${ed.editionLabel} (${inputs} questions), re-check by ${day(recheck)}`);
      return { capture: this.view(await this.db.portalCapture.findUniqueOrThrow({ where: { id } })), edition: this.editionView(ed) };
    } catch (e) {
      if ((e as { code?: string } | null)?.code === "P2002") conflict("Already in the library: an identical online version was approved at the same moment.");
      throw e;
    }
  }

  async returnCapture(actor: Actor, id: string, body: unknown) {
    need(actor, "review");
    const b = parse(ReturnCapture, body);
    const c = await this.db.portalCapture.findUniqueOrThrow({ where: { id } });
    if (c.status !== "HELD") conflict("Only a held capture can be returned.");
    if (c.capturedBy === actor.id) fail("A second person reviews a capture: the person who captured it cannot return it to themselves.", HttpStatus.FORBIDDEN);
    const u = await this.db.portalCapture.update({ where: { id }, data: { status: "RETURNED", decisionNote: b.note, statusDetail: `Returned by ${actor.name}: ${b.note}` } });
    await this.audit.log(c.workspaceId, actor.id, "returned", "portal capture", c.formKey, `${actor.name} returned the ${c.formKey} capture: ${b.note}`);
    return this.view(u);
  }

  async captures() { const workspaceId = await this.ws.id(); return (await this.db.portalCapture.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } })).map((c) => this.view(c)); }
  async capture(id: string) { return this.view(await this.db.portalCapture.findUniqueOrThrow({ where: { id } }), true); }
  async reviewDocument(id: string) {
    const c = await this.db.portalCapture.findUniqueOrThrow({ where: { id } });
    if (!c.reviewFile) fail("The review document is made when the capture is finished.", HttpStatus.NOT_FOUND);
    return { path: join(SOLUTION, c.reviewFile!), name: basename(c.reviewFile!) };
  }

  private twinOf(file: string) { return JSON.parse(readFileSync(join(SOLUTION, file), "utf8")) as { fingerprint: string; record: CaptureRecord }; }
  private view(c: PortalCapture, full = false) {
    const screens = screensOf(c.record);
    return { id: c.id, portal: c.portalKey, portal_label: portalLabel(c.portalKey), form: c.formKey, title: c.title, application_type: c.applicationType, way: c.way, status: c.status, status_detail: c.statusDetail,
      screens: screens.map((s, i) => ({ order: i + 1, title: s.title, questions: s.inputs.length, file: s.file })), questions: screens.reduce((a, s) => a + s.inputs.length, 0), files: c.files, fingerprint: c.contentSha256,
      difference: c.difference, changes_edition_id: c.changesEditionId, form_edition_id: c.formEditionId, review_file: c.reviewFile, captured_on: c.capturedOn ? day(c.capturedOn) : null, captured_by: c.capturedBy, captured_by_name: nameOf(c.capturedBy),
      approved_by: c.approvedBy, approved_at: c.approvedAt, decision_note: c.decisionNote, ...(full ? { record: c.record } : {}) };
  }
  private editionView(e: FormEdition) { return { id: e.id, label: e.editionLabel, channel: e.channel, portal: e.portalKey, captured_on: e.capturedOn ? day(e.capturedOn) : null, recheck_by: e.recheckBy ? day(e.recheckBy) : null, fingerprint: e.contentSha256, questions: e.dataBoundBoxes }; }

  // ───────────────────────────────────────────────────────────── online versions: screen map without AI
  private async libraryRows(workspaceId: string) {
    const rows = await this.db.canonicalField.findMany({ where: { workspaceId }, orderBy: { version: "desc" } });
    const newest = new Map<string, (typeof rows)[number]>(); for (const r of rows) if (!newest.has(r.canonicalFieldKey)) newest.set(r.canonicalFieldKey, r);
    return [...newest.values()];
  }
  private async mapRows(editionId: string) { return effective(await this.db.formFieldMap.findMany({ where: { formEditionId: editionId } }), (m) => m.dataPath, "draft"); }

  async draftScreenMapFor(actor: Actor, editionId: string) {
    need(actor, "author");
    const ed = await this.db.formEdition.findUniqueOrThrow({ where: { id: editionId }, include: { form: { include: { editions: true } } } });
    if (ed.channel !== "ONLINE") fail("Screen maps are drafted for online versions; a PDF edition's field map is drafted from its file.");
    if (await this.db.formFieldMap.count({ where: { formEditionId: editionId } })) conflict(`${ed.editionLabel} already has a screen map.`);
    const twin = this.twinOf(ed.inventoryFile!);
    const pdfs = ed.form.editions.filter((e) => e.channel === "PDF").sort((a, b) => (a.editionLabel < b.editionLabel ? 1 : -1));
    let pdfEdition: string | null = null, pdf: PdfEntry[] = [];
    for (const p of pdfs) { const rows = await this.mapRows(p.id); if (rows.length) { pdfEdition = p.editionLabel; pdf = rows.map((m) => ({ data_path: m.dataPath, caption: m.caption, heading: m.heading, fact: m.canonicalFieldKey, transform: m.transform, person: m.person, outcome: m.outcome })); break; } }
    const previous = new Map<string, { fact: string | null; transform: string | null; person: string | null; edition: string }>();
    for (const o of ed.form.editions.filter((e) => e.channel === "ONLINE" && e.portalKey === ed.portalKey && e.id !== ed.id)) for (const m of await this.mapRows(o.id)) if (m.outcome === "mapped" && !previous.has(m.dataPath)) previous.set(m.dataPath, { fact: m.canonicalFieldKey, transform: m.transform, person: m.person, edition: o.editionLabel });
    const library = (await this.libraryRows(ed.workspaceId)).filter((r) => r.status !== "RETIRED" || r.mergedIntoKey).map((r) => ({ key: r.canonicalFieldKey, valueType: r.valueType, aliases: r.aliases, mergedIntoKey: r.mergedIntoKey, answerListKey: r.answerListKey }));
    const draft = draftScreenMap(twin.record, { pdf, pdfEdition, previous, library });
    const dir = join(VAR("demo"), "screen-maps"); mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${ed.id}.json`), JSON.stringify({ edition: ed.editionLabel, fingerprint: twin.fingerprint, pdf_edition: pdfEdition, at: new Date().toISOString(), ...draft }, null, 1));
    await this.audit.log(ed.workspaceId, actor.id, "drafted", "screen map", ed.form.formKey, `${actor.name} drafted the screen map of ${ed.editionLabel} without AI: ${draft.counts.mapped} of ${draft.counts.inputs} inputs matched (${draft.counts.same_path} same id, ${draft.counts.pdf_twin} from ${pdfEdition ?? "no PDF twin"}, ${draft.counts.alias} by alias); ${draft.counts.leftover} left for drafting or a person; US$0`);
    return { edition: this.editionView(ed), pdf_edition: pdfEdition, ...draft };
  }

  /** A person accepts the drafted screen map (all matches, or the listed inputs): it becomes the online version's field
   *  map (DRAFT, origin CODE_MATCH); leftovers stay unresolved with the reason. The online labels of PDF-twin matches are
   *  learned as aliases, and choice inputs on an answer list get their option map drafted. */
  async acceptScreenMap(actor: Actor, editionId: string, body: unknown) {
    need(actor, "review");
    const b = parse(AcceptScreenMap, body);
    const ed = await this.db.formEdition.findUniqueOrThrow({ where: { id: editionId }, include: { form: true } });
    const file = join(VAR("demo"), "screen-maps", `${ed.id}.json`);
    if (!existsSync(file)) fail("Draft the screen map first.", HttpStatus.CONFLICT);
    const draft = JSON.parse(readFileSync(file, "utf8")) as { fingerprint: string; proposals: Proposal[] };
    const twin = this.twinOf(ed.inventoryFile!);
    if (draft.fingerprint !== twin.fingerprint) conflict("The online version changed since the screen map was drafted: draft it again.");
    const pick = b.inputs ? new Set(b.inputs) : null;
    const lib = new Map((await this.libraryRows(ed.workspaceId)).map((r) => [r.canonicalFieldKey, r]));
    const lists = new Map((await this.db.answerList.findMany({ where: { workspaceId: ed.workspaceId }, include: { values: { orderBy: { sortOrder: "asc" } } }, orderBy: { version: "desc" } })).map((l) => [l.answerListKey, l]));
    const inputOf = new Map(twin.record.screens.flatMap((s) => s.inputs.map((i) => [i.id, i] as const)));
    let learned = 0;
    const res = await this.db.$transaction(async (tx) => {
      const claimed = await tx.formFieldMap.count({ where: { formEditionId: ed.id } });
      if (claimed) conflict(`${ed.editionLabel} already has a screen map.`);
      const rows = draft.proposals.map((p) => {
        const take = p.outcome === "mapped" && (!pick || pick.has(p.input));
        const field = take && p.fact ? lib.get(p.fact) : undefined;
        const list = field?.answerListKey ? lists.get(field.answerListKey) : undefined;
        const opts = (inputOf.get(p.input)?.options ?? []) as FormOption[];
        const om = take && list && opts.length ? draftOptionMap(list.values.map((v) => ({ key: v.valueKey, label: v.label })), opts) : null;
        return { workspaceId: ed.workspaceId, formEditionId: ed.id, dataPath: p.input, caption: [p.group, p.label].filter(Boolean).join(" › ").slice(0, 500), heading: p.screen, screenKey: `s${String(p.screen_order).padStart(2, "0")}`, screenOrder: p.screen_order, inputOrder: p.input_order,
          outcome: take ? "mapped" : p.outcome === "not_a_fact" ? "not_a_fact" : "unresolved", person: take ? p.person : null, canonicalFieldKey: take ? p.fact : null, transform: take ? p.transform : null, confidence: take ? "exact" : null,
          evidenceQuote: take ? (p.from ?? p.why).slice(0, 500) : null, reason: take ? null : p.outcome === "mapped" ? `not accepted by ${actor.name}` : p.why, optionMap: om ? json(om.optionMap) : undefined,
          version: 1, status: "DRAFT" as const, origin: "CODE_MATCH" as const, updatedBy: actor.id };
      });
      await tx.formFieldMap.createMany({ data: rows });
      // Learned aliases: the label a person accepted for a shared field (matching metadata, outside released content).
      for (const p of draft.proposals.filter((x) => x.method === "pdf_twin" && x.fact && (!pick || pick.has(x.input)))) {
        const label = p.part ? p.group : p.label; const f = lib.get(p.fact!);
        if (!label || !f || f.aliases.some((a) => normLabel(a) === normLabel(label))) continue;
        f.aliases = [...f.aliases, label]; await tx.canonicalField.update({ where: { id: f.id }, data: { aliases: f.aliases } }); learned++;
      }
      return { mapped: rows.filter((r) => r.outcome === "mapped").length, unresolved: rows.filter((r) => r.outcome === "unresolved").length, not_a_fact: rows.filter((r) => r.outcome === "not_a_fact").length, option_maps: rows.filter((r) => r.optionMap).length };
    });
    await this.audit.log(ed.workspaceId, actor.id, "accepted", "screen map", ed.form.formKey, `${actor.name} accepted the screen map of ${ed.editionLabel}: ${res.mapped} mapped, ${res.unresolved} still open, ${res.not_a_fact} not a fact; ${learned} labels learned as aliases; no AI`);
    return { ...res, aliases_learned: learned };
  }

  async editions(formKey: string) {
    const workspaceId = await this.ws.id();
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey } }, include: { editions: { include: { _count: { select: { maps: true } } } } } });
    if (!def) fail(`${formKey} is not in the library.`, HttpStatus.NOT_FOUND);
    return def!.editions.map((e) => ({ ...this.editionView(e), mapped: e._count.maps }));
  }

  // ───────────────────────────────────────────────────────────── channels per combination
  async setPortal(actor: Actor, combinationId: string, body: unknown) {
    need(actor, "author");
    const b = parse(SetPortal, body);
    const c = await this.db.combination.update({ where: { id: combinationId }, data: { portalKey: b.portal } });
    await this.audit.log(c.workspaceId, actor.id, "changed", "combination", c.combinationKey, `${actor.name} set the portal of "${c.label}" to ${b.portal ? portalLabel(b.portal) : "none"}`, undefined, c.id);
    return this.channels(combinationId);
  }

  async setChannel(actor: Actor, combinationId: string, lineKey: string, body: unknown) {
    need(actor, "author");
    const b = parse(SetChannel, body);
    const rows = await this.db.combinationForm.findMany({ where: { combinationId, lineageKey: lineKey } });
    if (!rows.length) fail(`${lineKey} is not a form of this combination.`, HttpStatus.NOT_FOUND);
    const newest = [...rows].sort((x, y) => y.version - x.version)[0];
    if (newest.status === "RETIRED") fail(`${lineKey} was removed from this combination.`, HttpStatus.NOT_FOUND);
    if (newest.channel === b.channel) return this.channels(combinationId);
    await revise(this.db.combinationForm, rows, { channel: b.channel }, actor.id, strip);
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } });
    await this.audit.log(c.workspaceId, actor.id, "changed", "form line", lineKey, `${actor.name} set how ${lineKey} is filed in "${c.label}": ${CHANNEL_WORDS[newest.channel]} → ${CHANNEL_WORDS[b.channel]}`, undefined, c.id);
    return this.channels(combinationId);
  }

  async channels(combinationId: string) {
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } });
    const { snapshot } = await buildSnapshot(this.db, c.workspaceId, combinationId, "draft");
    return { ...channelsView(snapshot), problems: channelProblems(snapshot) };
  }

  // ───────────────────────────────────────────────────────────── library: aliases, answer lists, option maps (P-65)
  async addAlias(actor: Actor, key: string, body: unknown) {
    need(actor, "author");
    const b = parse(NewAlias, body);
    const workspaceId = await this.ws.id();
    const rows = await this.libraryRows(workspaceId);
    const f = rows.find((r) => r.canonicalFieldKey === key);
    if (!f || f.status === "RETIRED") fail(`${key} is not in the library.`, HttpStatus.NOT_FOUND);
    const k = normLabel(b.alias);
    const other = rows.find((r) => r.canonicalFieldKey !== key && !r.mergedIntoKey && (r.aliases.some((a) => normLabel(a) === k) || normLabel(r.canonicalFieldKey.split(".").slice(1).join(" ").replace(/_/g, " ")) === k));
    if (other) conflict(`"${b.alias}" already names ${other.canonicalFieldKey}: one label points to one shared field (a reviewed merge joins two fields).`);
    if (f!.aliases.some((a) => normLabel(a) === k)) return { key, aliases: f!.aliases };
    const u = await this.db.canonicalField.update({ where: { id: f!.id }, data: { aliases: [...f!.aliases, b.alias] } });
    await this.audit.log(workspaceId, actor.id, "added", "alias", key, `${actor.name} added "${b.alias}" as a label of ${key}`);
    return { key, aliases: u.aliases };
  }

  async answerLists() {
    const workspaceId = await this.ws.id();
    const rows = await this.db.answerList.findMany({ where: { workspaceId }, include: { values: { orderBy: { sortOrder: "asc" } } } });
    return effective(rows, (l) => l.answerListKey, "draft").map((l) => ({ key: l.answerListKey, label: l.label, version: l.version, status: l.status, basis: l.sourceBasis, values: l.values.map((v) => ({ key: v.valueKey, label: v.label })) }));
  }

  async createAnswerList(actor: Actor, body: unknown) {
    need(actor, "author");
    const b = parse(NewAnswerList, body);
    const workspaceId = await this.ws.id();
    if (await this.db.answerList.findFirst({ where: { workspaceId, answerListKey: b.key } })) conflict(`An answer list ${b.key} already exists.`);
    const keys = b.values.map((v) => v.key); if (new Set(keys).size !== keys.length) fail("Each value key appears once.");
    await this.db.answerList.create({ data: { workspaceId, answerListKey: b.key, version: 1, status: "DRAFT", label: b.label, origin: "HUMAN", updatedBy: actor.id, values: { create: b.values.map((v, i) => ({ valueKey: v.key, label: v.label, sortOrder: i + 1 })) } } });
    await this.audit.log(workspaceId, actor.id, "created", "answer list", b.key, `${actor.name} created the answer list ${b.key} (${b.values.length} values; Sample until the immigration expert confirms)`);
    return (await this.answerLists()).find((l) => l.key === b.key);
  }

  async linkAnswerList(actor: Actor, key: string, body: unknown) {
    need(actor, "author");
    const b = parse(LinkAnswerList, body);
    const workspaceId = await this.ws.id();
    if (!(await this.db.answerList.findFirst({ where: { workspaceId, answerListKey: b.list } }))) fail(`There is no answer list ${b.list}.`, HttpStatus.NOT_FOUND);
    const rows = await this.db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: key } });
    const newest = [...rows].sort((x, y) => y.version - x.version)[0];
    if (!newest || newest.status === "RETIRED") fail(`${key} is not in the library.`, HttpStatus.NOT_FOUND);
    if (!["code", "country", "yes_no", "text"].includes(newest.valueType)) fail(`${key} holds a ${newest.valueType}; only a choice field takes an answer list.`);
    await revise(this.db.canonicalField, rows, { answerListKey: b.list, valueType: newest.valueType === "text" ? "code" : newest.valueType, dataType: "ENUM" }, actor.id, strip);
    await this.audit.log(workspaceId, actor.id, "changed", "field", key, `${actor.name} gave ${key} the answer list ${b.list}`);
    return { key, answer_list: b.list };
  }

  /** Drafts the option maps of one edition (PDF or online) for every mapped form field whose shared field has an
   *  answer list, without AI. A published row gets a new draft version; released content is untouched. */
  async draftOptionMaps(actor: Actor, editionId: string) {
    need(actor, "author");
    const ed = await this.db.formEdition.findUniqueOrThrow({ where: { id: editionId } });
    const lib = new Map((await this.libraryRows(ed.workspaceId)).map((r) => [r.canonicalFieldKey, r]));
    const lists = new Map((await this.db.answerList.findMany({ where: { workspaceId: ed.workspaceId }, include: { values: { orderBy: { sortOrder: "asc" } } }, orderBy: { version: "desc" } })).map((l) => [l.answerListKey, l]));
    const optionsOf = this.formOptions(ed);
    const all = await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id } });
    const out: ({ form_field: string; caption: string | null; fact: string | null; list: string } & ReturnType<typeof draftOptionMap>)[] = [];
    for (const m of effective(all, (x) => x.dataPath, "draft")) {
      const list = m.outcome === "mapped" && m.canonicalFieldKey ? lists.get(lib.get(m.canonicalFieldKey)?.answerListKey ?? "") : undefined;
      const opts = optionsOf.get(m.dataPath);
      if (!list || !opts?.length) continue;
      const d = draftOptionMap(list.values.map((v) => ({ key: v.valueKey, label: v.label })), opts);
      if (JSON.stringify(m.optionMap) !== JSON.stringify(d.optionMap)) await revise(this.db.formFieldMap, all.filter((x) => x.dataPath === m.dataPath), { optionMap: json(d.optionMap) }, actor.id, strip);
      out.push({ form_field: m.dataPath, caption: m.caption, fact: m.canonicalFieldKey, list: list.answerListKey, ...d });
    }
    await this.audit.log(ed.workspaceId, actor.id, "drafted", "option maps", ed.editionLabel, `${actor.name} drafted ${out.length} option map${out.length === 1 ? "" : "s"} of ${ed.editionLabel} without AI (${out.filter((o) => o.unmatched.length).length} with values left for a person)`);
    return { edition: ed.editionLabel, channel: ed.channel, option_maps: out };
  }

  /** A person sets or corrects one form field's option map (the drafted one left a value or a code open). Every value
   *  must be on the field's answer list and every code among the form field's own choices. */
  async setOptionMap(actor: Actor, editionId: string, dataPath: string, body: unknown) {
    need(actor, "author");
    const b = parse(SetOptionMap, body);
    const ed = await this.db.formEdition.findUniqueOrThrow({ where: { id: editionId } });
    const rows = await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id, dataPath } });
    const m = effective(rows, (x) => x.dataPath, "draft")[0];
    if (!m || m.outcome !== "mapped" || !m.canonicalFieldKey) fail("That form field is not mapped to a shared field.", HttpStatus.NOT_FOUND);
    const field = (await this.libraryRows(ed.workspaceId)).find((r) => r.canonicalFieldKey === m!.canonicalFieldKey);
    const list = field?.answerListKey ? await this.db.answerList.findFirst({ where: { workspaceId: ed.workspaceId, answerListKey: field.answerListKey }, include: { values: true }, orderBy: { version: "desc" } }) : null;
    if (!list) fail(`${m!.canonicalFieldKey} has no answer list.`, HttpStatus.CONFLICT);
    const codes = (this.formOptions(ed).get(dataPath) ?? []).map((o) => o.code);
    const values = new Set(list!.values.map((v) => v.valueKey));
    const bad = [...Object.keys(b.map).filter((k) => !values.has(k)).map((k) => `"${k}" is not on the answer list ${list!.answerListKey}`), ...[...Object.values(b.map), ...b.unused].filter((c) => !codes.includes(c)).map((c) => `"${c}" is not one of this form field's codes`)];
    if (new Set(Object.values(b.map)).size !== Object.values(b.map).length) bad.push("two values share one code");
    if (bad.length) fail(`${bad.join("; ")}.`);
    await revise(this.db.formFieldMap, rows, { optionMap: json({ map: b.map, unused: b.unused, codes }) }, actor.id, strip);
    await this.audit.log(ed.workspaceId, actor.id, "changed", "option map", dataPath, `${actor.name} set the option map of ${m!.caption ?? dataPath} on ${ed.editionLabel} (${Object.keys(b.map).length} values)`);
    return { form_field: dataPath, option_map: { map: b.map, unused: b.unused, codes } };
  }

  /** A form field's own choices: the PDF inventory's resolved options (label, code), or the online twin's (code, label). */
  private formOptions(ed: { channel: string; inventoryFile: string | null }) {
    const out = new Map<string, FormOption[]>();
    if (!ed.inventoryFile) return out;
    const inv = JSON.parse(readFileSync(join(SOLUTION, ed.inventoryFile), "utf8")) as { record?: CaptureRecord; fields?: { data_path?: string; options_resolved?: [string, string][] | null }[] };
    if (ed.channel === "ONLINE") { for (const s of inv.record?.screens ?? []) for (const i of s.inputs) if (i.options?.length) out.set(i.id, i.options); }
    else for (const f of inv.fields ?? []) if (f.data_path && Array.isArray(f.options_resolved)) out.set(f.data_path, f.options_resolved.filter((o) => o[0] !== "" || o[1] !== "").map((o) => ({ code: String(o[1]), label: String(o[0]) })));
    return out;
  }

  // ───────────────────────────────────────────────────────────── reviewed merges (P-65)
  async merges() { const workspaceId = await this.ws.id(); return this.db.fieldMerge.findMany({ where: { workspaceId }, orderBy: { proposedAt: "desc" } }); }

  async proposeMerge(actor: Actor, body: unknown) {
    need(actor, "author");
    const b = parse(NewMerge, body);
    if (b.keep === b.merge) fail("Choose two different fields.");
    const workspaceId = await this.ws.id();
    const rows = await this.libraryRows(workspaceId);
    const keep = rows.find((r) => r.canonicalFieldKey === b.keep), merge = rows.find((r) => r.canonicalFieldKey === b.merge);
    for (const [k, r] of [[b.keep, keep], [b.merge, merge]] as const) if (!r || r.status === "RETIRED" || r.mergedIntoKey) fail(`${k} is not an active field of the library.`, HttpStatus.NOT_FOUND);
    if (keep!.valueType !== merge!.valueType) conflict(`${b.keep} holds a ${keep!.valueType} and ${b.merge} a ${merge!.valueType}: fields of different kinds are not the same meaning.`);
    if (await this.db.fieldMerge.findFirst({ where: { workspaceId, status: "PROPOSED", OR: [{ keepKey: b.keep, mergeKey: b.merge }, { keepKey: b.merge, mergeKey: b.keep }] } })) conflict("This merge is already waiting for a second person.");
    const m = await this.db.fieldMerge.create({ data: { workspaceId, keepKey: b.keep, mergeKey: b.merge, reason: b.reason, status: "PROPOSED", proposedBy: actor.id } });
    await this.audit.log(workspaceId, actor.id, "proposed", "field merge", b.merge, `${actor.name} proposed merging ${b.merge} into ${b.keep}: ${b.reason}`);
    return m;
  }

  /** A different person approves: one id survives; the other becomes its alias and redirects; draft mappings,
   *  placements, conditions and document supplies move to the surviving id (published rows get new draft versions);
   *  frozen releases are not touched. */
  async approveMerge(actor: Actor, id: string, body: unknown) {
    need(actor, "review");
    const b = parse(DecideMerge, body);
    const m = await this.db.fieldMerge.findUniqueOrThrow({ where: { id } });
    if (m.status !== "PROPOSED") conflict(`This merge is already ${m.status.toLowerCase()}.`);
    if (m.proposedBy === actor.id) fail("A different person approves a merge (P-15, P-65).", HttpStatus.FORBIDDEN);
    const ws = m.workspaceId, from = m.mergeKey, to = m.keepKey;
    const swap = <T>(j: T): T => (j == null ? j : (JSON.parse(JSON.stringify(j).split(`"field":"${from}"`).join(`"field":"${to}"`)) as T));
    const reads = (j: unknown) => !!j && JSON.stringify(j).includes(`"field":"${from}"`);
    const moved: Record<string, number> = {}; const touched = new Set<string>();
    const bump = (k: string, n = 1) => { moved[k] = (moved[k] ?? 0) + n; };
    await this.db.$transaction(async (tx) => {
      const claimed = await tx.fieldMerge.updateMany({ where: { id, status: "PROPOSED" }, data: { status: "APPLIED", decidedBy: actor.id, decidedAt: new Date(), decisionNote: b.note ?? null } });
      if (!claimed.count) conflict("This merge was decided at the same moment.");
      const fields = await tx.canonicalField.findMany({ where: { workspaceId: ws, canonicalFieldKey: { in: [from, to] } }, orderBy: { version: "desc" } });
      const keep = fields.find((f) => f.canonicalFieldKey === to)!, gone = fields.find((f) => f.canonicalFieldKey === from)!;
      await tx.canonicalField.update({ where: { id: keep.id }, data: { aliases: [...new Set([...keep.aliases, from, ...gone.aliases])] } });
      if (gone.status === "DRAFT") await tx.canonicalField.update({ where: { id: gone.id }, data: { status: "RETIRED", mergedIntoKey: to, updatedBy: actor.id } });
      else await tx.canonicalField.create({ data: { ...strip(gone), version: gone.version + 1, status: "RETIRED", supersedesId: gone.id, mergedIntoKey: to, updatedBy: actor.id } as Prisma.CanonicalFieldUncheckedCreateInput });
      // Each versioned lineage is moved once, on its newest row (a published row gets a new draft version).
      const moveLineages = async <R extends Versioned>(label: string, delegate: Delegate, rows: R[], keyOf: (r: R) => string, changes: (r: R) => Record<string, unknown>, combOf?: (r: R) => string | null) => {
        const by = new Map<string, R[]>(); for (const r of rows) by.set(keyOf(r), [...(by.get(keyOf(r)) ?? []), r]);
        for (const list of by.values()) { const newest = [...list].sort((x, y) => y.version - x.version)[0]; if (newest.status === "RETIRED") continue; await revise(delegate, list, changes(newest), actor.id, strip); bump(label); const c = combOf?.(newest); if (c) touched.add(c); }
      };
      const maps = await tx.formFieldMap.findMany({ where: { workspaceId: ws } });
      const mapLineages = new Set(maps.filter((r) => r.canonicalFieldKey === from).map((r) => `${r.formEditionId}|${r.dataPath}`));
      await moveLineages("form fields", tx.formFieldMap, maps.filter((r) => mapLineages.has(`${r.formEditionId}|${r.dataPath}`)), (r) => `${r.formEditionId}|${r.dataPath}`, (r) => (r.canonicalFieldKey === from ? { canonicalFieldKey: to } : {}));
      const qs = await tx.sectionQuestion.findMany({ where: { workspaceId: ws } });
      const qLineages = new Set(qs.filter((q) => q.canonicalFieldKey === from || reads(q.predicateJson)).map((q) => q.lineageKey));
      await moveLineages("question placements", tx.sectionQuestion, qs.filter((q) => qLineages.has(q.lineageKey)), (q) => q.lineageKey, (q) => ({ ...(q.canonicalFieldKey === from ? { canonicalFieldKey: to } : {}), ...(reads(q.predicateJson) ? { predicateJson: swap(q.predicateJson) } : {}) }));
      const moveConditions = async <R extends Versioned & { combinationId: string; predicateJson: Prisma.JsonValue }>(label: string, delegate: Delegate, rows: R[], keyOf: (r: R) => string) => {
        const hit = new Set(rows.filter((r) => reads(r.predicateJson)).map(keyOf));
        await moveLineages(label, delegate, rows.filter((r) => hit.has(keyOf(r))), keyOf, (r) => ({ predicateJson: swap(r.predicateJson) }), (r) => r.combinationId);
      };
      await moveConditions("form conditions", tx.combinationForm, await tx.combinationForm.findMany({ where: { workspaceId: ws } }), (r) => `${r.combinationId}|${r.lineageKey}`);
      await moveConditions("document conditions", tx.documentRequirement, await tx.documentRequirement.findMany({ where: { workspaceId: ws } }), (r) => `${r.combinationId}|${r.lineageKey}`);
      await moveConditions("rules", tx.predicate, await tx.predicate.findMany({ where: { workspaceId: ws } }), (r) => `${r.combinationId}|${r.predicateKey}`);
      await moveConditions("checks", tx.check, await tx.check.findMany({ where: { workspaceId: ws } }), (r) => `${r.combinationId}|${r.checkKey}`);
      const types = await tx.documentType.findMany({ where: { workspaceId: ws } });
      const tHit = new Set(types.filter((t) => t.suppliesFacts.includes(from)).map((t) => t.documentTypeKey));
      await moveLineages("document supplies", tx.documentType, types.filter((t) => tHit.has(t.documentTypeKey)), (t) => t.documentTypeKey, (t) => ({ suppliesFacts: [...new Set(t.suppliesFacts.map((f: string) => (f === from ? to : f)))] }));
      for (const d of await tx.derivedField.findMany({ where: { workspaceId: ws } })) if (d.inputs.includes(from) || d.reference === from) { await tx.derivedField.update({ where: { id: d.id }, data: { inputs: d.inputs.map((i) => (i === from ? to : i)), reference: d.reference === from ? to : d.reference } }); bump("derived definitions"); }
      const facts = await tx.sampleFact.updateMany({ where: { workspaceId: ws, canonicalFieldKey: from }, data: { canonicalFieldKey: to } }); if (facts.count) bump("sample facts (scaffolding)", facts.count);
      for (const f of await tx.combinationForm.findMany({ where: { workspaceId: ws }, select: { combinationId: true, form: { select: { editions: { select: { id: true } } } } } })) if (f.form.editions.some((e) => [...mapLineages].some((k) => k.startsWith(`${e.id}|`)))) touched.add(f.combinationId);
      await tx.fieldMerge.update({ where: { id }, data: { moved: moved as Prisma.InputJsonValue } });
    });
    for (const c of touched) await this.audit.log(ws, actor.id, "merged", "field", from, `${actor.name} approved merging ${from} into ${to} (proposed by ${nameOf(m.proposedBy)}): this combination's draft now reads ${to}`, { moved }, c);
    await this.audit.log(ws, actor.id, "merged", "field", from, `${actor.name} approved merging ${from} into ${to} (proposed by ${nameOf(m.proposedBy)}): ${Object.entries(moved).map(([k, n]) => `${n} ${k}`).join(", ") || "nothing else read it"}; ${from} now redirects to ${to}; releases untouched`, { moved });
    return { ...(await this.db.fieldMerge.findUniqueOrThrow({ where: { id } })), combinations: touched.size };
  }

  async rejectMerge(actor: Actor, id: string, body: unknown) {
    need(actor, "review");
    const b = parse(DecideMerge, body);
    const m = await this.db.fieldMerge.findUniqueOrThrow({ where: { id } });
    if (m.status !== "PROPOSED") conflict(`This merge is already ${m.status.toLowerCase()}.`);
    if (m.proposedBy === actor.id) fail("A different person decides a merge.", HttpStatus.FORBIDDEN);
    const u = await this.db.fieldMerge.update({ where: { id }, data: { status: "REJECTED", decidedBy: actor.id, decidedAt: new Date(), decisionNote: b.note ?? null } });
    await this.audit.log(m.workspaceId, actor.id, "rejected", "field merge", m.mergeKey, `${actor.name} rejected merging ${m.mergeKey} into ${m.keepKey}${b.note ? `: ${b.note}` : ""}`);
    return u;
  }
}

type H = string | undefined;
const send = async (res: Response, file: { path: string; name: string }) => { if (!existsSync(file.path)) throw new HttpException("Not found", HttpStatus.NOT_FOUND); res.download(file.path, file.name); };

@Controller("api")
export class FormsController {
  constructor(@Inject(Forms) private readonly f: Forms) {}
  @Get("portals") portals() { return this.f.portals(); }
  @Get("captures") captures() { return this.f.captures(); }
  @Post("captures") create(@Headers("x-actor") a: H, @Body() b: unknown) { return this.f.createCapture(actorOf(a), b); }
  @Get("captures/:id") capture(@Param("id") id: string) { return this.f.capture(id); }
  @Post("captures/:id/screens") @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: 10 * 1024 * 1024, files: 30 } }))
  screens(@Headers("x-actor") a: H, @Param("id") id: string, @UploadedFiles() files: Upload[]) { return this.f.addScreens(actorOf(a), id, files); }
  @Post("captures/:id/finish") finish(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.finish(actorOf(a), id); }
  @Post("captures/:id/approve") approve(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.approve(actorOf(a), id); }
  @Post("captures/:id/return") ret(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.returnCapture(actorOf(a), id, b); }
  @Get("captures/:id/review") async review(@Param("id") id: string, @Res() res: Response) { await send(res, await this.f.reviewDocument(id)); }
  @Get("library/forms/:code/editions") editions(@Param("code") code: string) { return this.f.editions(code); }
  @Post("online-versions/:id/screen-map/draft") draft(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.draftScreenMapFor(actorOf(a), id); }
  @Post("online-versions/:id/screen-map/accept") accept(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.acceptScreenMap(actorOf(a), id, b); }
  @Post("editions/:id/option-maps/draft") optionMaps(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.draftOptionMaps(actorOf(a), id); }
  @Patch("editions/:id/option-maps") setOptionMap(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: { dataPath?: string; map?: unknown; unused?: unknown }) { return this.f.setOptionMap(actorOf(a), id, String(b?.dataPath ?? ""), b); }
  @Get("combinations/:id/channels") channels(@Param("id") id: string) { return this.f.channels(id); }
  @Patch("combinations/:id/portal") portal(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.setPortal(actorOf(a), id, b); }
  @Patch("combinations/:id/forms/:line/channel") channel(@Headers("x-actor") a: H, @Param("id") id: string, @Param("line") l: string, @Body() b: unknown) { return this.f.setChannel(actorOf(a), id, l, b); }
  @Post("library/fields/:key/aliases") alias(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.f.addAlias(actorOf(a), k, b); }
  @Post("library/fields/:key/answer-list") link(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.f.linkAnswerList(actorOf(a), k, b); }
  @Get("library/answer-lists") lists() { return this.f.answerLists(); }
  @Post("library/answer-lists") addList(@Headers("x-actor") a: H, @Body() b: unknown) { return this.f.createAnswerList(actorOf(a), b); }
  @Get("library/merges") merges() { return this.f.merges(); }
  @Post("library/merges") propose(@Headers("x-actor") a: H, @Body() b: unknown) { return this.f.proposeMerge(actorOf(a), b); }
  @Post("library/merges/:id/approve") approveMerge(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.approveMerge(actorOf(a), id, b); }
  @Post("library/merges/:id/reject") rejectMerge(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.rejectMerge(actorOf(a), id, b); }
}
