// Screen 02 slice 2 endpoints in the screens lane's own file (challenge point 1): a decision on one PDF form field (K1),
// library changes approved by a second person (LibraryChange), the held-file decision (P-80) and the new-edition impact
// review (P-32, C9.1). Captures, merges and screen maps keep their F1 endpoints (forms.ts); Screen 02 adds their pages.
import { Body, Controller, Get, Headers, HttpStatus, Inject, Injectable, Param, Patch, Post, Query } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { problemFromZod } from "../../contracts/programs.ts";
import { effective } from "../../engine/snapshot.ts";
import { actorOf, Audit, Db, fail, need, revise, strip, Workspace, type Actor } from "./core.ts";
import { changeView, decideChange } from "./library-changes.ts";
import { Intake } from "./intake.ts";
import { Impact } from "./impact.ts";

type H = string | undefined;
/** K1: a PDF form field is mapped, "not a fact", or "filled by hand" with a reason. */
export const FormFieldDecision = z.object({
  dataPath: z.string().min(1).max(300),
  decision: z.enum(["not_a_fact", "by_hand"]),
  reason: z.string().trim().min(8, "Say why in a sentence (at least 8 characters).").max(300),
}).strict();
function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) fail(problemFromZod(r.error).detail ?? "The request is not valid.");
  return r.data as z.infer<S>;
}

@Injectable()
export class Screen02 {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit) {}

  /** K1: decides one PDF form field that no shared field fills. A new draft version of that form field (origin HUMAN);
   *  an undecided form field of an edition changed in this draft blocks release until it is decided. */
  async decideFormField(actor: Actor, editionId: string, body: unknown) {
    need(actor, "review");
    const b = parse(FormFieldDecision, body);
    const ed = await this.db.formEdition.findUnique({ where: { id: editionId }, include: { form: true } }).catch(() => null);
    if (!ed) fail("This form edition does not exist.", HttpStatus.NOT_FOUND);
    if (ed!.channel !== "PDF") fail("This decides a PDF edition's form fields; an online version's inputs are decided on its screen map.");
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
    if (!ed) fail("This form edition does not exist.", HttpStatus.NOT_FOUND);
    const rows = effective(await this.db.formFieldMap.findMany({ where: { formEditionId: ed!.id } }), (m) => m.dataPath, "draft");
    const word: Record<string, string> = { mapped: "Mapped", not_a_fact: "Not a fact", never_filled: "Not a fact", by_hand: "Filled by hand", unresolved: "No decision" };
    return { edition: { id: ed!.id, label: ed!.editionLabel, form: ed!.form.formKey }, fields: rows.map((r) => ({ dataPath: r.dataPath, caption: r.caption, heading: r.heading, outcome: r.outcome, outcome_word: word[r.outcome] ?? r.outcome, field: r.canonicalFieldKey, reason: r.reason, status: r.status, carried: r.outcome === "unresolved" && r.status === "PUBLISHED" })) };
  }

  async libraryChanges(status?: string) {
    const workspaceId = await this.ws.id();
    return (await this.db.libraryChange.findMany({ where: { workspaceId, ...(status ? { status } : {}) }, orderBy: { proposedAt: "desc" }, take: 200 })).map(changeView);
  }
  async libraryChange(id: string) {
    const c = await this.db.libraryChange.findUnique({ where: { id } }).catch(() => null);
    if (!c) fail("This library change does not exist (the demo may have been reset).", HttpStatus.NOT_FOUND);
    const field = c!.kind === "field" ? await this.db.canonicalField.findFirst({ where: { workspaceId: c!.workspaceId, canonicalFieldKey: c!.key }, orderBy: { version: "desc" } }) : null;
    return { ...changeView(c!), field: field ? { key: field.canonicalFieldKey, label: field.label, meaning: field.meaning, value_type: field.valueType, group: field.groupKey, status: field.status } : null };
  }
  async decideLibraryChange(actor: Actor, id: string, decision: "approve" | "return", note?: string) {
    const out = await decideChange(this.db, actor, id, decision, note);
    const c = (await this.db.libraryChange.findUnique({ where: { id } }))!;
    await this.audit.log(c.workspaceId, actor.id, decision === "approve" ? "approved" : "returned", `library ${c.kind}`, c.key, `${actor.name} ${decision === "approve" ? "approved" : "returned"} "${c.label ?? c.key}" (${c.action.toLowerCase()})${note ? `: ${note}` : ""}`, undefined, c.combinationId ?? undefined);
    return out;
  }
}

@Controller("api")
export class Screen02Controller {
  constructor(@Inject(Screen02) private readonly s: Screen02, @Inject(Intake) private readonly intake: Intake, @Inject(Impact) private readonly impact: Impact) {}
  @Get("editions/:id/form-fields") formFields(@Param("id") id: string) { return this.s.formFields(id); }
  @Post("editions/:id/form-fields/decision") decide(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.decideFormField(actorOf(a), id, b); }
  @Get("library/changes") changes(@Query("status") status?: string) { return this.s.libraryChanges(status || undefined); }
  @Get("library/changes/:id") change(@Param("id") id: string) { return this.s.libraryChange(id); }
  @Post("library/changes/:id/approve") approve(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.s.decideLibraryChange(actorOf(a), id, "approve", b?.note); }
  @Post("library/changes/:id/return") ret(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.s.decideLibraryChange(actorOf(a), id, "return", b?.note); }
  @Patch("intake/held/:id") page(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.intake.recordPage(actorOf(a), id, b ?? {}); }
  @Post("intake/held/:id/approve") approveHeld(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.intake.decideHeld(actorOf(a), id, "approve", b ?? {}); }
  @Post("intake/held/:id/reject") rejectHeld(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.intake.decideHeld(actorOf(a), id, "reject", b ?? {}); }
  @Get("intake/held/:id/impact") impactOf(@Param("id") id: string) { return this.impact.review(id); }
  @Post("intake/held/:id/impact/accept") acceptImpact(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.impact.accept(actorOf(a), id, b ?? {}); }
}
