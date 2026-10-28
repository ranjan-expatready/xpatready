// Screen 02 slice 2 endpoints in the screens lane's own file (challenge point 1): a decision on one PDF form field (K1),
// library changes approved by a second person (LibraryChange), the held-file decision (P-80) and the new-edition impact
// review (P-32, C9.1). Merges keep their F1 endpoints (forms.ts); Screen 02 adds their pages.
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Patch, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { problemFromZod } from "../../contracts/programs.ts";
import { effective } from "../../engine/snapshot.ts";
import { ACTORS, actorOf, Audit, Db, fail, need, OpenRead, revise, strip, Workspace, type Actor } from "./core.ts";
import { actionVerb, changeView, decideChange, resubmitChange, withdrawChange } from "./library-changes.ts";
import { Intake } from "./intake.ts";
import { isLifecycleKind, Lifecycle } from "./lifecycle.ts";
import { Impact } from "./impact.ts";
import { Programs } from "./programs.ts";

type H = string | undefined;
/** A request body read loosely: an object, or nothing. Each service checks its own fields. */
const obj = (b: unknown): Record<string, unknown> => (b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : {});
const noteOf = (b: unknown) => { const n = obj(b).note; return typeof n === "string" ? n : undefined; };
/** K1: a PDF form field is mapped, "not a fact", or "filled by hand" with a reason. */
export const FormFieldDecision = z.object({
  dataPath: z.string().min(1).max(300),
  decision: z.enum(["not_a_fact", "by_hand"]),
  // Invisible characters do not count towards the 8 (break m3: eight zero-width spaces passed).
  reason: z.string().transform((x) => x.normalize("NFKC").replace(/[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu, "").trim()).pipe(z.string().min(8, "Say why in a sentence (at least 8 characters).").max(300)),
}).strict();
function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) fail(problemFromZod(r.error).detail ?? "The request is not valid.");
  return r.data as z.infer<S>;
}

