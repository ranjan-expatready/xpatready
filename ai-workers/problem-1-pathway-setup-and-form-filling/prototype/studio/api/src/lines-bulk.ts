// X2b slice (a) (C1.5, concept v3 §3 BR-C1, board design/draft-x2b-board.html): before one form or document line is added
// to, or removed from, many combinations, say what will happen in each, with the reason. Nothing is written here; the
// apply (slice b) re-checks every target with the same rules. Rules only, US$0. Founder 31 Oct (#167): form and
// document lines first; links between combinations stay on the case (P-106).
import { Body, Controller, Headers, HttpCode, HttpException, Inject, Injectable, Post } from "@nestjs/common";
import { buildSnapshots } from "../../engine/snapshot.ts";
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
    const snaps = b.op === "add" && fieldsOf(line.attachMode === "ANSWER_CONDITIONAL" ? line.predicateJson : null).length ? await buildSnapshots(this.db, src.workspaceId, live, "draft") : new Map();
    const [forms, reqs, subs] = await Promise.all([
      line.kind === "form" ? this.db.combinationForm.findMany({ where: { combinationId: { in: live }, lineageKey: line.key } }) : Promise.resolve([]),
      line.kind === "document" ? this.db.documentRequirement.findMany({ where: { combinationId: { in: live }, documentTypeKey: line.typeKey, appliesToRoles: line.who } }) : Promise.resolve([]),
      this.db.reviewSubmission.findMany({ where: { combinationId: { in: live } }, orderBy: { submittedAt: "desc" }, select: { combinationId: true, status: true } }),
    ]);
    const supersededIds = [...forms, ...reqs].map((r) => r.supersedesId).filter((x): x is string => !!x);
    const before = new Map<string, string>([
      ...(line.kind === "form" ? await this.db.combinationForm.findMany({ where: { id: { in: supersededIds } }, select: { id: true, status: true } }) : await this.db.documentRequirement.findMany({ where: { id: { in: supersededIds } }, select: { id: true, status: true } })).map((r) => [r.id, r.status] as [string, string]),
    ]);
    const submitted = new Set<string>(); const seen = new Set<string>();
    for (const s of subs) { if (seen.has(s.combinationId)) continue; seen.add(s.combinationId); if (s.status === "SUBMITTED") submitted.add(s.combinationId); }

    const targets: PreviewTarget[] = ids.map((id) => {
      const c = combos.find((x) => x.id === id)!;
      const row = (outcome: Outcome, reason: string | null): PreviewTarget => ({ combinationId: id, trail: trails(c), outcome, reason, tickable: TICKABLE.includes(outcome) });
      if (id === src.id) return row("SOURCE", "The line is copied from this combination.");
      if (c.retiredAt) return row("CANNOT_COMBINATION_RETIRED", `"${c.label}" is retired: nothing in it changes. Restore it on Structure first.`);
      // The target's own line, matched on the form number (forms) or the document type and whose it is (documents).
      const mine = [...newestBy((line.kind === "form" ? forms : reqs).filter((r) => r.combinationId === id)).values()];
      const kept = mine.find((r) => r.status !== "RETIRED");
      const waits = submitted.has(id);
      if (b.op === "remove") {
        if (!kept) {
          const draftRemoval = mine.find((r) => r.status === "RETIRED" && r.supersedesId && before.get(r.supersedesId) === "PUBLISHED");
          return draftRemoval ? row("REMOVED_IN_DRAFT", "Its draft already removes this line; the release takes it out.") : row("DOES_NOT_HAVE", "This combination does not have this line.");
        }
        return waits ? row("WAITS", WAITS_REMOVE_WORDS) : row("WILL_REMOVE", null);
      }
      if (kept) return sameCondition(kept, line) ? row("ALREADY_HAS", "This combination already has this line, with the same \"only if\".")
        : row("HAS_OTHER_CONDITION", `It has this line ${kept.attachMode === "COMBINATION_MANDATORY" ? "always" : `only if ${kept.conditionPlain ?? "its own condition"}`}: its own line is kept. Change it there if it should match.`);
      if (libraryBlock) return row("CANNOT_RETIRED", libraryBlock);
      if (line.kind === "form" && line.dataForm && line.channel) {
        const { channels, record } = allowedChannels(accepts, c.portalKey);
        if (line.channel === "NOT_NEEDED" && !channels.includes("NOT_NEEDED")) return row("CANNOT_CHANNEL", notNeededWords(line.key, c.portalKey));
        if (!channels.includes(line.channel)) return row("CANNOT_CHANNEL", record ? notAcceptedWords(line.key, line.channel, record) : `${line.key} is filed as ${CHANNEL_WORDS[line.channel]}, which is not offered for this combination's IRCC account.`);
      }
      const people = (c.participants as { role: string; label?: string; max: number }[]) ?? [];
      const missing = rolesNamedBy(line.who).filter((r) => !people.some((p) => p.role === r && p.max > 0));
      if (missing.length) return row("CANNOT_PERSON", `The line is for ${WHO_WORDS[line.who] ?? line.who}, and this application has no ${missing.map((r) => ROLE_WORDS[r] ?? r).join(" or ")}. Add them to "Who can be in this application" on its Forms tab first.`);
      if (line.attachMode === "ANSWER_CONDITIONAL") {
        const s = snaps.get(id)?.snapshot;
        const asked = new Set<string>([...(s?.placements ?? []).map((p: { fact: string }) => p.fact), ...((s?.document_types ?? []) as { supplies_facts?: string[] }[]).flatMap((t) => t.supplies_facts ?? []), ...((s?.derived_fields ?? []) as { id: string }[]).map((d) => d.id)]);
        const unasked = fieldsOf(line.predicateJson).filter((f) => !asked.has(f));
        if (unasked.length) return row("CANNOT_FACT", `Its "only if" reads ${unasked.map((f) => `"${meanings.get(f) ?? f}"`).join(" and ")}, which this combination does not ask. Add ${unasked.length > 1 ? "those questions" : "that question"} to it first.`);
      }
      return waits ? row("WAITS", WAITS_WORDS) : row("WILL_ADD", null);
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
