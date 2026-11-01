// X2b (C1.5, concept v3 §3, board design/draft-x2b-board.html). Slice (a) BR-C1: before one form or document line is
// added to, or removed from, many combinations, say what will happen in each, with the reason; nothing is written.
// Slice (b) BR-C2 to BR-C4: the apply re-runs the same rules inside one transaction and writes every ticked target under
// one batch (line_batch) with an idempotency key; one Undo takes back the whole batch, or nothing. Rules only, US$0.
// Founder 31 Oct (#167): form and document lines first; links between combinations stay on the case (P-106).
import { Body, Controller, Headers, HttpCode, HttpException, Inject, Injectable, Param, Post } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { acceptsOf, allowedChannels, notAcceptedWords, notNeededWords } from "../../engine/channels.ts";
import { rolesNamedBy } from "../../engine/people.ts";
import { CHANNEL_WORDS, type Channel } from "../../contracts/forms.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { appliedWords, BulkApply, BulkPreview, OUTCOME_WORDS, TICKABLE, undoRefusedWords, WAITS_REMOVE_WORDS, WAITS_WORDS, WHO_WORDS, type ApplyResult, type Outcome, type PreviewResult, type PreviewTarget, type UndoResult } from "../../contracts/lines-bulk.ts";
import { ACTORS, actorOf, Audit, Db, need, revise, strip, type Actor } from "./core.ts";
import { addFormLine } from "./form-lines.ts";
import { closingChange, hasApprovedFile, lineSig, recordAction, snapshotLines, type LineRow } from "./form-uses.ts";

