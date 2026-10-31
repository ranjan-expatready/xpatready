// Screen 02 slice 1: "To review" (P-79). One list of what waits for a person, read from the records the other screens
// already keep (no new table): AI proposals, submitted combinations, merges, held files and new editions (portal
// captures and screen maps are parked with the browser extension, W1-02), plus AI work still running. Each item says the one step the asking person can take, or who acts next;
// the endpoint that takes the step checks the same rule again (BR-9).
import { Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Query } from "@nestjs/common";
import { KIND_WORDS, ReviewQueueQuery, type QueueFilter, type QueueItem, type QueueKind, type ReviewQueue } from "../../contracts/review-queue.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { buildSnapshots, effective, type Snapshot } from "../../engine/snapshot.ts";
import { ACTORS, actorOf, Db, Workspace, type Actor } from "./core.ts";
import { Studio } from "./studio.ts";
import { itemsOf, KIND_NOUN, actionWord, unapprovedAdds, unapprovedWhy, acceptsView } from "./library-changes.ts";
import { ON_ITS_PAGE } from "./proposals.ts";
import { groupOf } from "./review-proposals.ts";
import { fillsView } from "./who-fills.ts";
import { normaliseCode } from "../../contracts/form-library.ts";

const nameOf = (id: string | null | undefined) => (id ? ACTORS.find((a) => a.id === id)?.name ?? "A person" : null);
const holds = (a: Actor, duty: string) => (a.duties as readonly string[]).includes(duty);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const ORDER: Record<QueueItem["state"], number> = { needs: 0, waiting: 1, running: 2 };
/** Where a step has no page yet, the row says so instead of linking to a page that cannot take it (board views 5–9). */

