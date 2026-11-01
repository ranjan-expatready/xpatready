// Screen 02 slice 3, K2 (C3.4, C2.6): AI drafts document requirements (and later sections, rules and checks) from a
// combination's official checklist, reviewed beside the source like a field-map draft, applied through the existing
// writers. Live waits for the founder's OK on its cost (challenge point 3, Lead response: IMM 5483, Sample estimate under
// US$0.50, cap US$5) and is refused with that reason. Two passes run at US$0:
//  - stub: proves the path (job, review, apply) with no network and no AI content, so it proposes nothing;
//  - replay (C2.6, F4, P-219): the newest saved real AI reading of exactly this checklist edition (same inventory text,
//    checked by checksum) is read into document requirement proposals in the one review queue. Only the lines the AI
//    read from this checklist itself are proposed, and each one's quote must be found in the checklist's text, else it
//    is dropped and listed (P-121). One AI round and no checker round, so every item reads "Check", never "Ready".
//    Today the one saved reading is IMM 5488 (10-2024) (prototype/p2/runs/c1-requirements-live-*); IMM 5483 has none.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { Body, Controller, Get, Headers, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { actorOf, Audit, Db, fail, need, PROTOTYPE, SOLUTION, Workspace, type Actor } from "./core.ts";
import { Studio, WHO } from "./studio.ts";
import { reviewRow } from "./proposals.ts";
import { checkCondition } from "../../engine/validate.ts";

export const CHECKLIST_KINDS = ["document_requirement", "section", "rule", "check"] as const;
/** What a checklist proposal carries in its payload (ProposalItem kind requirement_line; its review row says document_requirement). */
export type RequirementProposal = { document_type: string; who: string; base_or_conditional: "base" | "conditional"; condition_plain?: string | null; condition_tree?: unknown; provided_by?: string };

