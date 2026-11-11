// X2b (C1.5, concept v3 §3, board design/draft-x2b-board.html). Slice (a) BR-C1: before one form or document line is
// added to, or removed from, many combinations, say what will happen in each, with the reason; nothing is written.
// Slice (b) BR-C2 to BR-C4: the apply re-runs the same rules inside one transaction and writes every ticked target under
// one batch (line_batch) with an idempotency key; one Undo takes back the whole batch, or nothing. Rules only, US$0.
// Founder 31 Oct (#167): form and document lines first; links between combinations stay on the case (P-106).
import { Body, Controller, Get, Headers, HttpCode, HttpException, Inject, Injectable, Param, Post, Query } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";
import { acceptsOf, allowedChannels, notAcceptedWords, notNeededWords } from "../../engine/channels.ts";
import { rolesNamedBy } from "../../engine/people.ts";
import { CHANNEL_WORDS, type Channel } from "../../contracts/forms.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { appliedWords, BulkApply, BulkPreview, copiedFromWords, CopyFromApply, CopyFromPreview, LineRef, OUTCOME_WORDS, TICKABLE, undoRefusedWords, UndoMany, WAITS_REMOVE_WORDS, WAITS_WORDS, WHO_WORDS, type ApplyResult, type BulkCombination, type CopyFromApplied, type CopyFromLine, type CopyFromResult, type Outcome, type PreviewResult, type PreviewTarget, type UndoResult } from "../../contracts/lines-bulk.ts";
import { isBusy } from "./busy.ts";
import { ACTORS, actorOf, Audit, Db, need, revise, strip, type Actor } from "./core.ts";
import { addFormLine } from "./form-lines.ts";
import { notFiledWords } from "../../engine/form-type.ts";
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
const docSig = (r: DocRow) => JSON.stringify([r.documentTypeKey, r.attachMode, r.predicateJson, r.conditionPlain, r.appliesToRoles, r.providedBy, r.isRequired, r.position, r.alternatives, r.note, r.sourceQuote, ...(r.waiver ? [r.waiver] : [])]); // M3-S3 review m4: the waiver too
/** Break m1: a short fingerprint of what a source line says, so an apply can tell it changed after the preview. */
const versionOf = (l: SourceLine) => createHash("sha256").update(JSON.stringify([l.kind, l.typeKey, l.who, l.attachMode, l.predicateJson ?? null, l.conditionPlain, l.channel ?? null, l.copied])).digest("hex").slice(0, 16);
const sigOf = (kind: "form" | "document", r: LineRow | DocRow) => (kind === "form" ? lineSig(r as LineRow) : docSig(r as DocRow));

/** C1.5, concept v3 §2 (`POST /combinations/:id/lines/copy`): copy ONE line from another combination onto this one, for a
 *  caller without the dialog (the web app's dialog keeps POST /lines/copy, so this request is the API's own, not a shared
 *  contract). `idempotencyKey`: optional; a retry with the same key answers the first copy. `withdrawSubmission`: a copy
 *  onto a combination waiting for review withdraws that submission, so it is refused unless asked for (the dialog's
 *  "Waits" tick). */
