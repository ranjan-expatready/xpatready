// X2b slice (a) (C1.5, concept v3 §3 BR-C1, board design/draft-x2b-board.html): before one form or document line is added
// to, or removed from, many combinations, say what will happen in each, with the reason. Nothing is written here; the
// apply (slice b) re-checks every target with the same rules. Rules only, US$0. Founder 31 Oct (#167): form and
// document lines first; links between combinations stay on the case (P-106).
import { Body, Controller, Headers, HttpCode, HttpException, Inject, Injectable, Post } from "@nestjs/common";
import { acceptsOf, allowedChannels, notAcceptedWords, notNeededWords } from "../../engine/channels.ts";
import { rolesNamedBy } from "../../engine/people.ts";
import { CHANNEL_WORDS, type Channel } from "../../contracts/forms.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { BulkPreview, TICKABLE, WAITS_REMOVE_WORDS, WAITS_WORDS, WHO_WORDS, type Outcome, type PreviewResult, type PreviewTarget } from "../../contracts/lines-bulk.ts";
import { actorOf, Db, need, type Actor } from "./core.ts";
import { closingChange } from "./form-uses.ts";

type H = string | undefined;
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
type SourceLine = { kind: "form" | "document"; key: string; typeKey: string; who: string; attachMode: string; predicateJson: unknown; conditionPlain: string | null; channel?: Channel; dataForm?: boolean; words: string };

@Injectable()
export class LinesBulk {
  constructor(@Inject(Db) private readonly db: Db) {}

