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
// CHECK fixes (23 Oct): every write to a capture claims its revision (two writes cannot both win); a screen can be
// removed and a capture abandoned; an identical re-capture lets a second person confirm the re-check date; a person maps
// the inputs the drafting left open; merges are checked again when approved; the review document prints in the
// background, never inside the request.
import { Body, Controller, Delete, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Patch, Post, Query, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { promisify } from "node:util";
import { Prisma, type FormEdition, type PortalCapture } from "@prisma/client";
import type { Response } from "express";
import { AbandonCapture, AcceptAiProposals, AcceptScreenMap, DraftLeftovers, CAPTURE_LIMITS, CHANNEL_WORDS, SetOptionMap, DecideMerge, LinkAnswerList, NewAlias, NewAnswerList, NewCapture, NewMerge, PORTALS, portalLabel, RECHECK_DAYS, ResolveInput, ReturnCapture, SetChannel, SetPortal } from "../../contracts/forms.ts";
import { buildRecord, contractProblems, difference, fingerprint, noAnswers, reviewHtml, type CaptureInput, type CaptureRecord } from "../../engine/capture.ts";
import { channelProblems, channelsView } from "../../engine/channels.ts";
import { draftOptionMap, pdfOptions, type FormOption } from "../../engine/options.ts";
import { buildSnapshot, effective } from "../../engine/snapshot.ts";
import { compatible, draftScreenMap, normLabel, readScreenRun, transformFor, type AiProposal, type PdfEntry, type Proposal } from "../../engine/twin.ts";
import { partOutputTokens } from "../../engine/parts.ts";
import { factKeyProblem } from "../../../contracts/fact-key.ts";
import { costUsd } from "../../../p2/ledger.ts";
import { PARTS_DIR, RUN_CAP_USD, SCREEN_INVENTORIES } from "../../../p2/policy.ts";
import { resolveKey } from "./form-lines.ts";
import { Sources } from "./sources.ts";
import { actorOf, ACTORS, Audit, Db, fail, NODE, need, PROTOTYPE, PY, revise, ROOT, SOLUTION, STUDIO, strip, VAR, Workspace, type Actor } from "./core.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import type { z } from "zod";

const run = promisify(execFile);
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const nameOf = (id: string) => ACTORS.find((a) => a.id === id)?.name ?? id;
const day = (d: Date) => d.toISOString().slice(0, 10);
const rel = (p: string) => relative(SOLUTION, p);
const conflict = (msg: string) => fail(msg, HttpStatus.CONFLICT);
/** A form code as the library writes it: capitals, one space between its parts ("IMM-5257" → "IMM 5257"). */
const formCode = (s: string) => s.trim().toUpperCase().replace(/[\s_-]+/g, " ");
const compact = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
const slug = (s: string) => normLabel(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "screen";
/** A screen and its question, said once ("Date of birth › Year"; a radio group's legend is its question). */
const captionOf = (group: string | null | undefined, label: string) => (group && normLabel(group) !== normLabel(label) ? `${group} › ${label}` : label);
const STATUS_WORDS: Record<string, string> = { OPEN: "reopened", HELD: "finished", APPROVED: "approved", RETURNED: "returned", IN_LIBRARY: "found already in the library", ABANDONED: "abandoned" };
/** What a capture's author or reviewer does next, by status. */
const NEXT: Record<string, string> = {
  OPEN: "Add the next screen, remove a wrong one, or finish the capture.",
  HELD: "A second person approves it or returns it with a reason.",
  RETURNED: "Remove the screens that are wrong, add them again and finish; or abandon the capture.",
  IN_LIBRARY: "A second person confirms the screens are unchanged, which renews the online version's re-check date.",
  APPROVED: "Draft its screen map (no AI); a person accepts it and maps what is left.",
  ABANDONED: "Nothing: start a new capture to record the screens again.",
};
type Upload = { originalname: string; buffer: Buffer };
type Refusal = { id: string | null; label: string; why: string };
type ReaderResult = { ok: boolean; screens?: { title: string; inputs: CaptureInput[] }[]; refused?: Refusal[]; error?: string };
/** A screen as added (before "finish" numbers it): its structure and the checksum of the file it came from. */
type DraftScreen = { title: string; inputs: CaptureInput[]; file: string; sha256: string; way: string };
type KeptFile = { file: string; sha256: string; bytes: number; way: string; screens: number };
type AddResult = { file: string; outcome: "added" | "refused" | "duplicate"; message: string; refused?: Refusal[] };
type Versioned = { id: string; version: number; status: string };
type Library = Awaited<ReturnType<Forms["libraryRows"]>>;
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
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Sources) private readonly sources: Sources) {}

  portals() { return PORTALS; }

  // ───────────────────────────────────────────────────────────── captures (P-66 §1 ways B and C)
  async createCapture(actor: Actor, body: unknown) {
    need(actor, "author");
    const b = parse(NewCapture, body);
    const workspaceId = await this.ws.id();
    // One form, one code (break M4): "IMM-5257" or "IMM  5257" is the library's IMM 5257, never a second form.
    let form = formCode(b.form);
    const known = (await this.db.govFormDef.findMany({ where: { workspaceId }, select: { formKey: true } })).find((d) => compact(d.formKey) === compact(form));
    if (known) form = known.formKey;
    const c = await this.db.portalCapture.create({ data: { workspaceId, portalKey: b.portal, formKey: form, title: b.title, applicationType: b.applicationType ?? null, way: "saved_page", status: "OPEN", statusDetail: "Add the blank screens in portal order: saved pages or the template.", record: { screens: [] }, capturedBy: actor.id } });
    await this.audit.log(workspaceId, actor.id, "started", "portal capture", form, `${actor.name} started capturing ${form} from the ${portalLabel(b.portal)}`);
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
      const hash = sha(f.buffer ?? Buffer.alloc(0));
      let name = basename(f.originalname || "screen").replace(/[^A-Za-z0-9._ -]/g, "_").slice(-100);
      const mode = /\.csv$/i.test(name) ? "template" : "page";
      // A file name can carry a client's details (a name, a number): such a name is not kept (review 13).
      if (/\d{6,}|@/.test(name) || /\b[A-Z]{2,}[ _-][A-Z]{2,}\b/.test(name)) name = `${mode}-${hash.slice(0, 8)}.${mode === "template" ? "csv" : "html"}`;
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
      // Element ids are the inputs' identity (review 5, break M3). The same screen again is a duplicate; another screen
      // reusing an id (an applicant's and a spouse's screen) keeps it qualified by its screen ("familyName@your-spouse").
      const taken = new Set(screens.flatMap((x) => x.inputs.map((i) => i.id)));
      const ids = (x: { inputs: { id: string }[] }) => x.inputs.map((i) => i.id).join("|");
      const again = r.screens.map((s) => screens.findIndex((x) => normLabel(x.title) === normLabel(s.title) && ids(x) === ids(s))).find((n) => n >= 0);
      if (again !== undefined) { results.push({ file: name, outcome: "duplicate", message: `This screen is already screen ${again + 1} of the capture ("${screens[again].title}"); nothing added. To replace it, remove screen ${again + 1} first.` }); continue; }
      const read = r.screens.map((s) => ({ title: s.title, inputs: (s.inputs as CaptureInput[]).map((i) => (taken.has(i.id) ? { ...i, id: `${i.id}@${slug(s.title)}` } : i)) }));
      const clash = read.flatMap((s) => s.inputs.map((i) => i.id)).filter((i) => taken.has(i));
      if (clash.length) { results.push({ file: name, outcome: "refused", message: `Not read: the element id ${clash.slice(0, 3).join(", ")} is already captured on a screen with the same title. Remove that screen first, or check the page.` }); continue; }
      if (screens.length + read.length > CAPTURE_LIMITS.screens) { results.push({ file: name, outcome: "refused", message: `Not added: a capture holds at most ${CAPTURE_LIMITS.screens} screens.` }); continue; }
      for (const s of read) screens.push({ title: s.title, inputs: s.inputs, file: name, sha256: hash, way });
      kept.push({ file: name, sha256: hash, bytes: f.buffer.length, way, screens: r.screens.length });
      results.push({ file: name, outcome: "added", message: `${r.screens.length} screen${r.screens.length > 1 ? "s" : ""} read (${r.screens.reduce((a, s) => a + s.inputs.length, 0)} questions): ${r.screens.map((s) => s.title).join(", ")}.` });
    }
    const added = results.filter((x) => x.outcome === "added").length;
    if (!added) return { capture: this.view(c), results };
    // Claimed on the revision read above: a screen added or a finish at the same moment makes this a 409, never "added"
    // for a screen that is then lost (review 4, break M2).
    const u = await this.write(c, ["OPEN", "RETURNED"], { record: json({ screens }), files: json(kept), way: kept[0]?.way ?? c.way, status: "OPEN", statusDetail: `${screens.length} screen${screens.length === 1 ? "" : "s"} so far. ${NEXT.OPEN}` });
    await this.audit.log(c.workspaceId, actor.id, "captured", "portal screens", c.formKey, `${actor.name} added ${added} file${added > 1 ? "s" : ""} to the ${c.formKey} capture (${screens.length} screens in all; structure only)`);
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
      const u = await this.write(c, ["OPEN"], { record: json(record), contentSha256: fp, status: "IN_LIBRARY", formEditionId: same.id, statusDetail: `Already in the library: the screens are identical to ${same.editionLabel} (same fingerprint). Nothing new to approve. ${NEXT.IN_LIBRARY}` });
      await this.audit.log(c.workspaceId, actor.id, "finished", "portal capture", c.formKey, `${actor.name} finished the ${c.formKey} capture: identical to ${same.editionLabel}, nothing new`);
      return this.view(u);
    }
    const previous = versions[0] ?? null;
    const diff = previous ? difference(this.twinOf(previous.inventoryFile!).record, record) : null;
    const dir = join(VAR("demo"), "portal-twins"); mkdirSync(dir, { recursive: true });
    // Named by the capture, not the fingerprint: two held captures of the same screens keep their own files (break m6).
    const twinPath = join(dir, `${c.formKey.replace(/\W+/g, "")}-${c.portalKey}-${c.id.slice(0, 8)}-${fp.slice(0, 12)}.twin.json`);
    writeFileSync(twinPath, JSON.stringify({ contract: "portal-twin/v1", fingerprint: fp, capture_id: c.id, record }, null, 1));
    const status = "HELD";
    // Every prototype capture comes from the Sample fixtures until a real blank screen exists (challenge point 5).
    const html = reviewHtml({ id: c.id, status, capturedBy: nameOf(c.capturedBy), capturedOn: day(c.capturedOn), fingerprint: fp, record, difference: diff, changes: previous?.editionLabel ?? null, sample: true });
    const htmlPath = twinPath.replace(/\.twin\.json$/, ".review.html"); writeFileSync(htmlPath, html);
    const u = await this.write(c, ["OPEN"], { record: json(record), contentSha256: fp, status, twinFile: rel(twinPath), reviewFile: rel(htmlPath), changesEditionId: previous?.id ?? null, difference: diff ? json(diff) : undefined,
      statusDetail: previous ? `Held for a second person: ${diff!.length} difference${diff!.length === 1 ? "" : "s"} from ${previous.editionLabel} (impact review). Not used until approved.` : "Held for a second person: a new online version. Not used until approved." });
    this.printReview(c.id, htmlPath);
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
    const changed = async (tx: Pick<Db, "portalCapture">) => { const now = await tx.portalCapture.findUnique({ where: { id } }); return conflict(now?.status === "APPROVED" ? "Already approved." : `This capture was ${STATUS_WORDS[now?.status ?? ""] ?? "changed"} at the same moment: it is not approved. Refresh to see it.`); };
    const recheck = new Date(c.capturedOn); recheck.setUTCDate(recheck.getUTCDate() + RECHECK_DAYS);
    try {
      const ed = await this.db.$transaction(async (tx) => {
        const def = await tx.govFormDef.upsert({ where: { workspaceId_formKey: { workspaceId: c.workspaceId, formKey: c.formKey } }, update: {}, create: { workspaceId: c.workspaceId, formKey: c.formKey, displayName: c.title, formKind: "data_form" } });
        const base = `${c.formKey} online · ${portalLabel(c.portalKey)} · ${day(c.capturedOn)}`;
        let label = base; for (let n = 2; await tx.formEdition.findUnique({ where: { workspaceId_editionLabel: { workspaceId: c.workspaceId, editionLabel: label } } }); n++) label = `${base} (${n})`;
        const e = await tx.formEdition.create({ data: { workspaceId: c.workspaceId, govFormDefId: def.id, editionLabel: label, channel: "ONLINE", portalKey: c.portalKey, capturedOn: c.capturedOn, recheckBy: recheck, contentSha256: c.contentSha256, inventoryFile: c.twinFile, dataBoundBoxes: inputs } });
        const claimed = await tx.portalCapture.updateMany({ where: { id, status: "HELD", revision: c.revision }, data: { status: "APPROVED", approvedBy: actor.id, approvedAt: new Date(), formEditionId: e.id, revision: { increment: 1 }, statusDetail: `Approved by ${actor.name}: online version ${label}, re-check by ${day(recheck)}. Next: ${NEXT.APPROVED}` } });
        if (!claimed.count) await changed(tx);
        return e;
      });
      await this.audit.log(c.workspaceId, actor.id, "approved", "portal capture", c.formKey, `${actor.name} approved the ${c.formKey} capture by ${nameOf(c.capturedBy)}: online version ${ed.editionLabel} (${inputs} questions), re-check by ${day(recheck)}`);
      return { capture: this.view(await this.db.portalCapture.findUniqueOrThrow({ where: { id } })), edition: this.editionView(ed) };
    } catch (e) {
      if ((e as { code?: string } | null)?.code !== "P2002") throw e;
      // An identical online version was approved at the same moment (another capture of the same screens): this one
      // is then already in the library, not left held for ever (break m6).
      const same = await this.db.formEdition.findFirst({ where: { workspaceId: c.workspaceId, channel: "ONLINE", portalKey: c.portalKey, contentSha256: c.contentSha256 } });
      if (same) await this.db.portalCapture.updateMany({ where: { id, status: "HELD" }, data: { status: "IN_LIBRARY", formEditionId: same.id, revision: { increment: 1 }, statusDetail: `Already in the library: identical to ${same.editionLabel}, approved at the same moment. ${NEXT.IN_LIBRARY}` } });
      return conflict("Already in the library: an identical online version was approved at the same moment.");
    }
  }

  async returnCapture(actor: Actor, id: string, body: unknown) {
    need(actor, "review");
    const b = parse(ReturnCapture, body);
    const c = await this.db.portalCapture.findUniqueOrThrow({ where: { id } });
    if (c.status !== "HELD") conflict("Only a held capture can be returned.");
    if (c.capturedBy === actor.id) fail("A second person reviews a capture: the person who captured it cannot return it to themselves.", HttpStatus.FORBIDDEN);
    // Claimed like approval (break M1): an approval and a return at the same moment cannot both succeed.
    const u = await this.write(c, ["HELD"], { status: "RETURNED", decisionNote: b.note, statusDetail: `Returned by ${actor.name}: ${b.note}. Next: ${NEXT.RETURNED}` });
    await this.audit.log(c.workspaceId, actor.id, "returned", "portal capture", c.formKey, `${actor.name} returned the ${c.formKey} capture: ${b.note}`);
    return this.view(u);
  }

  /** Removes one screen of an open or returned capture (a wrong or edited screen; review 6, break m3). */
  async removeScreen(actor: Actor, id: string, order: number) {
    need(actor, "author");
    const c = await this.db.portalCapture.findUniqueOrThrow({ where: { id } });
    if (!["OPEN", "RETURNED"].includes(c.status)) conflict(`This capture is ${c.status.toLowerCase()}: only an open or returned capture's screens can be removed.`);
    const screens = screensOf(c.record);
    if (!Number.isInteger(order) || order < 1 || order > screens.length) fail(`There is no screen ${order} in this capture (it has ${screens.length}).`, HttpStatus.NOT_FOUND);
    const [gone] = screens.splice(order - 1, 1);
    const kept = (c.files as unknown as KeptFile[]).filter((k) => screens.some((s) => s.sha256 === k.sha256));
    const u = await this.write(c, ["OPEN", "RETURNED"], { record: json({ screens }), files: json(kept), status: "OPEN", statusDetail: `Screen ${order} ("${gone.title}") removed; ${screens.length} screen${screens.length === 1 ? "" : "s"} left. ${NEXT.OPEN}` });
    await this.audit.log(c.workspaceId, actor.id, "removed", "portal screen", c.formKey, `${actor.name} removed screen ${order} ("${gone.title}") from the ${c.formKey} capture`);
    return this.view(u);
  }

  /** An author gives a capture up (it stays, for the audit); a held one is withdrawn before anyone approves it. */
  async abandon(actor: Actor, id: string, body: unknown) {
    need(actor, "author");
    const b = parse(AbandonCapture, body);
    const c = await this.db.portalCapture.findUniqueOrThrow({ where: { id } });
    if (!["OPEN", "RETURNED", "HELD"].includes(c.status)) conflict(`This capture is ${c.status.toLowerCase()}: only an open, returned or held capture can be abandoned.`);
    const u = await this.write(c, ["OPEN", "RETURNED", "HELD"], { status: "ABANDONED", decisionNote: b.note ?? null, statusDetail: `Abandoned by ${actor.name}${b.note ? `: ${b.note}` : ""}. ${NEXT.ABANDONED}` });
    await this.audit.log(c.workspaceId, actor.id, "abandoned", "portal capture", c.formKey, `${actor.name} abandoned the ${c.formKey} capture${b.note ? `: ${b.note}` : ""}`);
    return this.view(u);
  }

  /** The same screens captured again ("already in the library"): a second person confirms they are unchanged, and the
   *  online version's re-check date runs from this capture (review 3, break M6). */
  async confirmRecheck(actor: Actor, id: string) {
    need(actor, "review");
    const c = await this.db.portalCapture.findUniqueOrThrow({ where: { id } });
    if (c.status !== "IN_LIBRARY" || !c.formEditionId) conflict("Only a capture found already in the library confirms an online version's re-check date.");
    if (c.approvedBy) conflict("Already confirmed.");
    if (c.capturedBy === actor.id) fail("A second person confirms the screens are unchanged: not the person who captured them.", HttpStatus.FORBIDDEN);
    const recheck = new Date(c.capturedOn); recheck.setUTCDate(recheck.getUTCDate() + RECHECK_DAYS);
    const ed = await this.db.$transaction(async (tx) => {
      const claimed = await tx.portalCapture.updateMany({ where: { id, status: "IN_LIBRARY", approvedBy: null, revision: c.revision }, data: { approvedBy: actor.id, approvedAt: new Date(), revision: { increment: 1 }, statusDetail: `Confirmed unchanged by ${actor.name}: the online version's re-check date runs to ${day(recheck)}.` } });
      if (!claimed.count) conflict("Already confirmed, or the capture changed at the same moment: refresh to see it.");
      const e = await tx.formEdition.findUniqueOrThrow({ where: { id: c.formEditionId! } });
      return e.recheckBy && e.recheckBy >= recheck ? e : tx.formEdition.update({ where: { id: e.id }, data: { recheckBy: recheck } });
    });
    await this.audit.log(c.workspaceId, actor.id, "confirmed", "online version", ed.editionLabel, `${actor.name} confirmed ${ed.editionLabel} unchanged (capture by ${nameOf(c.capturedBy)}): re-check by ${day(ed.recheckBy!)}`);
    return { capture: this.view(await this.db.portalCapture.findUniqueOrThrow({ where: { id } })), edition: this.editionView(ed) };
  }

  /** A newest-first page of captures; the field-by-field difference is in each capture's own view (break m16). */
  async captures(take = 50, skip = 0) {
    const workspaceId = await this.ws.id();
    const n = Math.min(Math.max(Number(take) || 50, 1), 200), from = Math.max(Number(skip) || 0, 0);
    return (await this.db.portalCapture.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: n, skip: from })).map((c) => { const v = this.view(c); return { ...v, difference: undefined, differences: Array.isArray(c.difference) ? c.difference.length : 0 }; });
  }
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
      approved_by: c.approvedBy, approved_at: c.approvedAt, decision_note: c.decisionNote, revision: c.revision, next: NEXT[c.status] ?? null, ...(full ? { record: c.record } : {}) };
  }

  /** One write to a capture, claimed on the revision and status it was read with; a write in between is a 409. */
  private async write(c: PortalCapture, statuses: string[], data: Prisma.PortalCaptureUpdateManyMutationInput) {
    const r = await this.db.portalCapture.updateMany({ where: { id: c.id, revision: c.revision, status: { in: statuses } }, data: { ...data, revision: { increment: 1 } } });
    if (!r.count) {
      const now = await this.db.portalCapture.findUnique({ where: { id: c.id } });
      conflict(now && now.status !== c.status ? `This capture was ${STATUS_WORDS[now.status] ?? "changed"} at the same moment: nothing was changed. Refresh to see it.` : "This capture changed at the same moment (a screen was added or removed): nothing was changed. Refresh and try again.");
    }
    return this.db.portalCapture.findUniqueOrThrow({ where: { id: c.id } });
  }

  /** Prints the review document to PDF after the request has answered (STANDARDS §4: never inside a web request);
   *  the HTML stands until the PDF exists. */
  private printReview(id: string, htmlPath: string) {
    const pdfPath = htmlPath.replace(/\.html$/, ".pdf");
    run(NODE, [join(STUDIO, "tools", "print_pdf.mjs"), htmlPath, pdfPath], { cwd: STUDIO, timeout: 180_000 })
      .then(() => this.db.portalCapture.updateMany({ where: { id, reviewFile: rel(htmlPath) }, data: { reviewFile: rel(pdfPath) } }))
      .catch((e: Error) => console.error(`review document of capture ${id} not printed (the HTML stands): ${e.message.slice(0, 300)}`));
  }
  private editionView(e: FormEdition) { return { id: e.id, label: e.editionLabel, channel: e.channel, portal: e.portalKey, captured_on: e.capturedOn ? day(e.capturedOn) : null, recheck_by: e.recheckBy ? day(e.recheckBy) : null, fingerprint: e.contentSha256, questions: e.dataBoundBoxes }; }

  // ───────────────────────────────────────────────────────────── online versions: screen map without AI
  private async libraryRows(workspaceId: string, db: Pick<Db, "canonicalField"> = this.db) {
    const rows = await db.canonicalField.findMany({ where: { workspaceId }, orderBy: { version: "desc" } });
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
        return { workspaceId: ed.workspaceId, formEditionId: ed.id, dataPath: p.input, caption: captionOf(p.group, p.label).slice(0, 500), heading: p.screen, screenKey: `s${String(p.screen_order).padStart(2, "0")}`, screenOrder: p.screen_order, inputOrder: p.input_order,
          // Same element id as an accepted version is high; a label match (PDF twin or alias) is medium (review 8).
          outcome: take ? "mapped" : p.outcome === "not_a_fact" ? "not_a_fact" : "unresolved", person: take ? p.person : null, canonicalFieldKey: take ? p.fact : null, transform: take ? p.transform : null, confidence: take ? (p.method === "same_path" ? "high" : "medium") : null,
          evidenceQuote: take ? (p.from ?? p.why).slice(0, 500) : null, reason: take ? null : p.outcome === "mapped" ? `not accepted by ${actor.name}` : p.why, optionMap: om ? json(om.optionMap) : undefined,
          version: 1, status: "DRAFT" as const, origin: "CODE_MATCH" as const, updatedBy: actor.id };
      });
      await tx.formFieldMap.createMany({ data: rows });
      // Learned aliases: the label a person accepted for a shared field (matching metadata, outside released content),
      // with its group ("Place of birth › Country or territory", never the bare "Country or territory"), and only when no
      // other field already answers to it: one label, one field (review 8, break M7).
      for (const p of draft.proposals.filter((x) => x.method === "pdf_twin" && x.fact && (!pick || pick.has(x.input)))) {
        const label = p.part ? p.group : captionOf(p.group, p.label); const f = lib.get(p.fact!);
        if (!label || !f || f.aliases.some((a) => normLabel(a) === normLabel(label)) || this.namedBy([...lib.values()], label, f.canonicalFieldKey)) continue;
        f.aliases = [...f.aliases, label]; await tx.canonicalField.update({ where: { id: f.id }, data: { aliases: f.aliases } }); learned++;
      }
      return { mapped: rows.filter((r) => r.outcome === "mapped").length, unresolved: rows.filter((r) => r.outcome === "unresolved").length, not_a_fact: rows.filter((r) => r.outcome === "not_a_fact").length, option_maps: rows.filter((r) => r.optionMap).length };
    });
    await this.audit.log(ed.workspaceId, actor.id, "accepted", "screen map", ed.form.formKey, `${actor.name} accepted the screen map of ${ed.editionLabel}: ${res.mapped} mapped, ${res.unresolved} still open, ${res.not_a_fact} not a fact; ${learned} labels learned as aliases; no AI`);
    return { ...res, aliases_learned: learned };
  }

  /** A person maps one input the drafting left open (or corrects one): to a shared field, or as "not a fact" with the
   *  reason. A new draft version of that form field; origin HUMAN (review 2: leftovers had no way through). */
  async resolveInput(actor: Actor, editionId: string, body: unknown) {
    need(actor, "review");
    const b = parse(ResolveInput, body);
    const ed = await this.db.formEdition.findUniqueOrThrow({ where: { id: editionId } });
    if (ed.channel !== "ONLINE") fail("This maps an online version's inputs; a PDF edition's form fields are reviewed on its field map.");
    const rows = await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id, dataPath: b.input } });
    if (!rows.length) fail(`${ed.editionLabel} has no input ${b.input} in its accepted screen map (accept the screen map first).`, HttpStatus.NOT_FOUND);
    const input = this.twinOf(ed.inventoryFile!).record.screens.flatMap((s) => s.inputs).find((i) => i.id === b.input);
    let changes: Record<string, unknown>, said: string;
    if (b.fact) {
      const key = await resolveKey(this.db, ed.workspaceId, b.fact);
      const field = (await this.libraryRows(ed.workspaceId)).find((r) => r.canonicalFieldKey === key);
      if (!field || field.status === "RETIRED") fail(`${b.fact} is not in the library.`, HttpStatus.NOT_FOUND);
      if (input && !compatible(input.type, input.part ?? null, field!.valueType)) fail(`${key} holds a ${field!.valueType}; this input is a ${input.part ? `date part (${input.part})` : input.type}.`);
      const list = field!.answerListKey ? await this.db.answerList.findFirst({ where: { workspaceId: ed.workspaceId, answerListKey: field!.answerListKey }, include: { values: { orderBy: { sortOrder: "asc" } } }, orderBy: { version: "desc" } }) : null;
      const om = list && input?.options?.length ? draftOptionMap(list.values.map((v) => ({ key: v.valueKey, label: v.label })), input.options) : null;
      changes = { outcome: "mapped", canonicalFieldKey: key, person: b.person ?? "form_subject", transform: transformFor(input?.type ?? "text", input?.part ?? null, { answerListKey: field!.answerListKey }), confidence: "high", evidenceQuote: `Chosen by ${actor.name}${key !== b.fact ? ` (${b.fact} was merged into ${key})` : ""}`, reason: null, origin: "HUMAN", optionMap: om ? json(om.optionMap) : Prisma.DbNull };
      said = `${key}${b.person && b.person !== "form_subject" ? ` (${b.person})` : ""}`;
    } else {
      changes = { outcome: "not_a_fact", canonicalFieldKey: null, person: null, transform: null, confidence: null, evidenceQuote: null, reason: `${b.reason} (${actor.name})`, origin: "HUMAN", optionMap: Prisma.DbNull };
      said = `not a fact: ${b.reason}`;
    }
    await revise(this.db.formFieldMap, rows, changes, actor.id, strip);
    await this.audit.log(ed.workspaceId, actor.id, "mapped", "online input", b.input, `${actor.name} mapped ${rows[0].caption ?? b.input} on ${ed.editionLabel}: ${said}`);
    return { input: b.input, outcome: changes.outcome, fact: changes.canonicalFieldKey ?? null };
  }

  // ───────────────────────────────────────────── F1 slice 2: the guarded screen_map job for the inputs left open
  /** The inputs of an online version still open after a person accepted its code-drafted screen map, the approved
   *  screen inventory and the part with only those inputs (both admitted by the guard), and the guarded job file. */
  private async leftoverJob(ed: FormEdition & { form: { formKey: string } }, write: boolean) {
    const rows = effective(await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id } }), (m) => m.dataPath, "draft");
    if (!rows.length) fail("Accept the screen map first (no AI); the AI drafts only what is left open.", HttpStatus.CONFLICT);
    const open = rows.filter((r) => r.outcome === "unresolved");
    if (!open.length) fail(`Nothing is left open on ${ed.editionLabel}: every input is mapped or "not a fact".`, HttpStatus.CONFLICT);
    const cap = await this.db.portalCapture.findFirst({ where: { formEditionId: ed.id, status: "APPROVED" }, orderBy: { approvedAt: "asc" } });
    if (!cap?.approvedBy) fail("This online version has no approved capture; only approved screens are sent to the AI.", HttpStatus.CONFLICT);
    const twin = this.twinOf(ed.inventoryFile!);
    const fp = twin.fingerprint, slugForm = ed.form.formKey.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const screensBody = { contract: "screen-inventory/v1", fingerprint: fp, record: twin.record, approval: { capture_id: cap!.id, captured_by: cap!.capturedBy, approved_by: cap!.approvedBy, approved_at: cap!.approvedAt!.toISOString(), edition: ed.editionLabel } };
    const screensFile = `${slugForm}-${ed.portalKey}-${fp.slice(0, 12)}.screens.json`, screensBytes = JSON.stringify(screensBody, null, 1) + "\n";
    const ids = new Set(open.map((r) => r.dataPath));
    const inputs = twin.record.screens.flatMap((s) => s.inputs.filter((i) => ids.has(i.id)).map((input) => ({ screen: s.key, title: s.title, input })));
    const partBody = { contract: "inventory-part/v1", parent: { file: `prototype/p2/screen-inventories/${screensFile}`, sha256: sha(screensBytes) }, part: { index: 1, count: 1, section: "inputs left open" }, inputs };
    const partBytes = JSON.stringify(partBody, null, 1) + "\n";
    const partFile = `${slugForm}-${ed.portalKey}-${fp.slice(0, 12)}.open-${sha(canonicalIds(inputs)).slice(0, 12)}.part.json`;
    const jobId = `studio-screenmap-${slugForm}-${ed.portalKey!.replace(/_/g, "-")}-${fp.slice(0, 12)}`;
    const settings = { provider_route: "anthropic-api/aiw-d261-prototype-exception-aiw-d260", model: "claude-opus-5-5", effort: "high", timeout_ms: 600_000, max_attempts: 2, budget_usd: 5, max_output_tokens: partOutputTokens(inputs.length) };
    const job = { job_id: jobId, kind: "screen_map", combination: "studio", configuration_version: "studio-screen-map", template: "screen-map.v1.md", output_schema: "screen-map-output.v1.schema.json", inputs: [{ file: `prototype/p2/parts/${partFile}`, sha256: sha(partBytes) }], settings };
    if (write) {
      mkdirSync(SCREEN_INVENTORIES, { recursive: true }); mkdirSync(PARTS_DIR, { recursive: true });
      writeFileSync(join(SCREEN_INVENTORIES, screensFile), screensBytes); writeFileSync(join(PARTS_DIR, partFile), partBytes);
      writeFileSync(join(PROTOTYPE, "p2", "jobs", `${jobId}.json`), JSON.stringify(job, null, 1) + "\n");
    }
    const worst = Math.round(Math.min(RUN_CAP_USD, costUsd(settings.model, partBytes.length + 8_000, settings.max_output_tokens) * settings.max_attempts) * 100) / 100;
    const leftovers = inputs.map((x) => ({ input: x.input.id, type: x.input.type, part: x.input.part ?? null, label: captionOf(x.input.group, x.input.label) }));
    return { jobId, leftovers, worst };
  }

  /** Starts the guarded screen_map job for the inputs left open (STUB: the path at US$0; LIVE: a paid call, confirmed at
   *  its worst case). Runs after the request answers; the job's progress is read at GET /api/jobs/:id. */
  async draftLeftovers(actor: Actor, editionId: string, body: unknown) {
    need(actor, "author");
    const b = parse(DraftLeftovers, body);
    const ed = await this.db.formEdition.findUniqueOrThrow({ where: { id: editionId }, include: { form: true } });
    if (ed.channel !== "ONLINE") fail("The screen_map job drafts an online version's inputs; a PDF edition's form fields are drafted from its file.");
    const comb = await this.db.combination.findUniqueOrThrow({ where: { id: b.combinationId } });
    if (comb.workspaceId !== ed.workspaceId || !(await this.db.combinationForm.findFirst({ where: { combinationId: comb.id, lineageKey: ed.form.formKey } }))) fail(`${comb.label} does not file ${ed.form.formKey}.`, HttpStatus.NOT_FOUND);
    const first = await this.leftoverJob(ed, false);
    if (b.mode === "LIVE" && b.confirmWorstUsd !== first.worst) conflict(`A live screen-map draft costs at most US$${first.worst.toFixed(2)} (${first.leftovers.length} inputs, up to 2 attempts): send that amount as confirmWorstUsd to go ahead.`);
    let plan = first;
    // One draft per online version at a time, decided under a lock on the version: two starts at the same moment make
    // one job, never two (break/review: both answered 201 and, live, would have paid twice).
    const j = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`screen_map:${ed.id}`}))`;
      const active = await tx.draftingJob.findFirst({ where: { workspaceId: ed.workspaceId, kind: "screen_map", status: { in: ["QUEUED", "RUNNING"] }, detail: { path: ["edition_id"], equals: ed.id } } });
      if (active) conflict("A screen-map draft of this online version is already running.");
      // The job files are written here, under the lock, and the worst case confirmed is the one of exactly these files
      // (review 11: it was checked against a plan made before the files were rewritten).
      plan = await this.leftoverJob(ed, true);
      if (b.mode === "LIVE" && b.confirmWorstUsd !== plan.worst) conflict(`The open inputs changed: a live screen-map draft now costs at most US$${plan.worst.toFixed(2)}; confirm that amount.`);
      const { jobId, leftovers } = plan;
      return tx.draftingJob.create({ data: { workspaceId: ed.workspaceId, combinationId: comb.id, kind: "screen_map", mode: b.mode, status: "RUNNING", message: `${b.mode === "LIVE" ? "Stub pass, then the AI call" : "Stub pass of the guarded path (no network, no cost)"} for ${leftovers.length} open input${leftovers.length === 1 ? "" : "s"} of ${ed.editionLabel}`, startedBy: actor.id, detail: json({ edition_id: ed.id, job_id: jobId, inputs: leftovers.length, worst_usd: b.mode === "LIVE" ? plan.worst : 0 }) } });
    });
    const { jobId, leftovers } = plan;
    await this.audit.log(ed.workspaceId, actor.id, "started", "screen-map draft", ed.editionLabel, `${actor.name} started the ${b.mode === "LIVE" ? `live (worst case US$${plan.worst.toFixed(2)})` : "stub (US$0)"} screen-map draft of ${leftovers.length} open inputs of ${ed.editionLabel}`, undefined, comb.id);
    void this.runLeftovers(j.id, ed, jobId, leftovers, b.mode === "LIVE" ? "live" : "stub");
    return this.sources.job(j.id);
  }

  private async runLeftovers(id: string, ed: FormEdition, jobId: string, leftovers: { input: string; type: string; part: string | null; label: string }[], mode: "stub" | "live") {
    const lastJson = (s: string) => { for (const l of s.trim().split("\n").reverse()) { try { return JSON.parse(l); } catch { /* not JSON */ } } return null; };
    const done = (data: Prisma.DraftingJobUpdateInput) => this.db.draftingJob.update({ where: { id }, data: { finishedAt: new Date(), ...data } });
    try {
      const stub = await this.sources.launchOnce(jobId, "stub"), sj = lastJson(stub.out);
      if (stub.code !== 0) { await done({ status: "FAILED", message: `Stub pass failed: ${this.sources.plainRefusal(String(sj?.refused ?? stub.err).slice(-400))}. Nothing was drafted.` }); return; }
      if (mode === "stub") { await done({ status: "COMPLETED", costUsd: 0, message: `Stub pass completed: the guarded path admitted the approved screens and the ${leftovers.length} open inputs. A stub has no AI content, so there is nothing to accept.` }); return; }
      const live = await this.sources.launchOnce(jobId, "live"), lj = lastJson(live.out);
      if (!lj?.run_file) { await done({ status: "FAILED", message: `The AI step did not run: ${String(lj?.refused ?? lj?.error ?? live.err.split("\n").filter(Boolean).slice(-2).join(" ")).slice(0, 400)}. Nothing was drafted.` }); return; }
      const rec = JSON.parse(readFileSync(lj.run_file, "utf8"));
      const library = (await this.libraryRows(ed.workspaceId)).filter((r) => r.status !== "RETIRED" || r.mergedIntoKey).map((r) => ({ key: r.canonicalFieldKey, valueType: r.valueType, aliases: r.aliases, mergedIntoKey: r.mergedIntoKey, answerListKey: r.answerListKey }));
      const r = readScreenRun(rec, leftovers, library, factKeyProblem);
      if (!r.ok) { await done({ status: "FAILED", costUsd: r.cost, runId: rec.drafting_run?.run_id, message: r.message }); return; }
      const { ok: _ok, cost, message, ...out } = r;
      await done({ status: "COMPLETED", costUsd: cost, runId: rec.drafting_run?.run_id, runFile: String(lj.run_file).replace(`${SOLUTION}/`, ""), detail: json({ edition_id: ed.id, job_id: jobId, inputs: leftovers.length, ...out }), message });
    } catch (e) {
      await done({ status: "FAILED", message: (e as Error).message.slice(0, 400) });
    }
  }

  /** A person accepts the AI's proposals for open inputs (all, or the listed ones): each becomes a new draft version of
   *  that input's row, origin AI_PROPOSAL, with the run and the person who accepted it. An input a person mapped in the
   *  meantime is left as it is. */
  async acceptAiProposals(actor: Actor, editionId: string, body: unknown) {
    need(actor, "review");
    const b = parse(AcceptAiProposals, body);
    const j = await this.db.draftingJob.findUniqueOrThrow({ where: { id: b.jobId } });
    const d = (j.detail ?? {}) as { edition_id?: string; proposals?: AiProposal[] };
    if (j.kind !== "screen_map" || d.edition_id !== editionId) fail("That job is not a screen-map draft of this online version.", HttpStatus.NOT_FOUND);
    if (j.status !== "COMPLETED" || !d.proposals) conflict(j.status === "APPLIED" ? "Already accepted." : "This draft has no proposals to accept (a stub pass, or it did not finish).");
    const ed = await this.db.formEdition.findUniqueOrThrow({ where: { id: editionId } });
    const pick = b.inputs ? new Set(b.inputs) : null;
    const lib = new Map((await this.libraryRows(ed.workspaceId)).map((r) => [r.canonicalFieldKey, r]));
    const inputOf = new Map(this.twinOf(ed.inventoryFile!).record.screens.flatMap((s) => s.inputs.map((i) => [i.id, i] as const)));
    let accepted = 0; const kept: string[] = [];
    await this.db.$transaction(async (tx) => {
      // Accepted under a lock on the job: a part of the proposals may be accepted now and the rest later (break m13);
      // each proposal is applied once.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`screen_map_accept:${j.id}`}))`;
      const now = await tx.draftingJob.findUniqueOrThrow({ where: { id: j.id } });
      const done = new Set(((now.detail ?? {}) as { accepted_inputs?: string[] }).accepted_inputs ?? []);
      if (now.status !== "COMPLETED") conflict("Already accepted.");
      const take = d.proposals!.filter((x) => x.outcome !== "unresolved" && !done.has(x.input) && (!pick || pick.has(x.input)));
      if (!take.length) conflict(pick ? "Those proposals are already accepted, or there is none for those inputs." : "Already accepted.");
      for (const p of take) done.add(p.input);
      const rest = d.proposals!.filter((x) => x.outcome !== "unresolved" && !done.has(x.input)).length;
      await tx.draftingJob.update({ where: { id: j.id }, data: { status: rest ? "COMPLETED" : "APPLIED", detail: json({ ...(now.detail as object), accepted_inputs: [...done] }), message: rest ? now.message : `${now.message} Accepted by ${actor.name}.` } });
      for (const p of take) {
        const rows = await tx.formFieldMap.findMany({ where: { formEditionId: ed.id, dataPath: p.input } });
        const now = [...rows].sort((x, y) => y.version - x.version)[0];
        if (!now || now.outcome !== "unresolved") { kept.push(p.input); continue; }
        const field = p.fact ? lib.get(p.fact) : undefined;
        const input = inputOf.get(p.input);
        // Checked again now: the field may have been retired, merged or changed type since the draft (break m8).
        if (p.outcome === "mapped" && (!field || field.status === "RETIRED" || field.mergedIntoKey || !input || !compatible(input.type, input.part ?? null, field.valueType))) { kept.push(p.input); continue; }
        const list = field?.answerListKey ? await tx.answerList.findFirst({ where: { workspaceId: ed.workspaceId, answerListKey: field.answerListKey }, include: { values: { orderBy: { sortOrder: "asc" } } }, orderBy: { version: "desc" } }) : null;
        const om = list && input?.options?.length ? draftOptionMap(list.values.map((v) => ({ key: v.valueKey, label: v.label })), input.options) : null;
        await revise(tx.formFieldMap, rows, p.outcome === "mapped"
          ? { outcome: "mapped", canonicalFieldKey: p.fact, person: p.person, transform: p.transform, confidence: p.ai_confidence, evidenceQuote: `${p.why} · run ${j.runId}, accepted by ${actor.name}`.slice(0, 500), reason: null, origin: "AI_PROPOSAL", draftingRunId: j.runId, optionMap: om ? json(om.optionMap) : Prisma.DbNull }
          : { outcome: "not_a_fact", canonicalFieldKey: null, person: null, transform: null, confidence: null, evidenceQuote: null, reason: `${p.why} · run ${j.runId}, accepted by ${actor.name}`.slice(0, 500), origin: "AI_PROPOSAL", draftingRunId: j.runId, optionMap: Prisma.DbNull }, actor.id, strip);
        accepted++;
      }
    });
    await this.audit.log(ed.workspaceId, actor.id, "accepted", "AI screen map", ed.editionLabel, `${actor.name} accepted ${accepted} AI proposal${accepted === 1 ? "" : "s"} for open inputs of ${ed.editionLabel} (run ${j.runId})${kept.length ? `; ${kept.length} left as they were (changed meanwhile)` : ""}`, undefined, j.combinationId);
    return { accepted, left_as_they_were: kept };
  }

  /** The library field (other than `except`) that already answers to this label: an alias or its own name. */
  private namedBy(rows: Library, label: string, except: string) {
    const k = normLabel(label);
    return rows.find((r) => r.canonicalFieldKey !== except && !r.mergedIntoKey && r.status !== "RETIRED" && (r.aliases.some((a) => normLabel(a) === k) || normLabel(r.canonicalFieldKey.split(".").slice(1).join(" ").replace(/_/g, " ")) === k));
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
    const k = normLabel(b.alias);
    if (!/[\p{L}\p{N}]/u.test(k)) fail("An alias needs letters or digits.");
    // Read and written under a row lock: aliases added at the same moment are all kept (break m8).
    const u = await this.db.$transaction(async (tx) => {
      const rows = await this.libraryRows(workspaceId, tx);
      const f = rows.find((r) => r.canonicalFieldKey === key);
      if (f?.mergedIntoKey) conflict(`${key} was merged into ${f.mergedIntoKey}: add the label there.`);
      if (!f || f.status === "RETIRED") fail(`${key} is not in the library.`, HttpStatus.NOT_FOUND);
      await tx.$queryRaw`SELECT id FROM canonical_field WHERE id = ${f!.id}::uuid FOR UPDATE`;
      const other = this.namedBy(await this.libraryRows(workspaceId, tx), b.alias, key);
      if (other) conflict(`"${b.alias}" already names ${other.canonicalFieldKey}: one label points to one shared field (a reviewed merge joins two fields).`);
      const now = await tx.canonicalField.findUniqueOrThrow({ where: { id: f!.id } });
      if (now.aliases.some((a) => normLabel(a) === k)) return null;
      return tx.canonicalField.update({ where: { id: f!.id }, data: { aliases: [...now.aliases, b.alias] } });
    });
    if (!u) return { key, aliases: (await this.libraryRows(workspaceId)).find((r) => r.canonicalFieldKey === key)!.aliases };
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
    const labels = b.values.map((v) => normLabel(v.label)); if (new Set(labels).size !== labels.length) fail("Each value's label appears once (\"Female\" and \"female\" are the same label).");
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
    if (newest.mergedIntoKey) conflict(`${key} was merged into ${newest.mergedIntoKey}: give the list to that field.`);
    // A free-text field stays free text (break m10): only a choice field takes an answer list.
    if (!["code", "country", "yes_no"].includes(newest.valueType)) fail(`${key} holds ${newest.valueType === "text" ? "free text" : `a ${newest.valueType}`}; only a choice field (a code, a country or yes/no) takes an answer list.`);
    await revise(this.db.canonicalField, rows, { answerListKey: b.list, dataType: "ENUM" }, actor.id, strip);
    await this.audit.log(workspaceId, actor.id, "changed", "field", key, `${actor.name} gave ${key} the answer list ${b.list}`);
    return { key, answer_list: b.list };
  }

  /** Takes a field off its answer list (a list linked by mistake must not block release for good; review 1). The
   *  form fields fill as before, from their own code lists; their option maps stay for a later link. */
  async unlinkAnswerList(actor: Actor, key: string) {
    need(actor, "author");
    const workspaceId = await this.ws.id();
    const rows = await this.db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: key } });
    const newest = [...rows].sort((x, y) => y.version - x.version)[0];
    if (!newest || newest.status === "RETIRED") fail(`${key} is not in the library.`, HttpStatus.NOT_FOUND);
    if (!newest.answerListKey) return { key, answer_list: null };
    await revise(this.db.canonicalField, rows, { answerListKey: null }, actor.id, strip);
    await this.audit.log(workspaceId, actor.id, "changed", "field", key, `${actor.name} took ${key} off the answer list ${newest.answerListKey}`);
    return { key, answer_list: null };
  }

  /** Drafts the option maps of one edition (PDF or online) for every mapped form field whose shared field has an
   *  answer list, without AI. A published row gets a new draft version; released content is untouched. */
  async draftOptionMaps(actor: Actor, editionId: string) {
    need(actor, "author");
    const ed = await this.db.formEdition.findUniqueOrThrow({ where: { id: editionId } });
    const lib = new Map((await this.libraryRows(ed.workspaceId)).map((r) => [r.canonicalFieldKey, r]));
    const lists = new Map((await this.db.answerList.findMany({ where: { workspaceId: ed.workspaceId }, include: { values: { orderBy: { sortOrder: "asc" } } }, orderBy: { version: "desc" } })).map((l) => [l.answerListKey, l]));
    const all = await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id } });
    const optionsOf = this.formOptions(ed, effective(all, (x) => x.dataPath, "draft"));
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
  async setOptionMap(actor: Actor, editionId: string, body: unknown) {
    need(actor, "author");
    const b = parse(SetOptionMap, body), dataPath = b.dataPath;
    const ed = await this.db.formEdition.findUniqueOrThrow({ where: { id: editionId } });
    const rows = await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id, dataPath } });
    const m = effective(rows, (x) => x.dataPath, "draft")[0];
    if (!m || m.outcome !== "mapped" || !m.canonicalFieldKey) fail("That form field is not mapped to a shared field.", HttpStatus.NOT_FOUND);
    const field = (await this.libraryRows(ed.workspaceId)).find((r) => r.canonicalFieldKey === m!.canonicalFieldKey);
    const list = field?.answerListKey ? await this.db.answerList.findFirst({ where: { workspaceId: ed.workspaceId, answerListKey: field.answerListKey }, include: { values: true }, orderBy: { version: "desc" } }) : null;
    if (!list) fail(`${m!.canonicalFieldKey} has no answer list.`, HttpStatus.CONFLICT);
    const codes = (this.formOptions(ed, [m!]).get(dataPath) ?? []).map((o) => o.code);
    const values = new Set(list!.values.map((v) => v.valueKey));
    const bad = [...Object.keys(b.map).filter((k) => !values.has(k)).map((k) => `"${k}" is not on the answer list ${list!.answerListKey}`), ...[...Object.values(b.map), ...b.unused].filter((c) => !codes.includes(c)).map((c) => `"${c}" is not one of this form field's codes`)];
    if (new Set(Object.values(b.map)).size !== Object.values(b.map).length) bad.push("two values share one code");
    if (bad.length) fail(`${bad.join("; ")}.`);
    await revise(this.db.formFieldMap, rows, { optionMap: json({ map: b.map, unused: b.unused, codes }) }, actor.id, strip);
    await this.audit.log(ed.workspaceId, actor.id, "changed", "option map", dataPath, `${actor.name} set the option map of ${m!.caption ?? dataPath} on ${ed.editionLabel} (${Object.keys(b.map).length} values)`);
    return { form_field: dataPath, option_map: { map: b.map, unused: b.unused, codes } };
  }

  /** A form field's own choices: the online twin's (code, label); a PDF field's from its inventory (resolved options),
   *  else from its field map's code list ("code_list:… (Married=5, …)"), as the filler reads them (review 1). */
  private formOptions(ed: { channel: string; inventoryFile: string | null }, maps: { dataPath: string; transform: string | null }[]) {
    const out = new Map<string, FormOption[]>();
    if (!ed.inventoryFile) return out;
    const inv = JSON.parse(readFileSync(join(SOLUTION, ed.inventoryFile), "utf8")) as { record?: CaptureRecord; fields?: { data_path?: string; options_resolved?: [string, string][] | null; options?: unknown }[] };
    if (ed.channel === "ONLINE") { for (const s of inv.record?.screens ?? []) for (const i of s.inputs) if (i.options?.length) out.set(i.id, i.options); return out; }
    const box = new Map((inv.fields ?? []).filter((f) => f.data_path).map((f) => [f.data_path!, f]));
    for (const m of maps) { const o = pdfOptions(box.get(m.dataPath) ?? {}, m.transform); if (o.length) out.set(m.dataPath, o); }
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
    // One pending merge per field (break M5): a chain or a cycle of merges waits until the first is decided.
    const pending = await this.db.fieldMerge.findFirst({ where: { workspaceId, status: "PROPOSED", OR: [{ keepKey: { in: [b.keep, b.merge] } }, { mergeKey: { in: [b.keep, b.merge] } }] } });
    if (pending) conflict(pending.keepKey === b.keep && pending.mergeKey === b.merge ? "This merge is already waiting for a second person." : `${[b.keep, b.merge].find((k) => k === pending.keepKey || k === pending.mergeKey)} is already in a merge waiting for a second person (${pending.mergeKey} into ${pending.keepKey}): decide that one first.`);
    let m;
    try { m = await this.db.fieldMerge.create({ data: { workspaceId, keepKey: b.keep, mergeKey: b.merge, reason: b.reason, status: "PROPOSED", proposedBy: actor.id } }); }
    catch (e) { if ((e as { code?: string }).code === "P2002") conflict(`${b.merge} is already in a merge waiting for a second person (proposed at the same moment).`); throw e; }
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
      // Checked again now (review 7, break M5): both fields still active, or the merge is refused and nothing moves.
      for (const [k, f] of [[to, keep], [from, gone]] as const) if (!f || f.status === "RETIRED" || f.mergedIntoKey) conflict(`${k} was ${f?.mergedIntoKey ? `merged into ${f.mergedIntoKey}` : "retired"} after this merge was proposed: nothing was changed; reject this merge.`);
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
const canonicalIds = (inputs: { input: { id: string } }[]) => inputs.map((x) => x.input.id).join("|");
// dotfiles "allow": lane copies live under .claude/worktrees/, and a hidden folder in the path made the download a 404.
const send = async (res: Response, file: { path: string; name: string }) => { if (!existsSync(file.path)) throw new HttpException("Not found", HttpStatus.NOT_FOUND); res.download(file.path, file.name, { dotfiles: "allow" }); };

@Controller("api")
export class FormsController {
  constructor(@Inject(Forms) private readonly f: Forms) {}
  @Get("portals") portals() { return this.f.portals(); }
  @Get("captures") captures(@Query("take") take?: string, @Query("skip") skip?: string) { return this.f.captures(Number(take ?? 50), Number(skip ?? 0)); }
  @Post("captures") create(@Headers("x-actor") a: H, @Body() b: unknown) { return this.f.createCapture(actorOf(a), b); }
  @Get("captures/:id") capture(@Param("id") id: string) { return this.f.capture(id); }
  @Post("captures/:id/screens") @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: CAPTURE_LIMITS.fileMb * 1024 * 1024, files: CAPTURE_LIMITS.files } }))
  screens(@Headers("x-actor") a: H, @Param("id") id: string, @UploadedFiles() files: Upload[]) { return this.f.addScreens(actorOf(a), id, files); }
  @Delete("captures/:id/screens/:order") removeScreen(@Headers("x-actor") a: H, @Param("id") id: string, @Param("order") o: string) { return this.f.removeScreen(actorOf(a), id, Number(o)); }
  @Post("captures/:id/abandon") abandon(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.abandon(actorOf(a), id, b); }
  @Post("captures/:id/confirm") confirm(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.confirmRecheck(actorOf(a), id); }
  @Post("captures/:id/finish") finish(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.finish(actorOf(a), id); }
  @Post("captures/:id/approve") approve(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.approve(actorOf(a), id); }
  @Post("captures/:id/return") ret(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.returnCapture(actorOf(a), id, b); }
  @Get("captures/:id/review") async review(@Param("id") id: string, @Res() res: Response) { await send(res, await this.f.reviewDocument(id)); }
  @Get("library/forms/:code/editions") editions(@Param("code") code: string) { return this.f.editions(code); }
  @Post("online-versions/:id/screen-map/draft") draft(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.draftScreenMapFor(actorOf(a), id); }
  @Patch("online-versions/:id/screen-map") resolve(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.resolveInput(actorOf(a), id, b); }
  @Post("online-versions/:id/screen-map/ai") draftAi(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.draftLeftovers(actorOf(a), id, b); }
  @Post("online-versions/:id/screen-map/ai/accept") acceptAi(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.acceptAiProposals(actorOf(a), id, b); }
  @Post("online-versions/:id/screen-map/accept") accept(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.acceptScreenMap(actorOf(a), id, b); }
  @Post("editions/:id/option-maps/draft") optionMaps(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.draftOptionMaps(actorOf(a), id); }
  @Patch("editions/:id/option-maps") setOptionMap(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.setOptionMap(actorOf(a), id, b); }
  @Get("combinations/:id/channels") channels(@Param("id") id: string) { return this.f.channels(id); }
  @Patch("combinations/:id/portal") portal(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.setPortal(actorOf(a), id, b); }
  @Patch("combinations/:id/forms/:line/channel") channel(@Headers("x-actor") a: H, @Param("id") id: string, @Param("line") l: string, @Body() b: unknown) { return this.f.setChannel(actorOf(a), id, l, b); }
  @Post("library/fields/:key/aliases") alias(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.f.addAlias(actorOf(a), k, b); }
  @Post("library/fields/:key/answer-list") link(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.f.linkAnswerList(actorOf(a), k, b); }
  @Delete("library/fields/:key/answer-list") unlink(@Headers("x-actor") a: H, @Param("key") k: string) { return this.f.unlinkAnswerList(actorOf(a), k); }
  @Get("library/answer-lists") lists() { return this.f.answerLists(); }
  @Post("library/answer-lists") addList(@Headers("x-actor") a: H, @Body() b: unknown) { return this.f.createAnswerList(actorOf(a), b); }
  @Get("library/merges") merges() { return this.f.merges(); }
  @Post("library/merges") propose(@Headers("x-actor") a: H, @Body() b: unknown) { return this.f.proposeMerge(actorOf(a), b); }
  @Post("library/merges/:id/approve") approveMerge(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.approveMerge(actorOf(a), id, b); }
  @Post("library/merges/:id/reject") rejectMerge(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.rejectMerge(actorOf(a), id, b); }
}