type H = string | undefined;
/** The database, or the apply's transaction: the preview's rules read through either (BR-C3: re-checked inside it). */
type Tx = Prisma.TransactionClient;
const nameOf = (id: string | null | undefined) => ACTORS.find((a) => a.id === id)?.name ?? "another person";
const hhmm = (d: Date | string) => `${new Date(d).toISOString().slice(11, 16)} UTC`;
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);
/** The fields a condition reads (the same reading as engine/validate.ts and engine/snapshot.ts). */
const fieldsOf = (c: unknown) => (c ? [...JSON.stringify(c).matchAll(/"field":"([^"]+)"/g)].map((m) => m[1]) : []);
/** Two "only if"s are the same when both are "always", or both read the same condition. */
const sameCondition = (a: { attachMode: string; predicateJson: unknown }, b: { attachMode: string; predicateJson: unknown }) =>
  a.attachMode === b.attachMode && (a.attachMode === "COMBINATION_MANDATORY" || JSON.stringify(a.predicateJson ?? null) === JSON.stringify(b.predicateJson ?? null));
/** A role inside "this application has no …". */
const ROLE_WORDS: Record<string, string> = { spouse_or_partner: "spouse or partner", child: "child", representative: "representative", sponsor: "sponsor", parent: "parent" };
const newestBy = <T extends { lineageKey: string; version: number }>(rows: T[]) => {
  const m = new Map<string, T>(); for (const r of rows) { const n = m.get(r.lineageKey); if (!n || r.version > n.version) m.set(r.lineageKey, r); } return m;
};

/** The line as the source combination has it now (its newest version). */
type SourceLine = { kind: "form" | "document"; key: string; typeKey: string; who: string; attachMode: string; predicateJson: unknown; conditionPlain: string | null; channel?: Channel; dataForm?: boolean; words: string;
  /** The short name for the toast ("IMM 5476", "Passport"). */ short: string;
  /** BR-C2: what is copied besides who and "only if" (a form: its signature, minimum age, signer and copies; a document:
   *  who provides it, whether it is required, and its alternatives). Never its history, AI origin or finder run. */
  copied: Record<string, unknown> };
/** One target of a batch as recorded: the line rows before, and the rows after (what Undo compares and puts back). */
type BatchTarget = { combinationId: string; label: string; short: string; typeKey: string; keys: string[]; before: Record<string, unknown>[]; after: { id: string; status: string; version: number; sig: string }[] };
type DocRow = Prisma.DocumentRequirementGetPayload<object>;
/** What a document line says (as lineSig for forms): an edit that keeps its status and version still changes this. */
const docSig = (r: DocRow) => JSON.stringify([r.documentTypeKey, r.attachMode, r.predicateJson, r.conditionPlain, r.appliesToRoles, r.providedBy, r.isRequired, r.position, r.alternatives, r.note, r.sourceQuote]);
const sigOf = (kind: "form" | "document", r: LineRow | DocRow) => (kind === "form" ? lineSig(r as LineRow) : docSig(r as DocRow));

@Injectable()
export class LinesBulk {
  constructor(@Inject(Db) private readonly db: Db) {}

  /** POST /lines/bulk/preview: one row per chosen combination, with its trail, outcome and reason (BR-C1). */
  async preview(actor: Actor, body: unknown): Promise<PreviewResult> {
    need(actor, "author");
    const parsed = BulkPreview.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), 400);
    const { src, source, ...r } = await this.evaluate(this.db, parsed.data); void src; void source;
    return r;
  }

  /** BR-C1 for every chosen combination, read through `db` (the apply passes its transaction). */
  private async evaluate(db: Tx, b: BulkPreview): Promise<PreviewResult & { src: { id: string; label: string; workspaceId: string }; source: SourceLine }> {
    const src = await db.combination.findUnique({ where: { id: b.line.combinationId } });
    if (!src) throw problem(404, "Not found", "The combination the line comes from does not exist (it may have been removed by a reset).");
    const line = await this.sourceLine(db, src, b.line.kind, b.line.key);
    const ids = [...new Set(b.combinationIds)];
    const combos = await db.combination.findMany({ where: { id: { in: ids }, workspaceId: src.workspaceId } });
    if (combos.length !== ids.length) throw problem(404, "Not found", "One of the chosen combinations does not exist any more. Reload the page.", { errors: [{ field: "combinationIds", message: "Reload the page." }] });
    const trails = await this.trails(db, src.workspaceId);
    const libraryBlock = b.op === "add" ? await this.libraryBlock(db, src.workspaceId, line) : null;
    const accepts = b.op === "add" && line.kind === "form" && line.dataForm ? (await acceptsOf(db, src.workspaceId)).get(line.key) : undefined;
    const live = combos.filter((c) => !c.retiredAt && c.id !== src.id).map((c) => c.id);
    // QA-94: a fact is named by its meaning in the library, never by its system name.
    const condFields = fieldsOf(line.attachMode === "ANSWER_CONDITIONAL" ? line.predicateJson : null);
    const meanings = new Map((condFields.length ? await db.canonicalField.findMany({ where: { workspaceId: src.workspaceId, canonicalFieldKey: { in: condFields } }, orderBy: { version: "asc" }, select: { canonicalFieldKey: true, meaning: true } }) : []).map((f) => [f.canonicalFieldKey, f.meaning] as [string, string]));
    // Review M1: a condition pulls its library question into a combination's snapshot (engine/snapshot.ts "used"), so a
    // fact counts as asked when the library has a question for it, a document of that combination supplies it, or it is
    // derived (the reachability reading of engine/validate.ts). Read once for all targets (m4: no snapshot per target).
    // Review n1 (#254): a question counts only by its newest version, and only while that is a draft or released (an edited
    // question that was then retired asks nothing). Every version of the lineages that ever asked these facts is read.
    const askedLineages = condFields.length ? [...new Set((await db.sectionQuestion.findMany({ where: { workspaceId: src.workspaceId, canonicalFieldKey: { in: condFields } }, select: { lineageKey: true } })).map((q) => q.lineageKey))] : [];
    const libraryAsked = new Set<string>(condFields.length ? [
      ...[...newestBy(askedLineages.length ? await db.sectionQuestion.findMany({ where: { workspaceId: src.workspaceId, lineageKey: { in: askedLineages } }, select: { lineageKey: true, version: true, status: true, canonicalFieldKey: true } }) : []).values()]
        .filter((q) => (q.status === "DRAFT" || q.status === "PUBLISHED") && condFields.includes(q.canonicalFieldKey)).map((q) => q.canonicalFieldKey),
      ...(await db.derivedField.findMany({ where: { workspaceId: src.workspaceId, derivedKey: { in: condFields } }, select: { derivedKey: true } })).map((d) => d.derivedKey),
    ] : []);
    const supplies = new Map((condFields.length ? await db.documentType.findMany({ where: { workspaceId: src.workspaceId, suppliesFacts: { hasSome: condFields } }, select: { documentTypeKey: true, suppliesFacts: true } }) : []).map((t) => [t.documentTypeKey, t.suppliesFacts]));
    const [forms, reqs, subs] = await Promise.all([
      line.kind === "form" ? db.combinationForm.findMany({ where: { combinationId: { in: live }, lineageKey: line.key } }) : Promise.resolve([]),
      // Review M2: every document line of the targets, so the newest version of each is taken before matching (a draft may
      // change whose it is, or its type, under the same line key).
      line.kind === "document" || supplies.size ? db.documentRequirement.findMany({ where: { combinationId: { in: live } } }) : Promise.resolve([]),
      db.reviewSubmission.findMany({ where: { combinationId: { in: live } }, orderBy: { submittedAt: "desc" }, select: { combinationId: true, status: true } }),
    ]);
    const supersededIds = [...forms, ...reqs].map((r) => r.supersedesId).filter((x): x is string => !!x);
    const before = new Map<string, { status: string; attachMode: string; predicateJson: unknown; conditionPlain: string | null }>([
      ...(line.kind === "form" ? await db.combinationForm.findMany({ where: { id: { in: supersededIds } }, select: { id: true, status: true, attachMode: true, predicateJson: true, conditionPlain: true } }) : await db.documentRequirement.findMany({ where: { id: { in: supersededIds } }, select: { id: true, status: true, attachMode: true, predicateJson: true, conditionPlain: true } })).map((r) => [r.id, r] as [string, typeof r]),
    ]);
    const reqsOf = new Map<string, (typeof reqs)[number][]>(); for (const r of newestBy(reqs.map((x) => ({ ...x, lineageKey: `${x.combinationId}|${x.lineageKey}` }))).values()) { const k = r.combinationId; reqsOf.set(k, [...(reqsOf.get(k) ?? []), r]); }
    const whenWords = (r: { attachMode: string; conditionPlain: string | null }) => (r.attachMode === "COMBINATION_MANDATORY" ? "always" : `only if ${r.conditionPlain ?? "its own condition"}`);
    const submitted = new Set<string>(); const seen = new Set<string>();
    for (const s of subs) { if (seen.has(s.combinationId)) continue; seen.add(s.combinationId); if (s.status === "SUBMITTED") submitted.add(s.combinationId); }

    const targets: PreviewTarget[] = ids.map((id) => {
      const c = combos.find((x) => x.id === id)!;
      const row = (outcome: Outcome, reason: string | null): PreviewTarget => ({ combinationId: id, trail: trails(c), outcome, reason, tickable: TICKABLE.includes(outcome) });
      if (id === src.id) return row("SOURCE", "The line is copied from this combination.");
      if (c.retiredAt) return row("CANNOT_COMBINATION_RETIRED", `"${c.label}" is retired: nothing in it changes. Restore it on Structure first.`);
      // The target's own line, matched on the form number (forms) or the document type and whose it is (documents).
      const mine = line.kind === "form" ? [...newestBy(forms.filter((r) => r.combinationId === id)).values()]
        : (reqsOf.get(id) ?? []).filter((r) => r.documentTypeKey === line.typeKey && r.appliesToRoles === line.who);
      const kept = mine.find((r) => r.status !== "RETIRED");
      const waits = submitted.has(id);
      if (b.op === "remove") {
        if (!kept) {
          const draftRemoval = mine.find((r) => r.status === "RETIRED" && r.supersedesId && before.get(r.supersedesId)?.status === "PUBLISHED");
          return draftRemoval ? row("REMOVED_IN_DRAFT", "Its draft already removes this line; the release takes it out.") : row("DOES_NOT_HAVE", "This combination does not have this line.");
        }
        // Review m2: the board names an "only if" that differs from the line chosen.
        return waits ? row("WAITS", WAITS_REMOVE_WORDS) : row("WILL_REMOVE", sameCondition(kept, line) ? null : `Its own line is ${whenWords(kept)} (the line you chose: ${whenWords(line)}); it is removed all the same.`);
      }
      if (kept) return sameCondition(kept, line) ? row("ALREADY_HAS", "This combination already has this line, with the same \"only if\".")
        : row("HAS_OTHER_CONDITION", `It has this line ${whenWords(kept)}: its own line is kept. Change it there if it should match.`);
      // Review m1: a form its draft removed comes back as its own released line (addFormLine), with its own "only if".
      const restored = line.kind === "form" ? mine.find((r) => r.status === "RETIRED" && r.supersedesId && before.get(r.supersedesId)?.status === "PUBLISHED") : undefined;
      const restoreWords = restored ? (sameCondition(before.get(restored.supersedesId!)!, line) ? "Its draft's removal is taken back: its released line returns." : `Its draft's removal is taken back: its released line returns ${whenWords(before.get(restored.supersedesId!)!)}, not as the line you chose.`) : null;
      if (libraryBlock) return row("CANNOT_RETIRED", libraryBlock);
      if (line.kind === "form" && line.dataForm && line.channel) {
        const { channels, record } = allowedChannels(accepts, c.portalKey);
        if (line.channel === "NOT_NEEDED" && !channels.includes("NOT_NEEDED")) return row("CANNOT_CHANNEL", notNeededWords(line.key, c.portalKey));
        if (!channels.includes(line.channel)) return row("CANNOT_CHANNEL", record ? notAcceptedWords(line.key, line.channel, record) : `${line.key} is filed as ${CHANNEL_WORDS[line.channel]}, which is not offered for this combination's IRCC account.`);
      }
      const people = (c.participants as { role: string; label?: string; max: number }[]) ?? [];
      const missing = rolesNamedBy(line.who).filter((r) => !people.some((p) => p.role === r && p.max > 0));
      if (missing.length) return row("CANNOT_PERSON", `The line is for ${WHO_WORDS[line.who] ?? line.who}, and nobody in this application is a ${missing.map((r) => people.find((p) => p.role === r)?.label?.toLowerCase() ?? ROLE_WORDS[r] ?? "person it names").join(" or ")}. Add them to "Who can be in this application" on its Forms tab first.`);
      if (line.attachMode === "ANSWER_CONDITIONAL") {
        const docSupplied = new Set((reqsOf.get(id) ?? []).filter((r) => r.status !== "RETIRED").flatMap((r) => supplies.get(r.documentTypeKey) ?? []));
        const unasked = condFields.filter((f) => !libraryAsked.has(f) && !docSupplied.has(f));
        // m3: a fact with no meaning in the library is named as "a fact not in the library", never by its system name.
        if (unasked.length) return row("CANNOT_FACT", `Its "only if" needs the answer to ${unasked.map((f) => (meanings.has(f) ? `"${meanings.get(f)}"` : "a fact that is not in the library")).join(" and ")}. Nothing in this combination gives that answer: no question in the library asks it, and none of its documents supplies it. Add a question for it to the library first.`);
      }
      return waits ? row("WAITS", WAITS_WORDS) : row("WILL_ADD", restoreWords);
    });
    const n = (f: (t: PreviewTarget) => boolean) => targets.filter(f).length;
    return {
      src, source: line,
      line: { kind: line.kind, key: line.key, words: line.words, from: trails(src).join(" › ") },
      op: b.op, targets,
      counts: { tickable: n((t) => t.outcome === "WILL_ADD" || t.outcome === "WILL_REMOVE"), waits: n((t) => t.outcome === "WAITS"), cannot: n((t) => t.outcome.startsWith("CANNOT")), nothing: n((t) => ["ALREADY_HAS", "HAS_OTHER_CONDITION", "DOES_NOT_HAVE", "REMOVED_IN_DRAFT", "SOURCE"].includes(t.outcome)) },
    };
  }

  /** POST /lines/bulk (slice b, BR-C2, BR-C3): the ticked combinations get the line (or lose it) in one transaction under
   *  one batch. Every ticked row is checked again with the preview's rules inside the transaction; if one no longer may
   *  change (someone changed it after the preview), nothing is written and the row is named. A retried request with the
   *  same key answers what the first one did and changes nothing twice. */
  async apply(actor: Actor, body: unknown): Promise<ApplyResult> {
    need(actor, "author");
    const parsed = BulkApply.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), 400);
    const b = parsed.data;
    const include = [...new Set(b.include)];
    if (include.some((id) => !b.combinationIds.includes(id))) throw problem(400, "Not previewed", "A ticked combination is not one of those you previewed. Preview again.", { errors: [{ field: "include", message: "Preview again." }] });
    const prior = await this.db.lineBatch.findUnique({ where: { idempotencyKey: b.idempotencyKey } });
    if (prior) return this.replay(prior, actor, b);
    // attachNow's two refusals the preview does not run (review of #254): a form listed by IRCC with no file at all, and a
    // form whose only file still waits for a second person, are never put on a combination.
    if (b.op === "add" && b.line.kind === "form") {
      const src = await this.db.combination.findUnique({ where: { id: b.line.combinationId }, select: { workspaceId: true } });
      const def = src ? await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId: src.workspaceId, formKey: b.line.key } }, include: { editions: { select: { channel: true, sha256: true } } } }) : null;
      if (src && def) {
        const printed = def.editions.filter((e) => e.channel !== "ONLINE");
        if (!printed.length) throw problem(409, "No file yet", `${def.formKey} is listed by IRCC but has no file in the library yet: upload its PDF in the Form library, or let the form finder download it. Nothing was changed.`);
        if (!(await hasApprovedFile(this.db, src.workspaceId, printed.map((e) => e.sha256).filter((x): x is string => !!x)))) throw problem(409, "Waiting for a person", `${def.formKey} has no edition a combination may use yet: its file waits for a second person on To review. Nothing was changed.`);
      }
    }
    try {
      return await this.db.$transaction(async (tx) => {
        // Two applies on the same combinations run one after the other: the targets' rows are locked in one order.
        await tx.$queryRaw`SELECT id FROM combination WHERE id = ANY(${[...include].sort()}::uuid[]) ORDER BY id FOR UPDATE`;
        // The same key sent twice at once: the second waits on the lock above, then answers the first one's batch.
        const first = await tx.lineBatch.findUnique({ where: { idempotencyKey: b.idempotencyKey } });
        if (first) return this.replay(first, actor, b);
        const pv = await this.evaluate(tx, b);
        const ticked = include.map((id) => pv.targets.find((t) => t.combinationId === id)!);
        const stale = ticked.filter((t) => !t.tickable);
        if (stale.length) throw problem(409, "Changed since the preview", `${stale.map((t) => `${t.trail.at(-1)}: ${OUTCOME_WORDS[t.outcome].toLowerCase()}${t.reason ? ` (${t.reason})` : ""}`).join("; ")}. Nothing was changed. Preview again.`, { targets: stale });
        const ws = pv.src.workspaceId, line = pv.source, from = pv.line.from;
        const batchId = randomUUID();
        const labels = new Map((await tx.combination.findMany({ where: { id: { in: include } }, select: { id: true, label: true } })).map((c) => [c.id, c.label]));
        const recorded: BatchTarget[] = [];
        for (const id of include) recorded.push({ combinationId: id, label: labels.get(id) ?? id, short: line.short, typeKey: line.typeKey, ...(await this.write(tx, actor, ws, id, b.op, line, from, batchId)) });
        await tx.lineBatch.create({ data: { id: batchId, workspaceId: ws, idempotencyKey: b.idempotencyKey, actor: actor.id, op: b.op, kind: line.kind, lineKey: line.key, sourceCombinationId: pv.src.id, targets: JSON.parse(JSON.stringify(recorded)) as Prisma.InputJsonValue } });
        const audit = new Audit(tx as unknown as Db), verb = b.op === "add" ? "copied" : "removed";
        for (const t of recorded) await audit.log(ws, actor.id, b.op === "add" ? "created" : "retired", line.kind === "form" ? "form" : "document requirement", t.keys.join(", ").slice(0, 120), `${actor.name} ${verb} ${line.short} ${b.op === "add" ? `to "${t.label}" from ${from}` : `from "${t.label}"`} (draft; one batch of ${recorded.length})`, { batchId }, t.combinationId);
        await audit.log(ws, actor.id, b.op === "add" ? "created" : "retired", "line batch", `bulk:${batchId}`, `${actor.name} ${verb} ${line.short} ${b.op === "add" ? "to" : "from"} ${recorded.length} combination${recorded.length === 1 ? "" : "s"} in one batch`, { batchId, targets: include });
        return { batchId, op: b.op, changed: ticked.map((t) => ({ combinationId: t.combinationId, trail: t.trail })), message: appliedWords(line.short, b.op, ticked.length), replayed: false };
      }, { timeout: 60_000, maxWait: 10_000 });
    } catch (e) {
      // The same key sent twice at once: the second one's insert meets the first one's batch, and answers it.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const first = await this.db.lineBatch.findUnique({ where: { idempotencyKey: b.idempotencyKey } });
        if (first) return this.replay(first, actor, b);
      }
      throw e;
    }
  }

  /** One target's write (BR-C2), through the same helpers as a single change, recorded for the combination's own Undo. */
  private async write(tx: Tx, actor: Actor, ws: string, id: string, op: "add" | "remove", line: SourceLine, from: string, batchId: string): Promise<Pick<BatchTarget, "keys" | "before" | "after">> {
    const changed = () => problem(409, "Changed since the preview", "One of the ticked combinations changed while this was being saved. Nothing was changed. Preview again.");
    if (line.kind === "form") {
      const key = line.key, before = await snapshotLines(tx, id, [key]);
      if (op === "add") {
        const def = await tx.govFormDef.findUniqueOrThrow({ where: { workspaceId_formKey: { workspaceId: ws, formKey: key } }, select: { id: true } });
        const r = await addFormLine(tx, { workspaceId: ws, combinationId: id, govFormDefId: def.id, formKey: key, who: line.who, origin: "HUMAN", by: actor.id, sourceQuote: `Copied from ${from}`, attachMode: line.attachMode as "COMBINATION_MANDATORY" | "ANSWER_CONDITIONAL", conditionPlain: line.conditionPlain });
        if (r === "already") throw changed();
        // A new line takes the rest of the source line's settings; a removed line that comes back keeps its own (addFormLine).
        if (!before.length) await tx.combinationForm.updateMany({ where: { combinationId: id, lineageKey: key, version: 1, status: "DRAFT" }, data: { predicateJson: (line.predicateJson ?? Prisma.DbNull) as Prisma.InputJsonValue, ...line.copied } });
        await recordAction(tx, { workspaceId: ws, combinationId: id, action: "attach", codes: [key], before, by: actor.id, batchId });
      } else {
        // As a single removal (studio.ts saveForm): a draft changes in place, a released line gets a removing draft version.
        const { row } = await revise(tx.combinationForm, before, { status: "RETIRED", origin: "HUMAN" }, actor.id, strip);
        await tx.combinationForm.update({ where: { id: row.id }, data: { status: "RETIRED" } });
        await recordAction(tx, { workspaceId: ws, combinationId: id, action: "remove", codes: [key], before, by: actor.id, batchId });
      }
      const after = await snapshotLines(tx, id, [key]);
      return { keys: [key], before, after: after.map((r) => ({ id: r.id, status: r.status, version: r.version, sig: lineSig(r) })) };
    }
    // Document lines: matched on the document type and whose it is, on each line's newest version (as the preview).
    const all = await tx.documentRequirement.findMany({ where: { combinationId: id } });
    let keys: string[];
    if (op === "add") {
      let key = `${line.typeKey}:${line.who}`;
      if (all.some((r) => r.lineageKey === key)) key = `${key}:${Date.now().toString(36)}${randomUUID().slice(0, 4)}`;
      await tx.documentRequirement.create({ data: { workspaceId: ws, combinationId: id, lineageKey: key, documentTypeKey: line.typeKey, appliesToRoles: line.who, attachMode: line.attachMode as "COMBINATION_MANDATORY" | "ANSWER_CONDITIONAL", predicateJson: (line.predicateJson ?? Prisma.DbNull) as Prisma.InputJsonValue, conditionPlain: line.conditionPlain, ...(line.copied as { providedBy: string; isRequired: boolean; alternatives: Prisma.InputJsonValue }), sourceQuote: `Copied from ${from}`.slice(0, 500), version: 1, status: "DRAFT", origin: "HUMAN", updatedBy: actor.id } });
      keys = [key];
    } else {
      keys = [...newestBy(all).values()].filter((r) => r.status !== "RETIRED" && r.documentTypeKey === line.typeKey && r.appliesToRoles === line.who).map((r) => r.lineageKey);
      if (!keys.length) throw changed();
      for (const k of keys) {
        const { row } = await revise(tx.documentRequirement, all.filter((r) => r.lineageKey === k), { status: "RETIRED", origin: "HUMAN" }, actor.id, strip);
        await tx.documentRequirement.update({ where: { id: row.id }, data: { status: "RETIRED" } });
      }
    }
    const before = all.filter((r) => keys.includes(r.lineageKey));
    const after = await tx.documentRequirement.findMany({ where: { combinationId: id, lineageKey: { in: keys } } });
    return { keys, before, after: after.map((r) => ({ id: r.id, status: r.status, version: r.version, sig: docSig(r) })) };
  }

  /** The same key again: the first request's answer, never a second change. Another change under the same key is refused. */
  private async replay(prior: { id: string; actor: string; op: string; kind: string; lineKey: string; sourceCombinationId: string; workspaceId: string; targets: Prisma.JsonValue }, actor: Actor, b: BulkApply): Promise<ApplyResult> {
    if (prior.actor !== actor.id || prior.op !== b.op || prior.kind !== b.line.kind || prior.lineKey !== b.line.key || prior.sourceCombinationId !== b.line.combinationId) throw problem(409, "Key used", "That request key was already used for another change. Reload the page.");
    const targets = prior.targets as unknown as BatchTarget[];
    const trails = await this.trails(this.db, prior.workspaceId);
    const combos = await this.db.combination.findMany({ where: { id: { in: targets.map((t) => t.combinationId) } }, select: { id: true, label: true, programDefId: true } });
    const short = targets[0]?.short ?? b.line.key;
    return { batchId: prior.id, op: b.op, changed: targets.map((t) => { const c = combos.find((x) => x.id === t.combinationId); return { combinationId: t.combinationId, trail: c ? trails(c) : [t.label] }; }), message: appliedWords(short, b.op, targets.length), replayed: true };
  }

  /** POST /lines/bulk/:batchId/undo (BR-C4): every target of the batch goes back to how it was, together, while none of
   *  them has changed since; otherwise nothing is undone and the combination that changed is named. A release made after
   *  the batch is never undone (as the forms Undo, QA-69). Only the person who made the batch undoes it. */
  async undo(actor: Actor, batchId: string): Promise<UndoResult> {
    need(actor, "author");
    const bt = /^[0-9a-f-]{36}$/i.test(batchId) ? await this.db.lineBatch.findUnique({ where: { id: batchId } }) : null;
    if (!bt) throw problem(404, "Not found", "That change is not known (it may have been removed by a reset). Reload the page.");
    if (bt.undoneAt) throw problem(409, "Already undone", `That change was undone by ${nameOf(bt.undoneBy)} at ${hhmm(bt.undoneAt)}.`);
    if (bt.actor !== actor.id) throw problem(403, "Not yours", "Only the person who made this change can undo it.");
    const targets = bt.targets as unknown as BatchTarget[];
    const kind = bt.kind as "form" | "document";
    const ids = targets.map((t) => t.combinationId);
    const label = (id: string) => targets.find((t) => t.combinationId === id)?.label ?? "A combination";
    const released = await this.db.configRelease.findFirst({ where: { combinationId: { in: ids }, releasedAt: { gt: bt.at } }, orderBy: { releasedAt: "asc" } });
    if (released) throw problem(409, "Released since", `${label(released.combinationId)} was released after the change (release ${released.version} at ${hhmm(released.releasedAt)}): a release is never undone. Nothing was undone. Change it in a new draft.`, { combinationId: released.combinationId });
    // Undo never brings back a form or document type that is retired, or whose retire or delete is open (P-116).
    if (bt.op === "remove") {
      if (kind === "form") {
        const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId: bt.workspaceId, formKey: bt.lineKey } }, select: { retiredAt: true } });
        if (def?.retiredAt) throw problem(409, "Retired", `${bt.lineKey} is retired in the library, so this Undo would bring it back: restore it in the library first. Nothing was undone.`);
        const closing = await closingChange(this.db, bt.workspaceId, bt.lineKey);
        if (closing) throw problem(409, "Being retired", `A request to ${closing.action.toLowerCase()} ${bt.lineKey} is open on To review, so this Undo would bring it back. Decide that request first. Nothing was undone.`);
      } else {
        const typeKey = targets[0]?.typeKey;
        const t = typeKey ? await this.db.documentType.findFirst({ where: { workspaceId: bt.workspaceId, documentTypeKey: typeKey }, orderBy: { version: "desc" }, select: { status: true, name: true } }) : null;
        if (t?.status === "RETIRED") throw problem(409, "Retired", `${t.name} is retired in the library, so this Undo would bring it back: restore it there first. Nothing was undone.`);
      }
    }
    await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL lock_timeout = '4s'`;
      try {
        await tx.$queryRaw`SELECT id FROM line_batch WHERE id = ${bt.id}::uuid FOR UPDATE`;
        for (const t of targets) {
          if (kind === "form") await tx.$queryRaw`SELECT id FROM combination_form WHERE combination_id = ${t.combinationId}::uuid AND lineage_key = ANY(${t.keys}) FOR UPDATE`;
          else await tx.$queryRaw`SELECT id FROM document_requirement WHERE combination_id = ${t.combinationId}::uuid AND lineage_key = ANY(${t.keys}) FOR UPDATE`;
        }
      } catch { throw problem(409, "Busy", "These lines are being changed by another request right now. Try again in a moment."); }
      if ((await tx.lineBatch.findUnique({ where: { id: bt.id }, select: { undoneAt: true } }))?.undoneAt) throw problem(409, "Already undone", "That change was undone a moment ago.");
      const now = new Map<string, (LineRow | DocRow)[]>();
      for (const t of targets) now.set(t.combinationId, kind === "form" ? await snapshotLines(tx, t.combinationId, t.keys) : await tx.documentRequirement.findMany({ where: { combinationId: t.combinationId, lineageKey: { in: t.keys } } }));
      for (const t of targets) {
        const rows = now.get(t.combinationId)!;
        const moved = rows.find((r) => { const x = t.after.find((y) => y.id === r.id); return !x || x.status !== r.status || x.version !== r.version || x.sig !== sigOf(kind, r); });
        const gone = t.after.find((x) => !rows.some((r) => r.id === x.id));
        if (!moved && !gone) continue;
        if (moved) {
          const what = `${t.short} ${moved.status === "RETIRED" ? "removed" : moved.status === "PUBLISHED" ? "released" : "changed"}`;
          throw problem(409, "Changed since", undoRefusedWords(t.label, what, nameOf(moved.updatedBy), hhmm(moved.updatedAt)), { combinationId: t.combinationId });
        }
        const own = kind === "form" ? (await tx.formLineAction.findMany({ where: { combinationId: t.combinationId, undoneAt: { not: null } }, orderBy: { undoneAt: "desc" } })).find((a) => (a.detail as { batch_id?: string } | null)?.batch_id === bt.id) : undefined;
        throw problem(409, "Changed since", undoRefusedWords(t.label, own ? "its own Undo on its Forms tab" : "the line was taken out", own ? nameOf(own.undoneBy) : "another person", own?.undoneAt ? hhmm(own.undoneAt) : "an unknown time"), { combinationId: t.combinationId });
      }
      for (const t of targets) {
        const keep = new Set(t.before.map((r) => String(r.id)));
        const drop = now.get(t.combinationId)!.filter((r) => !keep.has(r.id)).map((r) => r.id);
        if (kind === "form") await tx.combinationForm.deleteMany({ where: { id: { in: drop } } });
        else await tx.documentRequirement.deleteMany({ where: { id: { in: drop } } });
        for (const r of t.before) {
          const { updatedAt, id, ...row } = r; void updatedAt;
          const put = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v === null && (k === "predicateJson" || k === "alternatives") ? Prisma.DbNull : v]));
          if (kind === "form") await tx.combinationForm.upsert({ where: { id: String(id) }, update: put as Prisma.CombinationFormUncheckedUpdateInput, create: { id: String(id), ...put } as Prisma.CombinationFormUncheckedCreateInput });
          else await tx.documentRequirement.upsert({ where: { id: String(id) }, update: put as Prisma.DocumentRequirementUncheckedUpdateInput, create: { id: String(id), ...put } as Prisma.DocumentRequirementUncheckedCreateInput });
        }
      }
      await tx.lineBatch.update({ where: { id: bt.id }, data: { undoneAt: new Date(), undoneBy: actor.id } });
      // The combinations' own Undo steps for this batch are spent with it.
      await tx.$executeRaw`UPDATE form_line_action SET undone_at = now(), undone_by = ${actor.id} WHERE combination_id = ANY(${ids}::uuid[]) AND undone_at IS NULL AND detail->>'batch_id' = ${bt.id}`;
      const audit = new Audit(tx as unknown as Db);
      for (const t of targets) await audit.log(bt.workspaceId, actor.id, "undone", kind === "form" ? "form" : "document requirement", t.keys.join(", ").slice(0, 120), `${actor.name} undid the ${bt.op === "add" ? "copy" : "removal"} of ${t.short} on "${t.label}" (one batch of ${targets.length})`, { batchId: bt.id }, t.combinationId);
    });
    const trails = await this.trails(this.db, bt.workspaceId);
    const combos = await this.db.combination.findMany({ where: { id: { in: ids } }, select: { id: true, label: true, programDefId: true } });
    const n = targets.length;
    return { batchId: bt.id, undone: targets.map((t) => { const c = combos.find((x) => x.id === t.combinationId); return { combinationId: t.combinationId, trail: c ? trails(c) : [t.label] }; }), message: `Undone: ${n} combination${n === 1 ? " is" : "s are"} back as before the ${bt.op === "add" ? "copy" : "removal"}.` };
  }

  private async sourceLine(db: Tx, src: { id: string; label: string; workspaceId: string }, kind: "form" | "document", key: string): Promise<SourceLine> {
    const gone = () => problem(404, "Not on this combination", `That line is not on "${src.label}" any more. Reload the page.`);
    const when = (r: { attachMode: string; conditionPlain: string | null }) => (r.attachMode === "COMBINATION_MANDATORY" ? "always" : `only if ${r.conditionPlain ?? "its condition"}`);
    if (kind === "form") {
      const r = (await db.combinationForm.findMany({ where: { combinationId: src.id, lineageKey: key }, orderBy: { version: "desc" }, take: 1, include: { form: { select: { formKey: true, displayName: true, formKind: true } } } }))[0];
      if (!r || r.status === "RETIRED") throw gone();
      return { kind, key, typeKey: r.form.formKey, who: r.who, attachMode: r.attachMode, predicateJson: r.predicateJson, conditionPlain: r.conditionPlain, channel: r.channel as Channel, dataForm: r.form.formKind === "data_form", words: `${r.form.formKey} ${r.form.displayName} · for ${WHO_WORDS[r.who] ?? r.who} · ${when(r)}`,
        short: r.form.formKey, copied: { channel: r.channel, signature: r.signature, minAge: r.minAge, signedBy: r.signedBy, copies: r.copies } };
    }
    const r = (await db.documentRequirement.findMany({ where: { combinationId: src.id, lineageKey: key }, orderBy: { version: "desc" }, take: 1 }))[0];
    if (!r || r.status === "RETIRED") throw gone();
    const t = await db.documentType.findFirst({ where: { workspaceId: src.workspaceId, documentTypeKey: r.documentTypeKey }, orderBy: { version: "desc" }, select: { name: true } });
    return { kind, key, typeKey: r.documentTypeKey, who: r.appliesToRoles, attachMode: r.attachMode, predicateJson: r.predicateJson, conditionPlain: r.conditionPlain, words: `${t?.name ?? r.documentTypeKey} · from ${WHO_WORDS[r.appliesToRoles] ?? r.appliesToRoles} · ${when(r)}`,
      short: t?.name ?? r.documentTypeKey, copied: { providedBy: r.providedBy, isRequired: r.isRequired, alternatives: r.alternatives ?? Prisma.DbNull } };
  }

  /** BR-C1 "cannot: retired": nothing new may use a form or document type that is retired, or whose retirement is open (P-116). */
  private async libraryBlock(db: Tx, workspaceId: string, line: SourceLine): Promise<string | null> {
    if (line.kind === "form") {
      const def = await db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: line.key } }, select: { retiredAt: true } });
      if (def?.retiredAt) return `${line.key} is retired in the library: restore it there first.`;
      const closing = await closingChange(db, workspaceId, line.key);
      return closing ? `A request to ${closing.action.toLowerCase()} ${line.key} is open on To review: nothing new may use it until it is decided.` : null;
    }
    const t = await db.documentType.findFirst({ where: { workspaceId, documentTypeKey: line.typeKey }, orderBy: { version: "desc" }, select: { status: true, name: true } });
    if (t?.status === "RETIRED") return `${t.name} is retired in the library: restore it there first.`;
    const closing = await db.libraryChange.findFirst({ where: { workspaceId, kind: "document_type", key: line.typeKey, action: { in: ["RETIRE", "DELETE"] }, status: { in: ["WAITING", "APPROVED"] } } });
    return closing ? `A request to ${closing.action.toLowerCase()} ${t?.name ?? line.typeKey} is open on To review: nothing new may use it until it is decided.` : null;
  }

  /** Every combination's trail by names, pathway first, from one read of the structure. */
  private async trails(db: Tx, workspaceId: string) {
    const nodes = await db.programDef.findMany({ where: { workspaceId }, select: { id: true, programNodeKey: true, parentNodeKey: true, label: true } });
    const byKey = new Map(nodes.map((n) => [n.programNodeKey, n])), byId = new Map(nodes.map((n) => [n.id, n]));
    return (c: { programDefId: string; label: string }) => {
      const t: string[] = [];
      for (let n = byId.get(c.programDefId); n; n = n.parentNodeKey ? byKey.get(n.parentNodeKey) : undefined) t.unshift(n.label);
      return t.length ? t : [c.label];
    };
  }
}

@Controller("api")
export class LinesBulkController {
  constructor(@Inject(LinesBulk) private readonly s: LinesBulk) {}
  @Post("lines/bulk/preview") @HttpCode(200) preview(@Headers("x-actor") a: H, @Body() b: unknown) { return this.s.preview(actorOf(a), b); }
  @Post("lines/bulk") @HttpCode(200) apply(@Headers("x-actor") a: H, @Body() b: unknown) { return this.s.apply(actorOf(a), b); }
  @Post("lines/bulk/:batchId/undo") @HttpCode(200) undo(@Headers("x-actor") a: H, @Param("batchId") id: string) { return this.s.undo(actorOf(a), id); }
}