const CopyOneLine = z.object({
  from: LineRef,
  version: z.string().max(64).optional(),
  idempotencyKey: z.string().trim().min(8, "Reload the page: the request key is missing.").max(90, "Reload the page: the request key is not valid.").regex(/^[^#]+$/, "Reload the page: the request key is not valid.").optional(),
  withdrawSubmission: z.boolean().optional(),
});
/** The single copy's answer: its one batch (POST /lines/bulk/:batchId/undo takes it back). */
type CopyOneApplied = CopyFromApplied & { batchId: string };

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
    // Slice (c), tech lead 1 Nov (#273 Question 1): attachNow's two refusals are shown per target, so a "Will be added" row
    // never fails on Add for them.
    const fileBlock = b.op === "add" && line.kind === "form" ? await this.fileBlock(db, src.workspaceId, line.key) : null;
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
      if (fileBlock) return row(fileBlock.outcome, fileBlock.words);
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
      line: { kind: line.kind, key: line.key, words: line.words, from: trails(src).join(" › "), version: versionOf(line) },
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
    const ws0 = (await this.db.combination.findUnique({ where: { id: b.line.combinationId }, select: { workspaceId: true } }))?.workspaceId;
    const byKey = (db: Tx) => (ws0 ? db.lineBatch.findUnique({ where: { workspaceId_idempotencyKey: { workspaceId: ws0, idempotencyKey: b.idempotencyKey } } }) : Promise.resolve(null));
    const prior = await byKey(this.db);
    if (prior) return this.replay(prior, actor, b);
    // attachNow's two refusals the preview does not run (review of #254): a form listed by IRCC with no file at all, and a
    // form whose only file still waits for a second person, are never put on a combination.
    if (b.op === "add" && b.line.kind === "form" && ws0) {
      const fb = await this.fileBlock(this.db, ws0, b.line.key);
      if (fb) throw problem(409, fb.outcome === "CANNOT_NO_FILE" ? "No file yet" : "Waiting for a person", `${fb.words} Nothing was changed.`);
    }
    try {
      return await this.db.$transaction(async (tx) => {
        // Two applies on the same combinations run one after the other: the targets' rows are locked in one order.
        // Review M2: NO KEY UPDATE, so a single Add on one of these combinations (whose new line's foreign key takes a key
        // share lock on the combination row) is not blocked into a deadlock; two bulk applies still queue on each other.
        await tx.$executeRaw`SET LOCAL lock_timeout = '10s'`;
        await tx.$queryRaw`SELECT id FROM combination WHERE id = ANY(${[...include].sort()}::uuid[]) ORDER BY id FOR NO KEY UPDATE`;
        // The same key sent twice at once: the second waits on the lock above, then answers the first one's batch.
        const first = await byKey(tx);
        if (first) return this.replay(first, actor, b);
        return await this.applyIn(tx, actor, b, include, "target");
      }, { timeout: 60_000, maxWait: 10_000 });
    } catch (e) {
      // The same key sent twice at once: the second one's insert meets the first one's batch, and answers it.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const first = await byKey(this.db);
        if (first) return this.replay(first, actor, b);
      }
      // Review M2, m4: a deadlock, a lock wait, a write conflict or a line another request wrote at the same moment is
      // answered in words, never a 500; nothing was written (the transaction rolled back). Re-review nit: only those
      // (api/src/busy.ts); any other fault stays a server error.
      if (isBusy(e))
        throw problem(409, "Busy", "These combinations were being changed by another request at the same moment. Nothing was changed. Preview again, then try once more.");
      throw e;
    }
  }

  /** One line's apply inside the caller's transaction, the targets already locked (BR-C2, BR-C3): the preview's rules again,
   *  then every ticked target written under one batch. `name`: whom a refusal names (the combination, or for a copy from
   *  another combination, the line). */
  private async applyIn(tx: Tx, actor: Actor, b: BulkApply, include: string[], name: "target" | "line"): Promise<ApplyResult> {
    const pv = await this.evaluate(tx, b);
    // Break m1 (#281): the source line changed after the preview (its who, "only if", channel or other settings): what was
    // previewed is not what would be written.
    if (b.sourceVersion && b.sourceVersion !== versionOf(pv.source)) throw problem(409, "Changed since the preview", `${pv.source.short} was changed in ${pv.line.from} after the preview. Nothing was changed. Preview again.`);
    const ticked = include.map((id) => pv.targets.find((t) => t.combinationId === id)!);
    const stale = ticked.filter((t) => !t.tickable);
    if (stale.length) throw problem(409, "Changed since the preview", `${stale.map((t) => `${name === "line" ? pv.source.short : t.trail.at(-1)}: ${OUTCOME_WORDS[t.outcome].toLowerCase()}${t.reason ? ` (${t.reason})` : ""}`).join("; ")}. Nothing was changed. Preview again.`, { targets: stale });
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
        // Review M1: the line written is the source's line, as the preview checked it. A released line that comes back
        // (its draft's removal taken back) stays as released, which the preview says; any other line addFormLine wrote
        // (new, a draft-only line flipped back, or a new version after a released removal) is a draft and takes the source's
        // settings whole.
        const top = (await tx.combinationForm.findMany({ where: { combinationId: id, lineageKey: key }, orderBy: { version: "desc" }, take: 1 }))[0];
        if (top?.status === "DRAFT") await tx.combinationForm.update({ where: { id: top.id }, data: { who: line.who, attachMode: line.attachMode as "COMBINATION_MANDATORY" | "ANSWER_CONDITIONAL", predicateJson: (line.predicateJson ?? Prisma.DbNull) as Prisma.InputJsonValue, conditionPlain: line.conditionPlain, sourceQuote: `Copied from ${from}`.slice(0, 500), origin: "HUMAN", finderBatchId: null, updatedBy: actor.id, ...line.copied } });
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
      await tx.documentRequirement.create({ data: { workspaceId: ws, combinationId: id, lineageKey: key, documentTypeKey: line.typeKey, appliesToRoles: line.who, attachMode: line.attachMode as "COMBINATION_MANDATORY" | "ANSWER_CONDITIONAL", predicateJson: (line.predicateJson ?? Prisma.DbNull) as Prisma.InputJsonValue, conditionPlain: line.conditionPlain, ...(line.copied as { providedBy: string; isRequired: boolean; alternatives: Prisma.InputJsonValue; waiver?: string }), sourceQuote: `Copied from ${from}`.slice(0, 500), version: 1, status: "DRAFT", origin: "HUMAN", updatedBy: actor.id } });
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
  private async replay(prior: { id: string; actor: string; undoneAt: Date | null; undoneBy: string | null; op: string; kind: string; lineKey: string; sourceCombinationId: string; workspaceId: string; targets: Prisma.JsonValue }, actor: Actor, b: BulkApply): Promise<ApplyResult> {
    const targets = prior.targets as unknown as BatchTarget[];
    // Break m3: the same key with other ticked combinations is another change, not a retry.
    const sameTargets = [...new Set(b.include)].sort().join() === targets.map((t) => t.combinationId).sort().join();
    if (prior.actor !== actor.id || prior.op !== b.op || prior.kind !== b.line.kind || prior.lineKey !== b.line.key || prior.sourceCombinationId !== b.line.combinationId || !sameTargets) throw problem(409, "Key used", "That request key was already used for another change. Reload the page.");
    const trails = await this.trails(this.db, prior.workspaceId);
    const combos = await this.db.combination.findMany({ where: { id: { in: targets.map((t) => t.combinationId) } }, select: { id: true, label: true, programDefId: true } });
    const short = targets[0]?.short ?? b.line.key;
    return { batchId: prior.id, op: b.op, changed: targets.map((t) => { const c = combos.find((x) => x.id === t.combinationId); return { combinationId: t.combinationId, trail: c ? trails(c) : [t.label] }; }), message: prior.undoneAt ? `${appliedWords(short, b.op, targets.length).replace(/\.$/, "")}, and undone by ${nameOf(prior.undoneBy)} at ${hhmm(prior.undoneAt)}. Nothing changed now.` : appliedWords(short, b.op, targets.length), replayed: true };
  }

  /** POST /lines/bulk/:batchId/undo (BR-C4): every target of the batch goes back to how it was, together, while none of
   *  them has changed since; otherwise nothing is undone and the combination that changed is named. A release made after
   *  the batch is never undone (as the forms Undo, QA-69). Only the person who made the batch undoes it. */
  async undo(actor: Actor, batchId: string): Promise<UndoResult> {
    need(actor, "author");
    const bt = await this.undoable(actor, batchId);
    const targets = bt.targets as unknown as BatchTarget[];
    const ids = targets.map((t) => t.combinationId);
    await this.db.$transaction((tx) => this.undoIn(tx, actor, bt), { timeout: 60_000, maxWait: 10_000 });
    const trails = await this.trails(this.db, bt.workspaceId);
    const combos = await this.db.combination.findMany({ where: { id: { in: ids } }, select: { id: true, label: true, programDefId: true } });
    const n = targets.length;
    return { batchId: bt.id, undone: targets.map((t) => { const c = combos.find((x) => x.id === t.combinationId); return { combinationId: t.combinationId, trail: c ? trails(c) : [t.label] }; }), message: `Undone: ${n} combination${n === 1 ? " is" : "s are"} back as before the ${bt.op === "add" ? "copy" : "removal"}.` };
  }


  /** The batch, if it is known, not undone yet, and this person's (BR-C4). */
  private async undoable(actor: Actor, batchId: string) {
    const bt = /^[0-9a-f-]{36}$/i.test(batchId) ? await this.db.lineBatch.findUnique({ where: { id: batchId } }) : null;
    if (!bt) throw problem(404, "Not found", "That change is not known (it may have been removed by a reset). Reload the page.");
    if (bt.undoneAt) throw problem(409, "Already undone", `That change was undone by ${nameOf(bt.undoneBy)} at ${hhmm(bt.undoneAt)}.`);
    if (bt.actor !== actor.id) throw problem(403, "Not yours", "Only the person who made this change can undo it.");
    return bt;
  }

  /** One batch's Undo inside the caller's transaction: refused, naming the combination, unless every target is as the batch
   *  left it (BR-C4). Thrown refusals roll the whole transaction back, so an Undo of several batches is all or nothing. */
  private async undoIn(tx: Tx, actor: Actor, bt: Prisma.LineBatchGetPayload<object>): Promise<void> {
    const targets = bt.targets as unknown as BatchTarget[];
    const kind = bt.kind as "form" | "document";
    const ids = targets.map((t) => t.combinationId);
    const label = (id: string) => targets.find((t) => t.combinationId === id)?.label ?? "A combination";
    // Break m7: a retired combination is never changed (as everywhere else); restore it on Structure first.
    const retired = await tx.combination.findFirst({ where: { id: { in: ids }, retiredAt: { not: null } }, select: { label: true } });
    if (retired) throw problem(409, "Retired", `"${retired.label}" is retired: nothing in it changes. Restore it on Structure first. Nothing was undone.`);
    const released = await tx.configRelease.findFirst({ where: { combinationId: { in: ids }, releasedAt: { gt: bt.at } }, orderBy: { releasedAt: "asc" } });
    if (released) throw problem(409, "Released since", `${label(released.combinationId)} was released after the change (release ${released.version} at ${hhmm(released.releasedAt)}): a release is never undone. Nothing was undone. Change it in a new draft.`, { combinationId: released.combinationId });
    // Undo never brings back a form or document type that is retired, or whose retire or delete is open (P-116).
    if (bt.op === "remove") {
      if (kind === "form") {
        const def = await tx.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId: bt.workspaceId, formKey: bt.lineKey } }, select: { retiredAt: true } });
        if (def?.retiredAt) throw problem(409, "Retired", `${bt.lineKey} is retired in the library, so this Undo would bring it back: restore it in the library first. Nothing was undone.`);
        const closing = await closingChange(tx, bt.workspaceId, bt.lineKey);
        if (closing) throw problem(409, "Being retired", `A request to ${closing.action.toLowerCase()} ${bt.lineKey} is open on To review, so this Undo would bring it back. Decide that request first. Nothing was undone.`);
      } else {
        const typeKey = targets[0]?.typeKey;
        const t = typeKey ? await tx.documentType.findFirst({ where: { workspaceId: bt.workspaceId, documentTypeKey: typeKey }, orderBy: { version: "desc" }, select: { status: true, name: true } }) : null;
        if (t?.status === "RETIRED") throw problem(409, "Retired", `${t.name} is retired in the library, so this Undo would bring it back: restore it there first. Nothing was undone.`);
      }
    }
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
        throw problem(409, "Changed since", undoRefusedWords(bt.op as "add" | "remove", t.label, what, nameOf(moved.updatedBy), hhmm(moved.updatedAt)), { combinationId: t.combinationId });
      }
      const own = kind === "form" ? (await tx.formLineAction.findMany({ where: { combinationId: t.combinationId, undoneAt: { not: null } }, orderBy: { undoneAt: "desc" } })).find((a) => (a.detail as { batch_id?: string } | null)?.batch_id === bt.id) : undefined;
      throw problem(409, "Changed since", undoRefusedWords(bt.op as "add" | "remove", t.label, own ? "its own Undo on its Forms tab" : "the line was taken out", own ? nameOf(own.undoneBy) : "another person", own?.undoneAt ? hhmm(own.undoneAt) : "an unknown time"), { combinationId: t.combinationId });
    }
    for (const t of targets) {
      const keep = new Set(t.before.map((r) => String(r.id)));
      const drop = now.get(t.combinationId)!.filter((r) => !keep.has(r.id)).map((r) => r.id);
      if (kind === "form") await tx.combinationForm.deleteMany({ where: { id: { in: drop } } });
      else await tx.documentRequirement.deleteMany({ where: { id: { in: drop } } });
      for (const r of t.before) {
        // Break m8: a row that is still exactly as it was (a released or superseded row the batch never touched) is left
        // alone, its save time too.
        const cur = now.get(t.combinationId)!.find((x) => x.id === r.id);
        if (cur && cur.status === r.status && cur.version === r.version && sigOf(kind, cur) === sigOf(kind, r as unknown as LineRow | DocRow)) continue;
        const { updatedAt, id, ...row } = r; void updatedAt;
        const put = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v === null && (k === "predicateJson" || k === "alternatives") ? Prisma.DbNull : v]));
        if (kind === "form") await tx.combinationForm.upsert({ where: { id: String(id) }, update: put as Prisma.CombinationFormUncheckedUpdateInput, create: { id: String(id), ...put } as Prisma.CombinationFormUncheckedCreateInput });
        else await tx.documentRequirement.upsert({ where: { id: String(id) }, update: put as Prisma.DocumentRequirementUncheckedUpdateInput, create: { id: String(id), ...put } as Prisma.DocumentRequirementUncheckedCreateInput });
      }
    }
    await tx.lineBatch.update({ where: { id: bt.id }, data: { undoneAt: new Date(), undoneBy: actor.id } });
    // The combinations' own Undo steps for this batch are spent with it.
    await tx.$executeRaw`UPDATE form_line_action SET undone_at = now(), undone_by = ${actor.id} WHERE combination_id = ANY(${ids}::uuid[]) AND undone_at IS NULL AND detail->>'batch_id' = ${bt.id}`;
    // Break m6: edits made on these lines after the batch that cancelled out (so the Undo was allowed) point at rows the
    // Undo removed; they are spent too, so the combination's own Undo reaches its earlier steps again.
    if (kind === "form") await tx.$executeRaw`UPDATE form_line_action SET undone_at = now(), undone_by = ${actor.id} WHERE combination_id = ANY(${ids}::uuid[]) AND undone_at IS NULL AND at > ${bt.at} AND detail->'codes' ? ${bt.lineKey}`;
    const audit = new Audit(tx as unknown as Db);
    await audit.log(bt.workspaceId, actor.id, "undone", "line batch", `bulk:${bt.id}`, `${actor.name} undid the ${bt.op === "add" ? "copy" : "removal"} of ${targets[0]?.short ?? bt.lineKey} on ${targets.length} combination${targets.length === 1 ? "" : "s"} (one batch)`, { batchId: bt.id, targets: ids });
    for (const t of targets) await audit.log(bt.workspaceId, actor.id, "undone", kind === "form" ? "form" : "document requirement", t.keys.join(", ").slice(0, 120), `${actor.name} undid the ${bt.op === "add" ? "copy" : "removal"} of ${t.short} on "${t.label}" (one batch of ${targets.length})`, { batchId: bt.id }, t.combinationId);
  }

  /** POST /lines/bulk/undo (slice d): the batches of one "Copy a line from another combination" (one per line) are undone
   *  together, or none of them is. */
  async undoMany(actor: Actor, body: unknown): Promise<UndoResult & { batchIds: string[] }> {
    need(actor, "author");
    const parsed = UndoMany.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), 400);
    const ids = [...new Set(parsed.data.batchIds.map((x) => x.toLowerCase()))];
    const bts: Prisma.LineBatchGetPayload<object>[] = [];
    for (const id of ids) bts.push(await this.undoable(actor, id));
    await this.db.$transaction(async (tx) => { for (const bt of bts) await this.undoIn(tx, actor, bt); }, { timeout: 60_000, maxWait: 10_000 });
    const targets = bts.flatMap((bt) => bt.targets as unknown as BatchTarget[]);
    const combos = [...new Set(targets.map((t) => t.label))];
    const shorts = bts.map((bt) => (bt.targets as unknown as BatchTarget[])[0]?.short ?? bt.lineKey);
    const trails = await this.trails(this.db, bts[0].workspaceId);
    const rows = await this.db.combination.findMany({ where: { id: { in: [...new Set(targets.map((t) => t.combinationId))] } }, select: { id: true, label: true, programDefId: true } });
    return { batchId: bts[0].id, batchIds: ids, undone: rows.map((c) => ({ combinationId: c.id, trail: trails(c) })), message: `Undone: ${shorts.length > 3 ? `${shorts.length} lines` : shorts.join(", ")} taken back from ${combos.length > 3 ? `${combos.length} combinations` : combos.join(", ")}. Nothing else changed.` };
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
      short: t?.name ?? r.documentTypeKey, copied: { providedBy: r.providedBy, isRequired: r.isRequired, alternatives: r.alternatives ?? Prisma.DbNull, ...(r.waiver ? { waiver: r.waiver } : {}) } }; // M3-S3 review m4: a waivable line is copied waivable
  }

  /** BR-C1 "cannot: retired": nothing new may use a form or document type that is retired, or whose retirement is open (P-116). */
  private async libraryBlock(db: Tx, workspaceId: string, line: SourceLine): Promise<string | null> {
    if (line.kind === "form") {
      const def = await db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: line.key } }, select: { retiredAt: true, formKind: true, displayName: true } });
      // C11.11 review m1: a guide or checklist line kept from before is never copied as a filed line (addFormLine refuses
      // it at apply), so the preview says so first.
      const notFiled = def ? notFiledWords(line.key, def.formKind, def.displayName) : null;
      if (notFiled) return notFiled;
      if (def?.retiredAt) return `${line.key} is retired in the library: restore it there first.`;
      const closing = await closingChange(db, workspaceId, line.key);
      return closing ? `A request to ${closing.action.toLowerCase()} ${line.key} is open on To review: nothing new may use it until it is decided.` : null;
    }
    const t = await db.documentType.findFirst({ where: { workspaceId, documentTypeKey: line.typeKey }, orderBy: { version: "desc" }, select: { status: true, name: true } });
    if (t?.status === "RETIRED") return `${t.name} is retired in the library: restore it there first.`;
    const closing = await db.libraryChange.findFirst({ where: { workspaceId, kind: "document_type", key: line.typeKey, action: { in: ["RETIRE", "DELETE"] }, status: { in: ["WAITING", "APPROVED"] } } });
    return closing ? `A request to ${closing.action.toLowerCase()} ${t?.name ?? line.typeKey} is open on To review: nothing new may use it until it is decided.` : null;
  }

  /** attachNow's two refusals (review of #254), per target in the preview since slice (c): a form listed by IRCC with no
   *  file at all, and a form whose only printed file still waits for a second person, are never put on a combination. */
  private async fileBlock(db: Tx, workspaceId: string, formKey: string): Promise<{ outcome: "CANNOT_NO_FILE" | "CANNOT_WAITING_PERSON"; words: string } | null> {
    const def = await db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey } }, include: { editions: { select: { channel: true, sha256: true } } } });
    if (!def) return null;
    const printed = def.editions.filter((e) => e.channel !== "ONLINE");
    if (!printed.length) return { outcome: "CANNOT_NO_FILE", words: `${def.formKey} is listed by IRCC but has no file in the library yet: upload its PDF in the Form library, or let the form finder download it.` };
    if (!(await hasApprovedFile(db as unknown as Db, workspaceId, printed.map((e) => e.sha256).filter((x): x is string => !!x)))) return { outcome: "CANNOT_WAITING_PERSON", words: `${def.formKey} has no edition a combination may use yet: its file waits for a second person on To review.` };
    return null;
  }

  /** GET /lines/bulk/combinations?from=<id> (slice c): every other combination of the workspace that is not retired, by
   *  trail, for the preview dialog (and the "copy from" choice). */
  async combinations(actor: Actor, from: string | undefined): Promise<BulkCombination[]> {
    need(actor, "author");
    const src = from && /^[0-9a-f-]{36}$/i.test(from) ? await this.db.combination.findUnique({ where: { id: from }, select: { id: true, workspaceId: true } }) : null;
    if (!src) throw problem(404, "Not found", "This combination does not exist any more. Reload the page.");
    const trails = await this.trails(this.db, src.workspaceId);
    const all = await this.db.combination.findMany({ where: { workspaceId: src.workspaceId, retiredAt: null, id: { not: src.id } }, select: { id: true, label: true, programDefId: true } });
    return all.map((c) => ({ id: c.id, trail: trails(c) })).sort((a, b) => a.trail.join(" › ").localeCompare(b.trail.join(" › ")));
  }

  /** Slice (d): both ends of a copy from another combination, in one workspace, and not the same combination. */
  private async ends(sourceId: string, targetId: string) {
    if (sourceId === targetId) throw problem(400, "Same combination", "Choose another combination to copy from: this is the combination itself.", { errors: [{ field: "sourceId", message: "Choose another combination." }] });
    const [src, tgt] = await Promise.all([sourceId, targetId].map((id) => this.db.combination.findUnique({ where: { id }, select: { id: true, label: true, workspaceId: true, programDefId: true, retiredAt: true } })));
    if (!src || !tgt || src.workspaceId !== tgt.workspaceId) throw problem(404, "Not found", "One of these combinations does not exist any more. Reload the page.");
    // Break m2: a retired combination is not copied from either.
    if (src.retiredAt) throw problem(409, "Retired", `"${src.label}" is retired: its lines are not copied. Restore it on Structure first.`);
    return { src, tgt };
  }

  /** Slice (d): every line of the source, each with what happens in the target (BR-C1, the same rules as the preview). */
  private async copyRows(db: Tx, sourceId: string, targetId: string): Promise<CopyFromLine[]> {
    const live = <T extends { lineageKey: string; version: number; status: string }>(rows: T[]) => [...newestBy(rows).values()].filter((r) => r.status !== "RETIRED");
    const forms = live(await db.combinationForm.findMany({ where: { combinationId: sourceId }, select: { lineageKey: true, version: true, status: true } })).sort((a, b) => a.lineageKey.localeCompare(b.lineageKey));
    const docs = live(await db.documentRequirement.findMany({ where: { combinationId: sourceId }, select: { lineageKey: true, version: true, status: true, position: true } })).sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.lineageKey.localeCompare(b.lineageKey));
    const out: CopyFromLine[] = [];
    for (const [kind, rows] of [["form", forms], ["document", docs]] as const) {
      for (const r of rows) {
        const pv = await this.evaluate(db, { line: { combinationId: sourceId, kind, key: r.lineageKey }, op: "add", combinationIds: [targetId] });
        const t = pv.targets[0];
        out.push({ kind, key: r.lineageKey, version: pv.line.version, short: pv.source.short, words: pv.line.words, outcome: t.outcome, reason: t.reason, tickable: t.tickable });
      }
    }
    return out;
  }

  /** POST /lines/copy/preview (slice d, board "Copy a line from another"): the source's lines with what happens here. Lines
   *  this combination already has (with the same "only if") are not offered. */
  async copyFromPreview(actor: Actor, body: unknown): Promise<CopyFromResult> {
    need(actor, "author");
    const parsed = CopyFromPreview.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), 400);
    const { src, tgt } = await this.ends(parsed.data.sourceId, parsed.data.targetId);
    if (tgt.retiredAt) throw problem(409, "Retired", `"${tgt.label}" is retired: nothing in it changes. Restore it on Structure first.`);
    const rows = await this.copyRows(this.db, src.id, parsed.data.targetId);
    const trails = await this.trails(this.db, src.workspaceId);
    const shown = rows.filter((r) => r.outcome !== "ALREADY_HAS");
    return { source: { id: src.id, trail: trails(src) }, lines: shown, hidden: rows.length - shown.length };
  }

  /** POST /lines/copy (slice d): the ticked lines are added here in one transaction, one batch per line (each with its own
   *  Undo record), answered with every batch so one Undo (POST /lines/bulk/undo) takes them all back. A retried request with
   *  the same key answers what the first one did. */
  async copyFrom(actor: Actor, body: unknown): Promise<CopyFromApplied> {
    need(actor, "author");
    const parsed = CopyFromApply.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), 400);
    const b = parsed.data;
    const { src, tgt } = await this.ends(b.sourceId, b.targetId);
    const lines = [...new Map(b.lines.map((l) => [`${l.kind}|${l.key}`, l])).values()];
    const keys = lines.map((_, i) => `${b.idempotencyKey}#${i + 1}`);
    const trails = await this.trails(this.db, src.workspaceId);
    const from = trails(src).join(" › ");
    const replay = async (db: Tx): Promise<CopyFromApplied | null> => {
      // Break m3: matched exactly on every key this request could have made (at most 100 lines), never by a pattern.
      const prior = await db.lineBatch.findMany({ where: { workspaceId: src.workspaceId, idempotencyKey: { in: Array.from({ length: 100 }, (_, i) => `${b.idempotencyKey}#${i + 1}`) } } });
      if (!prior.length) return null;
      const same = prior.length === lines.length && prior.every((p) => p.actor === actor.id && p.op === "add" && p.sourceCombinationId === src.id && (p.targets as unknown as BatchTarget[]).every((t) => t.combinationId === tgt.id) && lines.some((l, i) => keys[i] === p.idempotencyKey && l.kind === p.kind && l.key === p.lineKey));
      if (!same) throw problem(409, "Key used", "That request key was already used for another change. Reload the page.");
      const ordered = keys.map((k) => prior.find((p) => p.idempotencyKey === k)!);
      return { batchIds: ordered.map((p) => p.id), message: ordered.some((p) => p.undoneAt) ? `${copiedFromWords(lines.length, from).replace(/\.$/, "")}, and undone since. Nothing changed now.` : copiedFromWords(lines.length, from), replayed: true };
    };
    // Break m4: a retry of a copy that was made answers it, even if the combination was retired since.
    const first = await replay(this.db);
    if (first) return first;
    if (tgt.retiredAt) throw problem(409, "Retired", `"${tgt.label}" is retired: nothing in it changes. Restore it on Structure first.`);
    try {
      return await this.db.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '10s'`;
        await tx.$queryRaw`SELECT id FROM combination WHERE id = ${tgt.id}::uuid FOR NO KEY UPDATE`;
        const again = await replay(tx);
        if (again) return again;
        const batchIds: string[] = [];
        for (const [i, l] of lines.entries()) {
          const r = await this.applyIn(tx, actor, { line: { combinationId: src.id, kind: l.kind, key: l.key }, op: "add", combinationIds: [tgt.id], include: [tgt.id], idempotencyKey: keys[i], sourceVersion: l.version }, [tgt.id], "line");
          batchIds.push(r.batchId);
        }
        return { batchIds, message: copiedFromWords(lines.length, from), replayed: false };
      }, { timeout: 60_000, maxWait: 10_000 });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") { const again = await replay(this.db); if (again) return again; }
      if (isBusy(e)) throw problem(409, "Busy", "This combination was being changed by another request at the same moment. Nothing was changed. Try again.");
      throw e;
    }
  }

  /** POST /combinations/:id/lines/copy (C1.5, concept v3 §2): one line from another combination copied onto this one, as a
   *  draft with the same settings (BR-C2), through copyFrom (the same rules, batch, audit and Undo). Without the dialog's
   *  preview, a line that cannot be added here is refused 409 in the preview's words; nothing is written. */
  async copyOne(actor: Actor, targetId: string, body: unknown): Promise<CopyOneApplied> {
    need(actor, "author");
    const parsed = CopyOneLine.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), 400);
    const b = parsed.data;
    const tgt = /^[0-9a-f-]{36}$/i.test(targetId) ? await this.db.combination.findUnique({ where: { id: targetId }, select: { id: true, label: true, workspaceId: true } }) : null;
    if (!tgt) throw problem(404, "Not found", "This combination does not exist any more. Reload the page.");
    if (b.from.combinationId === tgt.id) throw problem(409, "Already here", `This line comes from "${tgt.label}" itself: it is already on this combination. Choose another combination to copy it to. Nothing was changed.`);
    const key = b.idempotencyKey ?? randomUUID();
    // A retry with a key already used answers the first copy (copyFrom's replay), before any rule is re-read.
    const prior = b.idempotencyKey ? await this.db.lineBatch.findUnique({ where: { workspaceId_idempotencyKey: { workspaceId: tgt.workspaceId, idempotencyKey: `${key}#1` } }, select: { id: true } }) : null;
    if (!prior) {
      const pv = await this.evaluate(this.db, { line: b.from, op: "add", combinationIds: [tgt.id] });
      const t = pv.targets[0];
      const why = `${pv.source.short} cannot be copied onto "${tgt.label}": ${OUTCOME_WORDS[t.outcome].toLowerCase()}${t.reason ? ` (${t.reason.replace(/\.$/, "")})` : ""}. Nothing was changed.`;
      if (!t.tickable) throw problem(409, OUTCOME_WORDS[t.outcome], why, { outcome: t.outcome });
      if (t.outcome === "WAITS" && !b.withdrawSubmission) throw problem(409, "Waits for review", `"${tgt.label}" is submitted for review: copying ${pv.source.short} withdraws that submission. Send withdrawSubmission: true to copy it anyway. Nothing was changed.`, { outcome: t.outcome });
    }
    const r = await this.copyFrom(actor, { sourceId: b.from.combinationId, targetId: tgt.id, lines: [{ kind: b.from.kind, key: b.from.key, version: b.version }], idempotencyKey: key });
    return { ...r, batchId: r.batchIds[0] };
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
  @Get("lines/bulk/combinations") combinations(@Headers("x-actor") a: H, @Query("from") from?: string) { return this.s.combinations(actorOf(a), from); }
  @Post("lines/bulk/undo") @HttpCode(200) undoMany(@Headers("x-actor") a: H, @Body() b: unknown) { return this.s.undoMany(actorOf(a), b); }
  @Post("lines/copy/preview") @HttpCode(200) copyFromPreview(@Headers("x-actor") a: H, @Body() b: unknown) { return this.s.copyFromPreview(actorOf(a), b); }
  @Post("lines/copy") @HttpCode(200) copyFrom(@Headers("x-actor") a: H, @Body() b: unknown) { return this.s.copyFrom(actorOf(a), b); }
  @Post("combinations/:id/lines/copy") @HttpCode(200) copyOne(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.copyOne(actorOf(a), id, b); }
  @Post("lines/bulk/:batchId/undo") @HttpCode(200) undo(@Headers("x-actor") a: H, @Param("batchId") id: string) { return this.s.undo(actorOf(a), id); }
}