@Injectable()
export class Screen02 {
  constructor(@Inject(Db) readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Lifecycle) private readonly lifecycle: Lifecycle) {}

  /** K1: decides one PDF form field that no shared field fills. A new draft version of that form field (origin HUMAN);
   *  an undecided form field of an edition changed in this draft blocks release until it is decided. */
  async decideFormField(actor: Actor, editionId: string, body: unknown) {
    need(actor, "review");
    const b = parse(FormFieldDecision, body);
    const ed = await this.db.formEdition.findUnique({ where: { id: editionId }, include: { form: true } }).catch(() => null);
    if (!ed) fail("This form edition does not exist.", HttpStatus.NOT_FOUND);
    if (ed!.channel !== "PDF") fail("This decides a PDF edition's form fields.");
    const rows = await this.db.formFieldMap.findMany({ where: { formEditionId: ed!.id, dataPath: b.dataPath } });
    const cur = effective(rows, (m) => m.dataPath, "draft")[0];
    if (!cur) fail(`${ed!.editionLabel} has no form field ${b.dataPath}.`, HttpStatus.NOT_FOUND);
    if (cur!.outcome === "mapped") fail(`${cur!.caption ?? b.dataPath} is mapped to a shared field; change the mapping on its field map instead.`, HttpStatus.CONFLICT);
    const changes = { outcome: b.decision, canonicalFieldKey: null, person: null, transform: null, confidence: null, reason: `${b.reason} (${actor.name})`, origin: "HUMAN" as const, optionMap: Prisma.DbNull };
    await revise(this.db.formFieldMap, rows, changes, actor.id, strip);
    const said = b.decision === "by_hand" ? "filled by hand" : "not a fact";
    await this.audit.log(ed!.workspaceId, actor.id, "decided", "form field", b.dataPath, `${actor.name} decided ${cur!.caption ?? b.dataPath} on ${ed!.editionLabel}: ${said} (${b.reason})`);
    return { dataPath: b.dataPath, outcome: b.decision, reason: b.reason };
  }

  /** The undecided and decided form fields of a PDF edition (K1), for the review page beside the source. */
  async formFields(editionId: string) {
    const ed = await this.db.formEdition.findUnique({ where: { id: editionId }, include: { form: true } }).catch(() => null);
    if (!ed || ed.channel === "ONLINE") fail("This form edition does not exist.", HttpStatus.NOT_FOUND); // W1-02 (break m3): online versions are parked
    const rows = effective(await this.db.formFieldMap.findMany({ where: { formEditionId: ed!.id } }), (m) => m.dataPath, "draft");
    const word: Record<string, string> = { mapped: "Mapped", not_a_fact: "Not a fact", never_filled: "Not a fact", by_hand: "Filled by hand", unresolved: "No decision" };
    return { edition: { id: ed!.id, label: ed!.editionLabel, form: ed!.form.formKey }, fields: rows.map((r) => ({ dataPath: r.dataPath, caption: r.caption, heading: r.heading, outcome: r.outcome, outcome_word: word[r.outcome] ?? r.outcome, field: r.canonicalFieldKey, reason: r.reason, status: r.status, carried: r.outcome === "unresolved" && r.status === "PUBLISHED" })) };
  }

  /** Board view 8: one proposed merge with both fields by name, meaning and use. */
  async merge(id: string) {
    const m = await this.db.fieldMerge.findUnique({ where: { id } }).catch(() => null);
    if (!m) fail("This merge does not exist.", HttpStatus.NOT_FOUND);
    const one = async (key: string) => {
      const f = await this.db.canonicalField.findFirst({ where: { workspaceId: m!.workspaceId, canonicalFieldKey: key }, orderBy: { version: "desc" } });
      const maps = await this.db.formFieldMap.count({ where: { workspaceId: m!.workspaceId, canonicalFieldKey: key, status: { in: ["DRAFT", "PUBLISHED"] } } });
      const placements = await this.db.sectionQuestion.count({ where: { workspaceId: m!.workspaceId, canonicalFieldKey: key, status: { in: ["DRAFT", "PUBLISHED"] } } });
      return { key, label: f?.label ?? key, meaning: f?.meaning ?? null, value_type: f?.valueType ?? null, aliases: f?.aliases ?? [], form_fields: maps, questions: placements };
    };
    const who = (id?: string | null) => (id ? ACTORS.find((a) => a.id === id)?.name ?? "A person" : null);
    return { id: m!.id, status: m!.status, reason: m!.reason, proposed_by: who(m!.proposedBy), proposed_by_id: m!.proposedBy, proposed_at: m!.proposedAt, decided_by: who(m!.decidedBy), decision_note: m!.decisionNote, goes: await one(m!.mergeKey), stays: await one(m!.keepKey) };
  }

  /** The form fields of the edition an AI draft was applied to (K1 decisions beside the proposals). */
  async jobFormFields(jobId: string) {
    const job = await this.db.draftingJob.findUnique({ where: { id: jobId } }).catch(() => null);
    if (!job?.attachmentId) fail("This AI draft has no source form.", HttpStatus.NOT_FOUND);
    const a = await this.db.sourceAttachment.findUnique({ where: { id: job!.attachmentId! } });
    const ed = a ? await this.db.formEdition.findFirst({ where: { workspaceId: a.workspaceId, sha256: a.sha256 } }) : null;
    if (!ed) return { edition: null, fields: [] };
    return this.formFields(ed.id);
  }

  async libraryChanges(status?: string) {
    const workspaceId = await this.ws.id();
    return (await this.db.libraryChange.findMany({ where: { workspaceId, ...(status ? { status } : {}) }, orderBy: { proposedAt: "desc" }, take: 200 })).map(changeView);
  }
  async libraryChange(id: string) {
    const c = await this.db.libraryChange.findUnique({ where: { id } }).catch(() => null);
    if (!c) fail("This library change does not exist (the demo may have been reset).", HttpStatus.NOT_FOUND);
    const field = c!.kind === "field" ? await this.db.canonicalField.findFirst({ where: { workspaceId: c!.workspaceId, canonicalFieldKey: c!.key }, orderBy: { version: "desc" } }) : null;
    // P-128 (Lead, 28 Oct): what the approver approves with a structure name: the names a branch delete takes with it, or
    // the combination a combination row's retire or restore takes with it.
    const listed = c!.kind === "structure_node" && Array.isArray(c!.matches) ? (c!.matches as string[]) : [];
    const names = listed.filter((k) => k !== c!.key && !k.startsWith("combination:"));
    const goesWith = names.length ? (await this.db.programDef.findMany({ where: { workspaceId: c!.workspaceId, programNodeKey: { in: names } }, select: { programNodeKey: true, label: true } })).sort((a, b) => names.indexOf(a.programNodeKey) - names.indexOf(b.programNodeKey)).map((n) => n.label) : [];
    return { ...changeView(c!), field: field ? { key: field.canonicalFieldKey, label: field.label, meaning: field.meaning, value_type: field.valueType, group: field.groupKey, status: field.status } : null,
      goes_with: goesWith, with_combination: listed.some((k) => k.startsWith("combination:")), recheck: await this.lifecycle.recheck(c!) };
  }
  undoDelete(actor: Actor, id: string) { return this.lifecycle.undoOwnDelete(actor, id); }
  /** Send again: a returned structure or combination change goes through the one guard (QA-59); a field as before. */
  async resubmitLibraryChange(actor: Actor, id: string, b: { label?: string; meaning?: string; reason?: string }) {
    const c = await this.db.libraryChange.findUnique({ where: { id } });
    if (c && isLifecycleKind(c.kind)) {
      // QA-68: a delete, retire or restore has no name or meaning to correct: refused in words, never dropped silently.
      if (b.label !== undefined || b.meaning !== undefined) throw new HttpException({ type: "https://expatready.local/problems/nothing-to-rename", title: "Only what changed", status: 400, detail: `A ${actionVerb(c.action, c.kind)} is sent again with what changed only; its name and meaning stay as they are.` }, HttpStatus.BAD_REQUEST);
      return this.lifecycle.resubmit(actor, c, b.reason ?? "");
    }
    return resubmitChange(this.db, actor, id, b);
  }
  async decideLibraryChange(actor: Actor, id: string, decision: "approve" | "return", note?: string) {
    // W1-03 (P-116): a remove, retire or restore is checked again at approval; an approved remove applies at once.
    const before = decision === "approve" ? await this.db.libraryChange.findUnique({ where: { id } }) : null;
    if (before?.status === "WAITING") await this.lifecycle.checkApprove(before);
    const out = await decideChange(this.db, actor, id, decision, note);
    const c = (await this.db.libraryChange.findUnique({ where: { id } }))!;
    // An approved delete is applied at once; if applying fails, nothing was deleted, so the change waits again (R3-4).
    if (decision === "approve") await this.lifecycle.afterApprove(actor, c).catch(async (e) => {
      await this.db.libraryChange.updateMany({ where: { id, status: "APPROVED" }, data: { status: "WAITING", decidedBy: null, decidedAt: null, decisionNote: null } });
      if (e instanceof HttpException) throw e;
      fail("Nothing was deleted: the database refused it. It still waits on To review; try again, or return it.", HttpStatus.CONFLICT);
    });
    // S4 round 2 N8: an approved delete that could not be applied comes back RETURNED: say that, not "approved".
    const now = decision === "approve" ? (await this.db.libraryChange.findUnique({ where: { id } }))! : c;
    if (now.status === "RETURNED" && decision === "approve") { await this.audit.log(c.workspaceId, actor.id, "returned", `library ${c.kind}`, c.key, `${actor.name} approved "${c.label ?? c.key}" (${actionVerb(c.action, c.kind)}), but it could not be applied: ${now.decisionNote ?? ""}`, undefined, c.combinationId ?? undefined); return changeView(now); }
    await this.audit.log(c.workspaceId, actor.id, decision === "approve" ? "approved" : "returned", `library ${c.kind}`, c.key, `${actor.name} ${decision === "approve" ? "approved" : "returned"} "${c.label ?? c.key}" (${actionVerb(c.action, c.kind)})${note ? `: ${note}` : ""}`, undefined, c.combinationId ?? undefined);
    // QA-52: an approved delete is applied at once (RELEASED), so the answer says what happened, not what was decided.
    return decision === "approve" ? changeView(now) : out;
  }
}