@Injectable()
export class ReviewQueueService {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Studio) private readonly studio: Studio) {}

  async list(actor: Actor, query: unknown): Promise<ReviewQueue> {
    const p = ReviewQueueQuery.safeParse(query ?? {});
    if (!p.success) throw new HttpException(problemFromZod(p.error), HttpStatus.BAD_REQUEST);
    const { filter, kind, q, form } = p.data;
    // F2 C2.12 (F3 plan D2, BR-5): under ?form= the list, its counts and its kinds are this form's items only.
    const code = form ? normaliseCode(form) : null;
    const all = (await this.items(actor)).filter((i) => !code || i.forms.includes(code));
    const needle = q?.toLocaleLowerCase("en-CA");
    const found = all.filter((i) => (!kind || i.kind === kind) && (!needle || `${i.title} ${i.what} ${KIND_WORDS[i.kind]}`.toLocaleLowerCase("en-CA").includes(needle)));
    const counts: Record<QueueFilter, number> = { needs: 0, waiting: 0, running: 0, all: found.length };
    for (const i of found) counts[i.state]++;
    const kinds: Partial<Record<QueueKind, number>> = {};
    for (const i of all) kinds[i.kind] = (kinds[i.kind] ?? 0) + 1;
    // Oldest first within each state (board view 1: "Rows are sorted oldest first within Needs you").
    const items = found.filter((i) => filter === "all" || i.state === filter).sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.at.localeCompare(b.at));
    return { items, counts, kinds };
  }

  private async items(actor: Actor): Promise<QueueItem[]> {
    const workspaceId = await this.ws.id();
    const [nodes, combos, jobs, pending, queued, batches, subs, merges, held, changes] = await Promise.all([
      this.db.programDef.findMany({ where: { workspaceId }, select: { id: true, programNodeKey: true, parentNodeKey: true, nodeKind: true, label: true } }),
      this.db.combination.findMany({ where: { workspaceId }, select: { id: true, programDefId: true, label: true } }),
      this.db.draftingJob.findMany({ where: { workspaceId, kind: { in: ["field_map", "reuse_map"] } }, orderBy: { startedAt: "desc" }, select: { id: true, combinationId: true, attachmentId: true, kind: true, mode: true, status: true, costUsd: true, startedBy: true, startedAt: true, finishedAt: true, detail: true } }),
      this.db.proposalItem.groupBy({ by: ["runId"], where: { workspaceId, status: "waiting" }, _count: true }),
      this.db.proposalItem.findMany({ where: { workspaceId, status: "waiting", step: { notIn: [...ON_ITS_PAGE] } }, orderBy: { createdAt: "asc" }, select: { formEdition: true, combinationId: true, runId: true, confidence: true, createdAt: true } }),
      this.db.aiBatch.findMany({ where: { workspaceId, status: { in: ["QUEUED", "RUNNING"] } }, include: { jobs: { select: { status: true, costUsd: true, attachmentId: true } } } }),
      this.db.reviewSubmission.findMany({ where: { workspaceId }, orderBy: { submittedAt: "desc" } }),
      this.db.fieldMerge.findMany({ where: { workspaceId, status: "PROPOSED" } }),
      this.db.intakeItem.findMany({ where: { workspaceId, status: "HELD" } }),
      this.db.libraryChange.findMany({ where: { workspaceId, status: { in: ["WAITING", "RETURNED"] } } }),
    ]);
    const byKey = new Map(nodes.map((n) => [n.programNodeKey, n]));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const pathOf = (programDefId: string) => {
      const out: string[] = [];
      // W1-03 (BR-7): the Pathway's name joins the trail (several Pathways per type).
      for (let n = byId.get(programDefId); n; n = n.parentNodeKey ? byKey.get(n.parentNodeKey) : undefined) out.unshift(n.label);
      return out.join(" › ");
    };
    const combo = new Map(combos.map((c) => [c.id, { label: c.label, path: pathOf(c.programDefId) }]));
    const atts = new Map((await this.db.sourceAttachment.findMany({ where: { id: { in: [...jobs.map((j) => j.attachmentId), ...batches.flatMap((b) => b.jobs.map((j) => j.attachmentId))].filter((x): x is string => !!x) } }, select: { id: true, edition: true, fileName: true } })).map((a) => [a.id, a]));
    const out: QueueItem[] = [];
    // F2 C2.12 (F3 plan D2): which forms each item belongs to, read once for the whole list.
    const codeOf = (label: string | null | undefined) => (label ? normaliseCode(label.split(" (")[0]) : null);
    const lines = await this.db.combinationForm.findMany({ where: { workspaceId, status: { not: "RETIRED" } }, distinct: ["combinationId", "lineageKey"], select: { combinationId: true, lineageKey: true } });
    const formsOfCombination = (id: string | null | undefined) => (id ? [...new Set(lines.filter((l) => l.combinationId === id).map((l) => l.lineageKey))].sort() : []);
    const fieldKeys = [...new Set([...merges.flatMap((m) => [m.keepKey, m.mergeKey]), ...changes.filter((c) => c.kind === "field").map((c) => c.key)])];
    const fieldUse = new Map<string, Set<string>>();
    if (fieldKeys.length) for (const r of await this.db.formFieldMap.findMany({ where: { canonicalFieldKey: { in: fieldKeys }, edition: { workspaceId } }, distinct: ["canonicalFieldKey", "formEditionId"], select: { canonicalFieldKey: true, edition: { select: { form: { select: { formKey: true } } } } } })) {
      const set = fieldUse.get(r.canonicalFieldKey!) ?? new Set<string>(); set.add(r.edition.form.formKey); fieldUse.set(r.canonicalFieldKey!, set);
    }
    const formsOfFields = (keys: string[]) => [...new Set(keys.flatMap((k) => [...(fieldUse.get(k) ?? [])]))].sort();
    const formsOfChange = (c: (typeof changes)[number]) => (c.kind === "library_form" || c.kind === "form_accepts" ? [normaliseCode(c.key)] : c.kind === "field" ? formsOfFields([c.key]) : c.kind === "combination" ? formsOfCombination(c.combinationId ?? c.key) : []);

    // AI proposals: the newest drafting step per source, as the Programs row counts them (programs.ts catalogue).
    const waitingCount = new Map(pending.map((p) => [p.runId, p._count]));
    const newest = new Map<string, (typeof jobs)[number]>();
    for (const j of jobs) if (j.attachmentId && !newest.has(j.attachmentId)) newest.set(j.attachmentId, j);
    for (const j of newest.values()) {
      if (j.kind !== "field_map" || j.status !== "COMPLETED" || j.mode === "STUB") continue;
      const n = waitingCount.get(j.id) ?? 0, c = j.combinationId ? combo.get(j.combinationId) : undefined;
      const a = atts.get(j.attachmentId!), counts = (j.detail as { counts?: Record<string, number> } | null)?.counts;
      const source = (a?.edition ?? a?.fileName ?? "A form").split(" (")[0];
      const what = counts ? `${source}: ${plural(counts.boxes, "form field")}, ${counts.mapped} mapped. ${plural(counts.proposed_fields, "shared field")} proposed: ${counts.reuse} reuse, ${counts.new} new, ${counts.ambiguous} ambiguous, ${counts.conflict} conflicting.` : `${source}: an AI draft to review.`;
      const href = `/c/${j.combinationId}/jobs/${j.id}`;
      const jobForm = codeOf(a?.edition);
      const base = { id: `job:${j.id}`, kind: "ai_proposals" as const, title: c?.path ?? "A combination", by: nameOf(j.startedBy), at: (j.finishedAt ?? j.startedAt).toISOString(), cost_usd: j.costUsd ?? 0, forms: jobForm ? [jobForm] : [] };
      if (n) out.push({ ...base, what: `${what} ${plural(n, "proposal")} still to decide.`, ...(holds(actor, "review") ? { state: "needs" as const, waiting_on: null, next: { label: `Review ${plural(n, "AI proposal")}`, href, note: null } } : { state: "waiting" as const, waiting_on: "A content publisher decides each proposal.", next: null }) });
      else out.push({ ...base, what: `${what} Every proposal is decided.`, ...(holds(actor, "author") ? { state: "needs" as const, waiting_on: null, next: { label: "Add the decisions to the draft", href, note: null } } : { state: "waiting" as const, waiting_on: "The configuration author adds the decisions to the draft.", next: null }) });
    }

    // S6 slice 1b: the review queue, one row per form edition or combination (the field-map step's items keep their
    // row above until its page folds into the queue).
    const qGroups = new Map<string, { title: string; at: Date; n: Record<string, number>; forms: string[] }>();
    for (const r of queued) {
      const fe = codeOf(r.formEdition);
      const id = groupOf(r), g = qGroups.get(id) ?? { title: r.formEdition ?? (r.combinationId ? combo.get(r.combinationId)?.path : null) ?? "Proposals with no form or combination", at: r.createdAt, n: { ready: 0, check: 0, decide: 0 }, forms: fe ? [fe] : formsOfCombination(r.combinationId) };
      g.n[r.confidence] = (g.n[r.confidence] ?? 0) + 1; qGroups.set(id, g);
    }
    for (const [id, g] of qGroups) {
      const total = g.n.ready + g.n.check + g.n.decide, href = `/review/proposals?group=${encodeURIComponent(id)}`;
      const what = `${plural(total, "proposal")} waiting: ${g.n.ready} ready to accept, ${g.n.check} to check, ${g.n.decide} to decide.`;
      out.push({ id: `proposals:${id}`, kind: "proposals", title: g.title, by: null, at: g.at.toISOString(), cost_usd: null, what, forms: g.forms,
        ...(holds(actor, "review") ? { state: "needs" as const, waiting_on: null, next: { label: `Review ${plural(total, "proposal")}`, href, note: null } } : { state: "waiting" as const, waiting_on: "A content publisher decides each proposal.", next: null }) });
    }

    // Combinations waiting for review or release (P-79): the newest submission per combination, through the same gate
    // as both release routes (QA-1), so this list and the Release page say the same thing.
    const latest = new Map<string, (typeof subs)[number]>();
    for (const s of subs) if (!latest.has(s.combinationId)) latest.set(s.combinationId, s);
    const open = [...latest.values()].filter((s) => s.status === "SUBMITTED");
    if (open.length) {
      const snaps = await buildSnapshots(this.db, workspaceId, open.map((s) => s.combinationId), "draft");
      const gates = await this.studio.releaseGates(open.map((s) => ({ combinationId: s.combinationId, sha256: snaps.get(s.combinationId)!.sha256 })));
      for (const s of open) {
        const c = combo.get(s.combinationId), gate = gates.get(s.combinationId)!, mine = s.submittedBy === actor.id;
        const changes = (s.changeSummary as unknown[]).length, href = `/c/${s.combinationId}/review`;
        const base = { id: `submission:${s.id}`, kind: "release" as const, title: c?.path ?? "A combination", by: nameOf(s.submittedBy), at: s.submittedAt.toISOString(), cost_usd: null, forms: formsOfCombination(s.combinationId) };
        // Review Must 1: the same new-field check as both release routes, so "Release" is never offered on a refusal.
        const unapproved = gate.ok ? await unapprovedAdds(this.db, workspaceId, itemsOf((snaps.get(s.combinationId) as { snapshot: Snapshot }).snapshot)) : [];
        if (unapproved.length) out.push({ ...base, what: `Submitted with ${plural(changes, "change")}. Not ready to release: ${unapprovedWhy(unapproved)}.`, state: "waiting" as const, waiting_on: "Its new shared fields are decided on To review first.", next: null });
        else if (gate.ok) out.push({ ...base, what: `Submitted with ${plural(changes, "change")}; every change that needs a sign-off is signed. Ready to release.`, ...(holds(actor, "approve") && !mine ? { state: "needs" as const, waiting_on: null, next: { label: "Release", href, note: null } } : { state: "waiting" as const, waiting_on: mine ? "An approver releases it: not the person who submitted it." : "An approver releases it.", next: null }) });
        else if (/changed after it was submitted/.test(gate.why)) out.push({ ...base, what: `The draft changed after it was submitted. ${gate.why.split(": ")[1] ?? ""}`.trim(), ...(holds(actor, "review") ? { state: "needs" as const, waiting_on: null, next: { label: "Submit again", href, note: null } } : { state: "waiting" as const, waiting_on: "A content publisher submits it again.", next: null }) });
        else out.push({ ...base, what: `Submitted with ${plural(changes, "change")}. ${gate.why}`, ...(holds(actor, "sme") && !mine ? { state: "needs" as const, waiting_on: null, next: { label: "Review and sign", href, note: null } } : { state: "waiting" as const, waiting_on: mine ? "The content reviewer signs it: not the person who submitted it." : "The content reviewer signs the changes that need the SME duty.", next: null }) });
      }
    }

    // Merges proposed for a second person (P-65).
    // Shared fields by name (Screen 04 M1): the key stays under Details.
    const names = new Map((merges.length ? await this.db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: { in: merges.flatMap((m) => [m.keepKey, m.mergeKey]) } }, orderBy: { version: "desc" }, select: { canonicalFieldKey: true, label: true } }) : []).reverse().map((f) => [f.canonicalFieldKey, f.label ?? f.canonicalFieldKey]));
    for (const m of merges) {
      const mine = m.proposedBy === actor.id, gone = names.get(m.mergeKey) ?? m.mergeKey, keep = names.get(m.keepKey) ?? m.keepKey;
      out.push({ id: `merge:${m.id}`, kind: "merge", title: `${gone} → ${keep}`, by: nameOf(m.proposedBy), at: m.proposedAt.toISOString(), cost_usd: null, forms: formsOfFields([m.keepKey, m.mergeKey]),
        what: `Merge two shared fields: "${gone}" goes away and redirects to "${keep}". Reason: ${m.reason}`,
        ...(holds(actor, "review") && !mine ? { state: "needs" as const, waiting_on: null, next: { label: "Approve or reject the merge", href: `/review/merge/${m.id}`, note: null } } : { state: "waiting" as const, waiting_on: mine ? "You proposed it; a different person approves or rejects it." : "A content publisher approves or rejects it.", next: null }) });
    }

    // K1 (review Musts 4, 5): a PDF edition changed in a draft whose form fields still have no decision blocks every
    // combination using its form; the decision page is listed here so nobody has to find it under an applied job.
    const openEditions = await this.db.formFieldMap.findMany({ where: { outcome: "unresolved", status: "DRAFT", edition: { workspaceId, channel: "PDF" } }, distinct: ["formEditionId"], select: { formEditionId: true } });
    for (const { formEditionId } of openEditions) {
      const ed = await this.db.formEdition.findUnique({ where: { id: formEditionId }, select: { id: true, editionLabel: true, capturedOn: true, form: { select: { formKey: true, usedBy: { where: { status: { not: "RETIRED" } }, select: { combinationId: true } } } } } });
      if (!ed) continue;
      const rows = effective(await this.db.formFieldMap.findMany({ where: { formEditionId } }), (m) => m.dataPath, "draft");
      const n = rows.filter((r) => r.outcome === "unresolved" && r.status === "DRAFT").length;
      if (!n) continue;
      const users = ed.form.usedBy.length;
      out.push({ id: `form-fields:${ed.id}`, kind: "form_fields", title: ed.editionLabel, by: null, at: (ed.capturedOn ?? new Date(0)).toISOString(), cost_usd: null, forms: [ed.form.formKey],
        what: `${plural(n, "form field")} with no decision: map each one, mark it "not a fact", or "filled by hand" with a reason. Until then ${users === 1 ? "the combination that uses this form is" : `the ${plural(users, "combination")} that use this form are`} not released.`,
        ...(holds(actor, "review") ? { state: "needs" as const, waiting_on: null, next: { label: `Decide ${plural(n, "form field")}`, href: `/review/form-fields/${ed.id}`, note: null } } : { state: "waiting" as const, waiting_on: "A content publisher decides each form field.", next: null }) });
    }

    // Held files (P-80) and new editions held for impact review (P-32), from the one intake.
    for (const h of held) {
      const where = h.combinationId ? `/c/${h.combinationId}?show=held` : "/library/forms";
      const label = h.editionLabel ?? h.code ?? h.fileName;
      if (h.outcome === "held") {
        const mine = h.createdBy === actor.id;
        // Review Must 6: the second person cannot approve until the uploader records the IRCC page, so that is the
        // uploader's step.
        const noPage = !h.irccPage;
        // Lead 28 Oct (carried should, drift #7): a file whose form code and edition the rules could not read can never be
        // approved (intake cannotApprove), so nobody records its IRCC page: a second person rejects it, as its card says.
        if (!h.code || !h.editionLabel) {
          out.push({ id: `held:${h.id}`, kind: "held_file", title: label, by: nameOf(h.createdBy), at: h.createdAt.toISOString(), cost_usd: null, forms: h.code ? [normaliseCode(h.code)] : [],
            what: "Held: the rules could not read its form number and edition, so it cannot be approved and AI was not called. Upload the official PDF from canada.ca instead.",
            ...(holds(actor, "review") && !mine ? { state: "needs" as const, waiting_on: null, next: { label: "Reject the copy", href: `/review/held/${h.id}`, note: null } }
              : { state: "waiting" as const, waiting_on: mine ? "A different person rejects it; upload the official PDF from canada.ca instead." : "A content publisher rejects it.", next: null }) });
          continue;
        }
        out.push({ id: `held:${h.id}`, kind: "held_file", title: label, by: nameOf(h.createdBy), at: h.createdAt.toISOString(), cost_usd: null, forms: h.code ? [normaliseCode(h.code)] : [],
          what: `Not on the approved source list: not read into the library, attached or sent to AI.${noPage ? " The person who uploaded it records the IRCC page it came from first." : ""}`,
          ...(mine && noPage ? { state: "needs" as const, waiting_on: null, next: { label: "Record the IRCC page", href: `/review/held/${h.id}`, note: null } }
            : noPage ? { state: "waiting" as const, waiting_on: `${nameOf(h.createdBy)} records the IRCC page it came from; then a different person checks it.`, next: null }
            : holds(actor, "review") && !mine ? { state: "needs" as const, waiting_on: null, next: { label: "Check the source", href: `/review/held/${h.id}`, note: null } } : { state: "waiting" as const, waiting_on: mine ? "You uploaded it; a different person checks the source." : "A content publisher checks the source.", next: null }) });
      } else {
        const older = h.outcome === "older_edition_held";
        out.push({ id: `held:${h.id}`, kind: "new_edition", title: label, by: nameOf(h.createdBy), at: h.createdAt.toISOString(), cost_usd: null, forms: h.code ? [normaliseCode(h.code)] : [],
          what: older ? "An older edition than the one in the library: it is not used unless a person decides otherwise." : "A newer edition of a form in the library: nothing changes until a person reviews its impact and releases it.",
          ...(holds(actor, "author") ? { state: "needs" as const, waiting_on: null, next: { label: older ? "See the older edition" : "Review impact", href: older ? where : `/review/edition/${h.id}`, note: null } } : { state: "waiting" as const, waiting_on: "The configuration author reviews it.", next: null }) });
      }
    }

    // Library changes (P-53, Screen 04 B1): a new shared field and later adds, retires and restores, approved by a
    // second person; a returned one goes back to the person who proposed it.
    // S6 slice 1b: what one queue decision landed (two items or more) is approved together, on its batch page.
    const perBatch = new Map<string, typeof changes>();
    for (const c of changes) if (c.batchId && c.status === "WAITING") perBatch.set(c.batchId, [...(perBatch.get(c.batchId) ?? []), c]);
    for (const [batchId, list] of perBatch) {
      if (list.length < 2) { perBatch.delete(batchId); continue; }
      const mine = list.some((c) => c.proposedBy === actor.id || c.appliedBy === actor.id);
      out.push({ id: `change-batch:${batchId}`, kind: "library_change", title: `${plural(list.length, "new library item")} from one review decision`, by: nameOf(list[0].proposedBy), at: list[0].proposedAt.toISOString(), cost_usd: null, forms: [...new Set(list.flatMap(formsOfChange))].sort(),
        what: `${list.slice(0, 3).map((c) => `"${c.label ?? c.key}"`).join(", ")}${list.length > 3 ? ` and ${list.length - 3} more` : ""}: approve or return them together.`,
        ...(holds(actor, "review") && !mine ? { state: "needs" as const, waiting_on: null, next: { label: `Approve or return ${plural(list.length, "item")}`, href: `/review/batch/${batchId}`, note: null } } : { state: "waiting" as const, waiting_on: mine ? "You accepted them; a different person approves or returns them." : "A content publisher approves or returns them.", next: null }) });
    }
    for (const c of changes) {
      if (c.batchId && perBatch.has(c.batchId) && c.status === "WAITING") continue;
      const mine = c.proposedBy === actor.id, word = KIND_NOUN[c.kind] ?? c.kind.replace("_", " ");
      const acc = c.kind === "form_accepts" ? acceptsView(c) : null; // C11.18: plain words, before → after
      const fil = c.kind === "placement_fills" ? fillsView(c) : null; // C4.9 (runtime lane, P-97)
      const what = fil ? `Who fills it, for every combination: ${fil.before} → ${fil.after} (used by ${fil.uses} combination${fil.uses === 1 ? "" : "s"}; goes out with the next release). Reason: ${fil.reason}` : acc ? `What IRCC accepts for ${acc.form}: ${acc.before} → ${acc.after}. ${acc.quote ? `canada.ca: "${acc.quote}"` : `Reason: ${acc.reason}`}` : `${c.action === "ADD" ? `New ${word}` : `${actionWord(c.action, c.kind)} the ${word}`}${c.reason ? `. Reason: ${c.reason}` : ""}${c.aiVerdict ? ` · Advisory check: ${c.aiVerdict}` : ""}`;
      const base = { id: `change:${c.id}`, kind: "library_change" as const, title: c.label ?? c.key, by: nameOf(c.proposedBy), at: c.proposedAt.toISOString(), cost_usd: null, forms: formsOfChange(c) };
      if (c.status === "RETURNED") out.push({ ...base, what: `${what} · Returned by ${nameOf(c.decidedBy)}: ${c.decisionNote}`, ...(mine || holds(actor, "author") ? { state: "needs" as const, waiting_on: null, next: { label: "Correct or withdraw", href: `/review/change/${c.id}`, note: null } } : { state: "waiting" as const, waiting_on: "The person who proposed it, or an author, corrects or withdraws it.", next: null }) });
      else out.push({ ...base, what, ...(holds(actor, "review") && !mine ? { state: "needs" as const, waiting_on: null, next: { label: c.action === "ADD" ? "Approve or return the new field" : "Approve or return", href: `/review/change/${c.id}`, note: null } } : { state: "waiting" as const, waiting_on: mine ? "You proposed it; a different person approves or returns it." : "A content publisher approves or returns it.", next: null }) });
    }

    // AI work still running: shown so a person knows it is coming, never as something to decide.
    for (const b of batches) {
      const spent = b.jobs.reduce((s, j) => s + (j.costUsd ?? 0), 0), done = b.jobs.filter((j) => !["QUEUED", "RUNNING"].includes(j.status)).length;
      const batchForms = [...new Set(b.jobs.map((j) => codeOf(j.attachmentId ? atts.get(j.attachmentId)?.edition : null)).filter((x): x is string => !!x))].sort();
      out.push({ id: `batch:${b.id}`, kind: "running", title: b.scopeLabel, by: nameOf(b.startedBy), at: b.startedAt.toISOString(), cost_usd: Math.round(spent * 100) / 100, forms: batchForms,
        what: `${b.status === "QUEUED" ? "Queued" : "Running"}: ${done} of ${plural(b.jobs.length, "step")} finished · worst case US$${b.worstCaseUsd.toFixed(2)}.`, state: "running" as const, waiting_on: null, next: { label: "View progress", href: `/ai/${b.id}`, note: null } });
    }
    return out;
  }
}

@Controller("api")
export class ReviewQueueController {
  constructor(@Inject(ReviewQueueService) private readonly s: ReviewQueueService) {}
  @Get("review-queue") list(@Headers("x-actor") a: string | undefined, @Query() q: unknown) { return this.s.list(actorOf(a), q); }
}