  /** POST /lines/bulk/preview: one row per chosen combination, with its trail, outcome and reason (BR-C1). */
  async preview(actor: Actor, body: unknown): Promise<PreviewResult> {
    need(actor, "author");
    const parsed = BulkPreview.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), 400);
    const b = parsed.data;
    const src = await this.db.combination.findUnique({ where: { id: b.line.combinationId } });
    if (!src) throw problem(404, "Not found", "The combination the line comes from does not exist (it may have been removed by a reset).");
    const line = await this.sourceLine(src, b.line.kind, b.line.key);
    const ids = [...new Set(b.combinationIds)];
    const combos = await this.db.combination.findMany({ where: { id: { in: ids }, workspaceId: src.workspaceId } });
    if (combos.length !== ids.length) throw problem(404, "Not found", "One of the chosen combinations does not exist any more. Reload the page.", { errors: [{ field: "combinationIds", message: "Reload the page." }] });
    const trails = await this.trails(src.workspaceId);
    const libraryBlock = b.op === "add" ? await this.libraryBlock(src.workspaceId, line) : null;
    const accepts = b.op === "add" && line.kind === "form" && line.dataForm ? (await acceptsOf(this.db, src.workspaceId)).get(line.key) : undefined;
    const live = combos.filter((c) => !c.retiredAt && c.id !== src.id).map((c) => c.id);
    // QA-94: a fact is named by its meaning in the library, never by its system name.
    const condFields = fieldsOf(line.attachMode === "ANSWER_CONDITIONAL" ? line.predicateJson : null);
    const meanings = new Map((condFields.length ? await this.db.canonicalField.findMany({ where: { workspaceId: src.workspaceId, canonicalFieldKey: { in: condFields } }, orderBy: { version: "asc" }, select: { canonicalFieldKey: true, meaning: true } }) : []).map((f) => [f.canonicalFieldKey, f.meaning] as [string, string]));
    // Review M1: a condition pulls its library question into a combination's snapshot (engine/snapshot.ts "used"), so a
    // fact counts as asked when the library has a question for it, a document of that combination supplies it, or it is
    // derived (the reachability reading of engine/validate.ts). Read once for all targets (m4: no snapshot per target).
    const libraryAsked = new Set<string>(condFields.length ? [
      ...(await this.db.sectionQuestion.findMany({ where: { workspaceId: src.workspaceId, canonicalFieldKey: { in: condFields }, status: { not: "RETIRED" } }, select: { canonicalFieldKey: true } })).map((q) => q.canonicalFieldKey),
      ...(await this.db.derivedField.findMany({ where: { workspaceId: src.workspaceId, derivedKey: { in: condFields } }, select: { derivedKey: true } })).map((d) => d.derivedKey),
    ] : []);
    const supplies = new Map((condFields.length ? await this.db.documentType.findMany({ where: { workspaceId: src.workspaceId, suppliesFacts: { hasSome: condFields } }, select: { documentTypeKey: true, suppliesFacts: true } }) : []).map((t) => [t.documentTypeKey, t.suppliesFacts]));
    const [forms, reqs, subs] = await Promise.all([
      line.kind === "form" ? this.db.combinationForm.findMany({ where: { combinationId: { in: live }, lineageKey: line.key } }) : Promise.resolve([]),
      // Review M2: every document line of the targets, so the newest version of each is taken before matching (a draft may
      // change whose it is, or its type, under the same line key).
      line.kind === "document" || supplies.size ? this.db.documentRequirement.findMany({ where: { combinationId: { in: live } } }) : Promise.resolve([]),
      this.db.reviewSubmission.findMany({ where: { combinationId: { in: live } }, orderBy: { submittedAt: "desc" }, select: { combinationId: true, status: true } }),
    ]);
    const supersededIds = [...forms, ...reqs].map((r) => r.supersedesId).filter((x): x is string => !!x);
    const before = new Map<string, { status: string; attachMode: string; predicateJson: unknown; conditionPlain: string | null }>([
      ...(line.kind === "form" ? await this.db.combinationForm.findMany({ where: { id: { in: supersededIds } }, select: { id: true, status: true, attachMode: true, predicateJson: true, conditionPlain: true } }) : await this.db.documentRequirement.findMany({ where: { id: { in: supersededIds } }, select: { id: true, status: true, attachMode: true, predicateJson: true, conditionPlain: true } })).map((r) => [r.id, r] as [string, typeof r]),
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
        if (unasked.length) return row("CANNOT_FACT", `Its "only if" reads ${unasked.map((f) => (meanings.has(f) ? `"${meanings.get(f)}"` : "a fact that is not in the library")).join(" and ")}, which nobody can be asked in this combination: no question in the library asks it and none of its documents supplies it. Add that question to the library first.`);
      }
      return waits ? row("WAITS", WAITS_WORDS) : row("WILL_ADD", restoreWords);
    });
    const n = (f: (t: PreviewTarget) => boolean) => targets.filter(f).length;
    return {
      line: { kind: line.kind, key: line.key, words: line.words, from: trails(src).join(" › ") },
      op: b.op, targets,
      counts: { tickable: n((t) => t.outcome === "WILL_ADD" || t.outcome === "WILL_REMOVE"), waits: n((t) => t.outcome === "WAITS"), cannot: n((t) => t.outcome.startsWith("CANNOT")), nothing: n((t) => ["ALREADY_HAS", "HAS_OTHER_CONDITION", "DOES_NOT_HAVE", "REMOVED_IN_DRAFT", "SOURCE"].includes(t.outcome)) },
    };
  }

  private async sourceLine(src: { id: string; label: string; workspaceId: string }, kind: "form" | "document", key: string): Promise<SourceLine> {
    const gone = () => problem(404, "Not on this combination", `That line is not on "${src.label}" any more. Reload the page.`);
    const when = (r: { attachMode: string; conditionPlain: string | null }) => (r.attachMode === "COMBINATION_MANDATORY" ? "always" : `only if ${r.conditionPlain ?? "its condition"}`);
    if (kind === "form") {
      const r = (await this.db.combinationForm.findMany({ where: { combinationId: src.id, lineageKey: key }, orderBy: { version: "desc" }, take: 1, include: { form: { select: { formKey: true, displayName: true, formKind: true } } } }))[0];
      if (!r || r.status === "RETIRED") throw gone();
      return { kind, key, typeKey: r.form.formKey, who: r.who, attachMode: r.attachMode, predicateJson: r.predicateJson, conditionPlain: r.conditionPlain, channel: r.channel as Channel, dataForm: r.form.formKind === "data_form", words: `${r.form.formKey} ${r.form.displayName} · for ${WHO_WORDS[r.who] ?? r.who} · ${when(r)}` };
    }
    const r = (await this.db.documentRequirement.findMany({ where: { combinationId: src.id, lineageKey: key }, orderBy: { version: "desc" }, take: 1 }))[0];
    if (!r || r.status === "RETIRED") throw gone();
    const t = await this.db.documentType.findFirst({ where: { workspaceId: src.workspaceId, documentTypeKey: r.documentTypeKey }, orderBy: { version: "desc" }, select: { name: true } });
    return { kind, key, typeKey: r.documentTypeKey, who: r.appliesToRoles, attachMode: r.attachMode, predicateJson: r.predicateJson, conditionPlain: r.conditionPlain, words: `${t?.name ?? r.documentTypeKey} · from ${WHO_WORDS[r.appliesToRoles] ?? r.appliesToRoles} · ${when(r)}` };
  }

  /** BR-C1 "cannot: retired": nothing new may use a form or document type that is retired, or whose retirement is open (P-116). */
  private async libraryBlock(workspaceId: string, line: SourceLine): Promise<string | null> {
    if (line.kind === "form") {
      const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: line.key } }, select: { retiredAt: true } });
      if (def?.retiredAt) return `${line.key} is retired in the library: restore it there first.`;
      const closing = await closingChange(this.db, workspaceId, line.key);
      return closing ? `A request to ${closing.action.toLowerCase()} ${line.key} is open on To review: nothing new may use it until it is decided.` : null;
    }
    const t = await this.db.documentType.findFirst({ where: { workspaceId, documentTypeKey: line.typeKey }, orderBy: { version: "desc" }, select: { status: true, name: true } });
    if (t?.status === "RETIRED") return `${t.name} is retired in the library: restore it there first.`;
    const closing = await this.db.libraryChange.findFirst({ where: { workspaceId, kind: "document_type", key: line.typeKey, action: { in: ["RETIRE", "DELETE"] }, status: { in: ["WAITING", "APPROVED"] } } });
    return closing ? `A request to ${closing.action.toLowerCase()} ${t?.name ?? line.typeKey} is open on To review: nothing new may use it until it is decided.` : null;
  }

  /** Every combination's trail by names, pathway first, from one read of the structure. */
  private async trails(workspaceId: string) {
    const nodes = await this.db.programDef.findMany({ where: { workspaceId }, select: { id: true, programNodeKey: true, parentNodeKey: true, label: true } });
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
}