const STOP = new Set(["the", "and", "for", "from", "with", "who", "are", "that", "this", "applied", "apply", "application", "applying", "person", "people", "outside", "inside", "canada", "visa"]);
const words = (s: string) => [...new Set(s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w)).map((w) => w.replace(/s$/, "")))];

/** Board view 11 (P-37, P-41): "Describe it" proposes the combination's path. Until the founder's OK for paid runs, the
 *  proposal is made without AI: the words of the description are matched with the existing paths (US$0), labelled so,
 *  and nothing is created until the author confirms. */
export async function proposePath(programs: Programs, body: { pathway?: string; description?: string }) {
  const description = String(body?.description ?? "").trim().slice(0, 400);
  if (description.length < 8) fail("Describe the application in a few words (at least 8 characters).");
  const opts = await programs.pathOptions(body?.pathway === "CORPORATE" ? "CORPORATE" : "INDIVIDUAL");
  const want = words(description);
  const leaves = opts.programs.flatMap((p) => p.categories.flatMap((c) => (c.subCategories.length ? c.subCategories.map((s) => ({ p, c, s })) : [{ p, c, s: null as null | (typeof c.subCategories)[number] }])));
  const scored = leaves.map((l) => {
    const path = [l.p.label, l.c.label, ...(l.s ? [l.s.label] : [])];
    const have = words(path.join(" ")), own = words((l.s ?? l.c).label);
    const hits = have.filter((w) => want.includes(w)), ownHits = own.filter((w) => want.includes(w));
    // "Exempt" in a path that the description does not say is the opposite meaning ("with an LMIA" is not LMIA-exempt).
    const opposite = have.includes("exempt") && !want.includes("exempt") ? 4 : 0;
    return { l, path, hits, score: hits.length + ownHits.length * 2 + (own.length && ownHits.length === own.length ? 2 : 0) - opposite };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.path.join().localeCompare(b.path.join()));
  const best = scored[0];
  if (!best) return { mode: "no_ai", cost_usd: 0, proposal: null, why: "No existing program, category or sub-category matches these words. Build the path by hand below." };
  const leaf = best.l.s ?? best.l.c;
  const close = scored[1] && scored[1].score === best.score;
  return { mode: "no_ai", cost_usd: 0, why: `Matched by the words ${best.hits.map((w) => `"${w}"`).join(", ")} (no AI).`, confidence: close ? "Medium" : "High",
    proposal: { pathway: opts.pathway, pathwayKey: best.l.p.pathway.key, pathwayLabel: best.l.p.pathway.label, path: best.path, program: { key: best.l.p.key, label: best.l.p.label }, category: { key: best.l.c.key, label: best.l.c.label }, subCategory: best.l.s ? { key: best.l.s.key, label: best.l.s.label } : null, exists: !!leaf.hasSetup, combinationId: leaf.combinationId ?? null },
    others: scored.slice(1, 3).map((x) => x.path.join(" › ")) };
}

@Controller("api")
export class Screen02Controller {
  constructor(@Inject(Screen02) private readonly s: Screen02, @Inject(Intake) private readonly intake: Intake, @Inject(Impact) private readonly impact: Impact, @Inject(Programs) private readonly programs: Programs) {}
  @Post("path-proposal") pathProposal(@Headers("x-actor") a: H, @Body() b: unknown) { need(actorOf(a), "author"); return proposePath(this.programs, obj(b) as { pathway?: string; description?: string }); }
  @Get("jobs/:id/form-fields") jobFormFields(@Param("id") id: string) { return this.s.jobFormFields(id); }
  @Get("editions/:id/form-fields") formFields(@Param("id") id: string) { return this.s.formFields(id); }
  @Post("editions/:id/form-fields/decision") decide(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.decideFormField(actorOf(a), id, b); }
  @Get("library/merges/:id") merge(@Param("id") id: string) { return this.s.merge(id); }
  @Get("library/changes") changes(@Query("status") status?: string) { return this.s.libraryChanges(status || undefined); }
  @Get("library/changes/:id") change(@Param("id") id: string) { return this.s.libraryChange(id); }
  @Post("library/changes/:id/approve") approve(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.decideLibraryChange(actorOf(a), id, "approve", noteOf(b)); }
  @Post("library/changes/:id/resubmit") resubmit(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { const o = obj(b); const str = (v: unknown) => (typeof v === "string" ? v : undefined); return this.s.resubmitLibraryChange(actorOf(a), id, { label: str(o.label), meaning: str(o.meaning), reason: str(o.reason) }); }
  @Post("library/changes/:id/withdraw") withdraw(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return withdrawChange(this.s.db, actorOf(a), id, noteOf(b)); }
  // P-116 amended: Undo of an author's own-draft delete (structure names; the library kinds come with S6).
  @Post("library/changes/:id/undo") undo(@Headers("x-actor") a: H, @Param("id") id: string) { return this.s.undoDelete(actorOf(a), id); }
  @OpenRead("a file link the browser opens") @Get("intake/held/:id/file") async heldFile(@Param("id") id: string, @Res() res: Response) {
    const f = await this.intake.heldBytes(id);
    // Shown in the browser to compare, never run: a sandbox and no content sniffing (a held file is untrusted).
    res.setHeader("Content-Type", "application/pdf"); res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("Content-Security-Policy", "sandbox");
    res.setHeader("Content-Disposition", `inline; filename="${f.name.replace(/[^A-Za-z0-9._-]/g, "_")}"`); res.send(f.bytes);
  }
  @Post("library/changes/:id/return") ret(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.decideLibraryChange(actorOf(a), id, "return", noteOf(b)); }
  @Patch("intake/held/:id") page(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { const p = obj(b).irccPage; return this.intake.recordPage(actorOf(a), id, { irccPage: typeof p === "string" ? p : undefined }); }
  @Post("intake/held/:id/approve") approveHeld(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { const p = obj(b).irccPage; return this.intake.decideHeld(actorOf(a), id, "approve", { note: noteOf(b), irccPage: typeof p === "string" ? p : undefined }); }
  @Post("intake/held/:id/reject") rejectHeld(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.intake.decideHeld(actorOf(a), id, "reject", { note: noteOf(b) }); }
  @Get("intake/held/:id/impact") impactOf(@Param("id") id: string) { return this.impact.review(id); }
  @Post("intake/held/:id/impact/accept") acceptImpact(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { const e = obj(b).expected; if (typeof e !== "number") fail("Send the number of form fields you reviewed (expected), so a changed comparison is not accepted unseen."); return this.impact.accept(actorOf(a), id, { expected: e as number }); }
}