const RUNS_DIR = join(PROTOTYPE, "p2", "runs");
/** "imm5488e.pdf" → "prototype/p1/inventory/imm5488e.text.inventory.json": the checklist's text as the AI read it. */
export const inventoryOf = (officialFile: string) => `prototype/p1/inventory/${basename(officialFile).replace(/\.pdf$/i, "").toLowerCase()}.text.inventory.json`;
/** Quotes are compared on their words: case, spaces and the kind of quote mark do not count. */
export const wordsOf = (t: string) => t.toLowerCase().replace(/[\u2018\u2019\u201c\u201d'"`]/g, "").replace(/\s+/g, " ").trim();
type SavedDoc = { document_type?: unknown; who?: unknown; base_or_conditional?: unknown; condition_plain?: unknown; condition?: unknown; provided_by?: unknown; source_file?: unknown; source_quote?: unknown; confidence?: unknown; reason?: unknown; new_type?: unknown };
export type SavedReading = { runFile: string; runId: string; inventory: string; sha256: string; text: string; docs: SavedDoc[] };
/** The newest saved real (live, contract-valid) requirements run that read this checklist's text with the same checksum,
 *  or null. A stub run is never replayed (break R5-1); a run of another edition's text does not match its checksum. */
export function savedReading(officialFile: string | null, where: { runs?: string; root?: string } = {}): SavedReading | null {
  if (!officialFile) return null;
  const inventory = inventoryOf(officialFile), RUNS = where.runs ?? RUNS_DIR;
  let bytes: Buffer; try { bytes = readFileSync(join(where.root ?? SOLUTION, inventory)); } catch { return null; }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  let files: string[]; try { files = readdirSync(RUNS).filter((f) => /-requirements-live-.*\.json$/.test(f)).sort().reverse(); } catch { return null; }
  for (const f of files) {
    type SavedRun = { caller?: unknown; contract_valid?: unknown; raw_output?: unknown; drafting_run?: { kind?: unknown; run_id?: unknown; inputs?: { official_files?: { file?: unknown; sha256?: unknown }[] } } };
    let d: SavedRun; try { d = JSON.parse(readFileSync(join(RUNS, f), "utf8")) as SavedRun; } catch { continue; }
    if (d?.caller !== "live" || d?.contract_valid !== true || d?.drafting_run?.kind !== "requirements") continue;
    if (!(d.drafting_run.inputs?.official_files ?? []).some((x) => x?.file === inventory && x?.sha256 === sha256)) continue;
    let out: { documents?: unknown }; try { out = (typeof d.raw_output === "string" ? JSON.parse(d.raw_output) : d.raw_output) as { documents?: unknown }; } catch { continue; }
    if (!Array.isArray(out?.documents)) continue;
    let text = ""; try { text = String(JSON.parse(bytes.toString("utf8")).text ?? ""); } catch { /* no text: every quote is dropped */ }
    return { runFile: `prototype/p2/runs/${f}`, runId: String(d.drafting_run.run_id ?? f.replace(/\.json$/, "")), inventory, sha256, text, docs: out.documents as SavedDoc[] };
  }
  return null;
}
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export type ReadLine = RequirementProposal & { condition_plain: string | null; condition_tree: unknown; provided_by: string; quote: string; reason: string | null };
/** The saved run's condition ({ subject_kind, tree_json: "…" }) as a condition-language root, as p2/assemble.ts toRoot
 *  makes it: the first live drafts named branch keys "conditions"/"condition", renamed to "args"/"arg" (discovery D18),
 *  and the subject kind goes on the root. Null when it has none or the text does not parse. */
const renameBranches = (n: unknown): unknown => {
  if (!n || typeof n !== "object" || Array.isArray(n)) return n;
  const o: Record<string, unknown> = {}, op = (n as { op?: unknown }).op;
  for (const [k, v] of Object.entries(n)) {
    if (k === "conditions" && (op === "and" || op === "or") && Array.isArray(v)) o.args = v.map(renameBranches);
    else if (k === "condition" && op === "not") o.arg = renameBranches(v);
    else o[k] = v;
  }
  return o;
};
export const treeOf = (c: unknown): unknown => {
  const x = c as { tree_json?: unknown; subject_kind?: unknown } | null;
  if (typeof x?.tree_json !== "string") return null;
  let t: unknown; try { t = JSON.parse(x.tree_json); } catch { return null; }
  if (!t || typeof t !== "object" || Array.isArray(t)) return null;
  return { subjectKind: String(x.subject_kind ?? "").toUpperCase().replace(/[^A-Z0-9_]/g, "_"), ...(renameBranches(t) as Record<string, unknown>) };
};
/** The rules on a saved reading (P-121), no database: only the lines read from this checklist itself; each complete
 *  (document type, person, kind, and a condition when conditional); its quote found in the checklist's text; no line
 *  twice for the same person. Everything else is dropped with its reason in words. */
export function linesOf(r: Pick<SavedReading, "inventory" | "text" | "docs">, label: string): { lines: ReadLine[]; dropped: string[] } {
  const text = wordsOf(r.text), lines: ReadLine[] = [], dropped: string[] = [], seen = new Set<string>();
  for (const d of r.docs.filter((x) => x.source_file === r.inventory)) {
    const type = str(d.document_type, 120), who = str(d.who, 60), quote = str(d.source_quote, 1000), cond = str(d.condition_plain, 300);
    const kind = d.base_or_conditional === "conditional" ? "conditional" : d.base_or_conditional === "base" ? "base" : null;
    if (!type || !who || !kind || (kind === "conditional" && (!cond || cond.length < 3))) { dropped.push(`${type ?? "a line"} (incomplete: no document type, person or condition)`); continue; }
    if (!quote || !text.includes(wordsOf(quote))) { dropped.push(`${type} (its quote is not in ${label})`); continue; }
    const id = `${wordsOf(type)}|${who}`;
    if (seen.has(id)) { dropped.push(`${type} for ${who.replace(/_/g, " ")} (the same line twice)`); continue; }
    seen.add(id);
    lines.push({ document_type: type, who, base_or_conditional: kind, condition_plain: kind === "conditional" ? cond : null, condition_tree: kind === "conditional" ? treeOf(d.condition) : null, provided_by: str(d.provided_by, 40) ?? "client", quote, reason: str(d.reason, 300) });
  }
  return { lines, dropped };
}

/** "document type key|person" of every requirement the combination has now (each lineage's newest version, unless
 *  retired): a checklist line already there is never written twice (#277 review M2). */
export async function linesOnCombination(db: Db, combinationId: string): Promise<Set<string>> {
  const rows = await db.documentRequirement.findMany({ where: { combinationId }, select: { lineageKey: true, version: true, status: true, documentTypeKey: true, appliesToRoles: true } });
  const top = new Map<string, (typeof rows)[number]>();
  for (const r of rows) { const t = top.get(r.lineageKey); if (!t || r.version > t.version) top.set(r.lineageKey, r); }
  return new Set([...top.values()].filter((r) => r.status !== "RETIRED").map((r) => `${r.documentTypeKey}|${r.appliesToRoles}`));
}

@Injectable()
export class Checklists {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Studio) private readonly studio: Studio) {}

  async draft(actor: Actor, attachmentId: string, body: { mode?: string }) {
    need(actor, "author");
    const a = await this.db.sourceAttachment.findUnique({ where: { id: attachmentId } }).catch(() => null);
    if (!a) fail("This source does not exist.", HttpStatus.NOT_FOUND);
    if (!a!.recognised || a!.kind !== "Document checklist") fail("Only an approved official document checklist is drafted into requirements.");
    // One open draft per checklist (break m9: twenty clicks made twenty drafts): the open one is returned.
    const mode = body?.mode ?? "stub";
    if (mode === "replay") return this.replay(actor, a!);
    if (mode !== "stub") fail("A live draft from a checklist waits for the founder's OK on its cost (Sample estimate under US$0.50, capped at US$5). Replay a saved reading, or run the stub pass to see the path.", HttpStatus.CONFLICT);
    // Looked up and created under one lock per checklist, so drafts started at the same moment share one job.
    const { job, made } = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`checklist-draft:${attachmentId}`}))`;
      const open = await tx.draftingJob.findFirst({ where: { attachmentId, kind: "checklist_draft", mode: "STUB", status: "COMPLETED" }, orderBy: { startedAt: "desc" } });
      if (open) return { job: open, made: false };
      return { made: true, job: await tx.draftingJob.create({ data: { workspaceId: a!.workspaceId, combinationId: a!.combinationId, attachmentId: a!.id, kind: "checklist_draft", mode: "STUB", status: "COMPLETED", costUsd: 0, startedBy: actor.id, finishedAt: new Date(),
      message: `Stub pass of the checklist drafting path for ${a!.edition ?? a!.fileName}: no network, no cost, no AI content, so nothing is proposed. A live draft proposes the document requirements with the checklist's own words beside each.`,
      detail: { operation: "draft_from_checklist", source: a!.edition, kinds: CHECKLIST_KINDS } } }) };
    });
    if (!made) return job;
    await this.audit.log(a!.workspaceId, actor.id, "started", "checklist draft", a!.edition ?? a!.fileName, `${actor.name} ran the stub pass of the checklist drafting path on ${a!.edition ?? a!.fileName} (no AI, US$0)`, undefined, a!.combinationId);
    return job;
  }

  /** The saved readings this combination's checklists have (the launch panel offers Replay only where one exists). */
  async readings(combinationId: string) {
    const list = await this.db.sourceAttachment.findMany({ where: { combinationId, kind: "Document checklist", recognised: true }, select: { id: true, officialFile: true } });
    return list.map((a) => { const r = savedReading(a.officialFile); return { attachmentId: a.id, saved: !!r, runFile: r?.runFile ?? null, lines: r ? linesOf(r, a.officialFile ?? "").lines.length : 0 }; });
  }

  /** C2.6: the saved reading replayed into requirement_line proposals (US$0). One open replay per checklist: a second
   *  click returns it (break m9), under the same per-checklist lock as the stub pass. */
  private async replay(actor: Actor, a: { id: string; workspaceId: string; combinationId: string; edition: string | null; fileName: string; officialFile: string | null }) {
    const r = savedReading(a.officialFile);
    if (!r) fail(`No saved AI reading of ${a.edition ?? a.fileName} yet, so there is nothing to replay. A live reading waits for the founder's OK on its cost (Sample estimate under US$0.50, capped at US$5); the stub pass shows the path.`, HttpStatus.CONFLICT);
    const types = await this.db.documentType.findMany({ where: { workspaceId: a.workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { documentTypeKey: true, name: true } });
    const read = linesOf(r!, a.edition ?? a.fileName), dropped = read.dropped, have = await linesOnCombination(this.db, a.combinationId);
    const typeOf = (name: string) => types.find((t) => t.documentTypeKey === name || t.name.toLowerCase() === name.toLowerCase());
    const lines = read.lines.filter((l) => { const t = typeOf(l.document_type); if (t && have.has(`${t.documentTypeKey}|${l.who}`)) { dropped.push(`${l.document_type} for ${l.who.replace(/_/g, " ")} (already on this combination)`); return false; } return true; });
    const items: Prisma.ProposalItemCreateManyInput[] = lines.map((l) => {
      const key = `requirement_line:${a.combinationId}:${wordsOf(l.document_type)}:${l.who}`;
      const match = typeOf(l.document_type);
      const legacy: RequirementProposal = { document_type: l.document_type, who: l.who, base_or_conditional: l.base_or_conditional, condition_plain: l.condition_plain, condition_tree: l.condition_tree, provided_by: l.provided_by };
      const payload = { kind: "requirement_line", documentType: l.document_type, roles: [l.who], always: l.base_or_conditional === "base", condition: l.condition_plain ? { sentence: l.condition_plain, tree: l.condition_tree ?? null, sharedConditionKey: null, examples: [] } : null, alternativeGroup: null, ...legacy, label: `${l.document_type} · ${l.who.replace(/_/g, " ")}`.slice(0, 160) };
      const reading = `${l.document_type}: ${l.condition_plain ?? "always"}, for ${l.who.replace(/_/g, " ")}`.slice(0, 300);
      return { workspaceId: a.workspaceId, kind: "requirement_line", step: "checklist_draft", combinationId: a.combinationId, landsOn: "combination",
        reuse: { match: match ? "reuse" : "new", existingKey: match?.documentTypeKey ?? null }, payload: payload as Prisma.InputJsonValue,
        source: { file: r!.inventory, sha256: r!.sha256, edition: a.edition, page: null, quote: l.quote, quoteFound: true, rule: null },
        rounds: { draft: { reading, payload, from: "replay", runFile: r!.runFile, costUsd: 0 }, check: null } as Prisma.InputJsonValue,
        rules: [{ rule: "quote_in_source", passed: true, why: null }], agreement: "one_round", confidence: "check", reason: l.reason, origin: "ai",
        identity: { key, near: [], nearReason: null }, identityKey: key, basis: "SAMPLE", work: { proposedKey: key, sourceQuote: l.quote, reason: l.reason ?? "" } };
    });
    const { job, made } = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`checklist-draft:${a.id}`}))`;
      const open = await tx.draftingJob.findFirst({ where: { attachmentId: a.id, kind: "checklist_draft", mode: "REPLAY", status: "COMPLETED" }, orderBy: { startedAt: "desc" } });
      if (open) return { job: open, made: false };
      const job = await tx.draftingJob.create({ data: { workspaceId: a.workspaceId, combinationId: a.combinationId, attachmentId: a.id, kind: "checklist_draft", mode: "REPLAY", status: "COMPLETED", costUsd: 0, startedBy: actor.id, finishedAt: new Date(),
        message: `Replayed the saved AI reading of ${a.edition ?? a.fileName} (US$0): ${items.length} document requirement${items.length === 1 ? "" : "s"} proposed with the checklist's own words beside each${dropped.length ? `; ${dropped.length} dropped by the rules: ${dropped.join("; ")}` : ""}. One AI round, no checker round yet, so each one reads Check. Every value is Sample until the immigration expert confirms it.`,
        detail: { operation: "draft_from_checklist", source: a.edition, kinds: CHECKLIST_KINDS, runFile: r!.runFile, proposed: items.length, dropped } } });
      if (items.length) await tx.proposalItem.createMany({ data: items.map((i) => ({ ...i, runId: job.id })) });
      return { job, made: true };
    });
    if (made) await this.audit.log(a.workspaceId, actor.id, "started", "checklist draft", a.edition ?? a.fileName, `${actor.name} replayed the saved AI reading of ${a.edition ?? a.fileName}: ${items.length} document requirements proposed${dropped.length ? `, ${dropped.length} dropped` : ""} (US$0)`, undefined, a.combinationId);
    return job;
  }

  /** Applies the accepted proposals of a checklist draft through the combination's own writers (draft rows; release
   *  follows review). Document requirements only in this slice; other kinds are listed as not applied. */
  async apply(actor: Actor, jobId: string) {
    need(actor, "author");
    const found = await this.db.draftingJob.findUnique({ where: { id: jobId }, include: { proposals: true } }).catch(() => null);
    const job = found && { ...found, items: found.proposals.map(reviewRow) };
    if (!job || job.kind !== "checklist_draft") fail("This is not a checklist draft.", HttpStatus.NOT_FOUND);
    if (job!.status !== "COMPLETED") fail(job!.status === "APPLIED" ? "Already applied." : "The draft is not ready.", HttpStatus.CONFLICT);
    const pending = job!.items.filter((i) => i.decision === "PENDING");
    if (pending.length) fail(`${pending.length} proposal${pending.length === 1 ? " is" : "s are"} still undecided.`);
    const a = await this.db.sourceAttachment.findUniqueOrThrow({ where: { id: job!.attachmentId! } });
    const types = await this.db.documentType.findMany({ where: { workspaceId: job!.workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { documentTypeKey: true, name: true } });
    // Every accepted proposal is checked before anything is written (break M7: a malformed one failed half-way after the
    // draft was already marked applied).
    const lib = job!.items.some((x) => x.decision === "ACCEPTED" && (x.payload as Partial<RequirementProposal> | null)?.base_or_conditional === "conditional") ? await this.studio.libraryTypes(job!.workspaceId) : null;
    const have = await linesOnCombination(this.db, job!.combinationId!);
    const plan: { item: ReturnType<typeof reviewRow>; typeKey: string; p: RequirementProposal }[] = []; const skipped: string[] = []; const bad: string[] = [];
    for (const i of job!.items.filter((x) => x.decision === "ACCEPTED")) {
      if (i.kind !== "document_requirement") { skipped.push(`${i.proposedKey} (${i.kind.replace("_", " ")}: applied by hand in this slice)`); continue; }
      const p = (i.payload ?? {}) as Partial<RequirementProposal>;
      if (typeof p.document_type !== "string" || !p.document_type.trim() || typeof p.who !== "string" || !["base", "conditional"].includes(String(p.base_or_conditional)) || (p.condition_plain !== undefined && p.condition_plain !== null && typeof p.condition_plain !== "string")) { bad.push(i.proposedMeaning || i.proposedKey); continue; }
      const type = types.find((t) => t.documentTypeKey === p.document_type || t.name.toLowerCase() === p.document_type!.toLowerCase());
      if (!type) { skipped.push(`${p.document_type} (no such document type in the library yet)`); continue; }
      if (have.has(`${type.documentTypeKey}|${p.who}`)) { skipped.push(`${p.document_type} (already on this combination for ${p.who.replace(/_/g, " ")})`); continue; }
      have.add(`${type.documentTypeKey}|${p.who}`);
      if (!WHO.includes(p.who)) { skipped.push(`${p.document_type} (whose document it is, "${p.who}", is not a choice yet)`); continue; }
      // A conditional line is written with its condition in the condition language, checked against the library's
      // fields first (C2.6: never a half-applied draft, never a conditional line without its condition).
      if (p.base_or_conditional === "conditional") {
        if (!p.condition_tree || typeof p.condition_tree !== "object") { skipped.push(`${p.document_type} (conditional: write its condition by hand on the combination)`); continue; }
        const errs = checkCondition(p.condition_tree, lib!.fields, lib!.derived);
        if (errs.length) { skipped.push(`${p.document_type} (its condition does not fit the library yet: ${errs[0]})`); continue; }
      }
      plan.push({ item: i, typeKey: type.documentTypeKey, p: p as RequirementProposal });
    }
    if (bad.length) fail(`${bad.length} accepted proposal${bad.length === 1 ? " is" : "s are"} incomplete (no document type, person or kind): return ${bad.length === 1 ? "it" : "them"}, then apply. For example: ${bad[0]}.`);
    const claimed = await this.db.draftingJob.updateMany({ where: { id: jobId, status: "COMPLETED" }, data: { status: "APPLIED" } });
    if (!claimed.count) fail("Already applied.", HttpStatus.CONFLICT);
    let added = 0;
    try {
      for (const { item, typeKey, p } of plan) {
        await this.studio.saveRequirement(actor, job!.combinationId!, null, { documentTypeKey: typeKey, attachMode: p.base_or_conditional === "conditional" ? "ANSWER_CONDITIONAL" : "COMBINATION_MANDATORY", conditionPlain: p.condition_plain ?? undefined, condition: p.base_or_conditional === "conditional" ? p.condition_tree : undefined, appliesToRoles: p.who, providedBy: p.provided_by ?? "client", sourceQuote: item.sourceQuote ?? undefined, sourceFile: a.officialFile ?? a.fileName });
        added++;
      }
    } catch (e) {
      // Nothing half-applied is left marked done: the draft can be applied again once the cause is fixed.
      await this.db.draftingJob.update({ where: { id: jobId }, data: { status: "COMPLETED" } });
      throw e;
    }
    await this.audit.log(job!.workspaceId, actor.id, "applied", "checklist draft", a.edition ?? a.fileName, `${actor.name} applied the reviewed checklist draft of ${a.edition ?? a.fileName}: ${added} document requirements added to the draft${skipped.length ? `; not applied: ${skipped.join(", ")}` : ""}`, undefined, job!.combinationId ?? undefined);
    // #277 review M3: what was not applied, and why, stays on the checklist page (the job's own record).
    await this.db.draftingJob.update({ where: { id: jobId }, data: { detail: { ...((job!.detail ?? {}) as Record<string, unknown>), applied: { added, skipped } } as Prisma.InputJsonValue } });
    return { added, skipped };
  }
}

@Controller("api")
export class ChecklistsController {
  constructor(@Inject(Checklists) private readonly c: Checklists) {}
  @Post("attachments/:id/draft-checklist") draft(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Body() b: unknown) { return this.c.draft(actorOf(a), id, (b ?? {}) as { mode?: string }); }
  @Get("combinations/:id/checklist-readings") readings(@Param("id") id: string) { return this.c.readings(id); }
  @Post("jobs/:id/apply-checklist") apply(@Headers("x-actor") a: string | undefined, @Param("id") id: string) { return this.c.apply(actorOf(a), id); }
}
