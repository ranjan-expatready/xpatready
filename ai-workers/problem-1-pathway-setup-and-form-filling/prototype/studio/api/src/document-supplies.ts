// C4.5 (P-130; Lead 9's ruling on C4.5, option 1, 5 Nov): "Facts this document supplies", a person's step, US$0, no AI.
// Every document type of the six is made with no facts (checklist.ts docTypeOf: the checklist names a document, never
// what it shows), so no fact ever left the Smart questionnaire there. A document type's facts are library data used by
// every combination whose checklist names it, so they change only as a library change, the same path as "who fills"
// (who-fills.ts) and "when it is asked" (question-condition.ts): the author proposes the whole set with the official
// words for each fact and a reason; a second person approves it on To review (decideChange: never the proposer); at
// approval the document type gets a draft version with the facts (checked again first), published with the next release
// that carries it (publishLibraryChanges marks the change released). Nothing changes before approval. Sample until the
// immigration expert confirms (the cites are kept on the change, shown to the second person and in History).
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Post, Query } from "@nestjs/common";
import { Prisma, type LibraryChange } from "@prisma/client";
import { problemFromZod } from "../../contracts/programs.ts";
import { ABOUT_WORDS, SUPPLIES_ACTION, SUPPLIES_KIND, SuppliesBody, type SupplyCite, type SuppliesPanelView, type SuppliesView, type SuppliesWarning } from "../../contracts/document-supplies.ts";
import { ACTORS, actorOf, Audit, Db, need, revise, strip, Workspace, type Actor } from "./core.ts";
import { refuseRetired } from "./library-items.ts";

type H = string | undefined;
type About = SupplyCite["about"];
const OPEN = ["WAITING", "RETURNED", "APPROVED"];
const problem = (status: number, title: string, detail: string) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail }, status);

/** The newest version of a document type that still counts (a draft, else the newest published). */
async function typeOf(db: Pick<Db, "documentType">, workspaceId: string, key: string) {
  const rows = await db.documentType.findMany({ where: { workspaceId, documentTypeKey: key }, orderBy: { version: "desc" } });
  return { rows, current: rows.find((r) => r.status === "DRAFT") ?? rows.find((r) => r.status === "PUBLISHED") ?? null };
}
/** Whom each fact is about, as the library stores it: only the facts not about the holder (engine/sources.ts suppliesOf). */
const aboutOf = (cites: { fact: string; about: About }[]) => Object.fromEntries(cites.filter((c) => c.about !== "holder").map((c) => [c.fact, c.about]));
const same = (a: { facts: string[]; about: Record<string, string> }, b: { facts: string[]; about: Record<string, string> }) =>
  JSON.stringify([...a.facts].sort()) === JSON.stringify([...b.facts].sort()) && JSON.stringify(Object.entries(a.about).sort()) === JSON.stringify(Object.entries(b.about).sort());
/** Words of a document's name that say nothing about what it shows (never used to suggest a fact). */
const SUGGEST_STOP = new Set(["information", "document", "documents", "photocopy", "proof", "evidence", "certificate", "letter", "application"]);
/** A new version copies the row; a Json column that is null is written as the database's null (Prisma refuses a bare null). */
const copyType = (r: Record<string, unknown>) => { const x = strip(r); if (x.readerProfile === null) x.readerProfile = Prisma.DbNull; return x; };
const nameOfField = (f: { canonicalFieldKey: string; meaning: string | null; label: string | null }) => (f.meaning ?? f.label ?? f.canonicalFieldKey).trim().replace(/\.$/, "").replace(/^./, (x) => x.toUpperCase());

/** The waiting, returned or approved (not yet released) change of a document type's facts, if any (one at a time: the
 *  database keeps one waiting or approved change per item, library_change_one_open). */
export async function openSuppliesChange(db: Pick<Db, "libraryChange">, workspaceId: string, key: string) {
  return db.libraryChange.findFirst({ where: { workspaceId, kind: SUPPLIES_KIND, key, status: { in: OPEN } }, orderBy: { proposedAt: "desc" } });
}
/** Break M1: a shared field is usable only while its newest version is neither merged into another nor retired (a merge
 *  marks only its new version, forms.ts mergeFields). */
async function refuseUnusable(db: Pick<Db, "canonicalField">, workspaceId: string, facts: string[]) {
  const rows = await db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: { in: facts } }, orderBy: { version: "desc" }, select: { canonicalFieldKey: true, mergedIntoKey: true, meaning: true, label: true, status: true } });
  const newest = new Map<string, (typeof rows)[number]>(); for (const r of rows) if (!newest.has(r.canonicalFieldKey)) newest.set(r.canonicalFieldKey, r);
  const merged = [...newest.values()].find((r) => r.mergedIntoKey);
  if (merged) throw problem(409, "Merged", `"${nameOfField(merged)}" was merged into another shared field (${merged.mergedIntoKey}): choose that one.`);
}

@Injectable()
export class DocumentSupplies {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(Workspace) private readonly ws: Workspace) {}

  /** What the panel reads (concept §4): the facts now with their official words, the open change, the fields to pick. */
  async view(key: string, combinationId?: string): Promise<SuppliesPanelView> {
    const workspaceId = await this.ws.id();
    const { current } = await typeOf(this.db, workspaceId, key);
    if (!current) throw problem(404, "Not in the library", "That document type is not in the shared library.");
    const rows = await this.db.canonicalField.findMany({ where: { workspaceId }, orderBy: { version: "desc" }, select: { canonicalFieldKey: true, meaning: true, label: true, status: true, mergedIntoKey: true } });
    // The newest version decides (a merge or a retire marks only it): merged or retired fields are not offered.
    const seen = new Set<string>(), named = new Map<string, string>();
    for (const f of rows) { if (seen.has(f.canonicalFieldKey)) continue; seen.add(f.canonicalFieldKey); if (f.status !== "RETIRED" && !f.mergedIntoKey) named.set(f.canonicalFieldKey, nameOfField(f)); }
    for (const f of current.suppliesFacts) if (!named.has(f)) { const r = rows.find((x) => x.canonicalFieldKey === f); named.set(f, r ? nameOfField(r) : f); }
    // The official words recorded with what it supplies now: the newest approved or released change of its facts.
    const last = await this.db.libraryChange.findFirst({ where: { workspaceId, kind: SUPPLIES_KIND, key, status: { in: ["APPROVED", "RELEASED"] } }, orderBy: { proposedAt: "desc" } });
    const cites = ((last?.matches ?? {}) as { cites?: SupplyCite[] }).cites ?? [];
    const about = (current.suppliesAbout ?? {}) as Record<string, About>;
    const facts = current.suppliesFacts.map((f) => { const c = cites.find((x) => x.fact === f); return { fact: f, label: named.get(f) ?? f, about: about[f] ?? "holder", cite: c ? { source: c.source, quote: c.quote, readOn: c.readOn } : null }; });
    const o = await openSuppliesChange(this.db, workspaceId, key);
    // Suggested first (rules, US$0): a field whose meaning names the document ("passport"), not supplied yet.
    const words = current.name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 5 && !SUGGEST_STOP.has(w));
    const have = new Set(current.suppliesFacts);
    const fields = [...named].map(([k, label]) => ({ key: k, label, suggested: !have.has(k) && words.some((w) => label.toLowerCase().includes(w)) }))
      .sort((a, b) => Number(b.suggested) - Number(a.suggested) || a.label.localeCompare(b.label));
    const line = combinationId ? await this.db.documentRequirement.findFirst({ where: { workspaceId, combinationId, documentTypeKey: key, status: { not: "RETIRED" } }, orderBy: { version: "desc" }, select: { sourceFile: true, sourceQuote: true } }) : null;
    const form = /^(imm|irm)(\d{4})/i.exec(line?.sourceFile ?? "");
    const uses = (await this.db.documentRequirement.findMany({ where: { workspaceId, documentTypeKey: key, status: { not: "RETIRED" } }, distinct: ["combinationId"], select: { combinationId: true } })).length;
    return { key, name: current.name, uses, facts,
      open: o ? { id: o.id, status: o.status as "WAITING" | "RETURNED" | "APPROVED", by: ACTORS.find((a) => a.id === o.proposedBy)?.name ?? "A person", byId: o.proposedBy, reason: o.reason ?? "", note: o.decisionNote, supplies: suppliesView(o) } : null,
      fields, prefill: line?.sourceQuote ? { source: form ? `${form[1].toUpperCase()} ${form[2]}, page ` : "", quote: line.sourceQuote } : null };
  }

  async propose(actor: Actor, key: string, body: unknown) {
    need(actor, "author");
    const parsed = SuppliesBody.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const workspaceId = await this.ws.id();
    const { current } = await typeOf(this.db, workspaceId, key);
    if (!current) throw problem(404, "Not in the library", "That document type is not in the shared library.");
    await refuseRetired(this.db, workspaceId, "document_type", [key]);
    const facts = [...new Set(parsed.data.facts.map((f) => f.fact))];
    if (facts.length !== parsed.data.facts.length) throw problem(400, "Listed twice", "Each fact is listed once: say whom it is about on its one line.");
    const fields = await this.db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: { in: facts } }, orderBy: { version: "desc" } });
    const unknown = facts.filter((f) => !fields.some((x) => x.canonicalFieldKey === f));
    if (unknown.length) throw problem(400, "Not a shared field", `${unknown.length === 1 ? "This is" : "These are"} not in the shared library: ${unknown.slice(0, 5).join(", ")}. Choose shared fields only.`);
    await refuseUnusable(this.db, workspaceId, facts);
    await refuseRetired(this.db, workspaceId, "field", facts);
    const label = new Map(facts.map((f) => [f, nameOfField(fields.find((x) => x.canonicalFieldKey === f)!)]));
    // Break M3: the facts it supplies now are named too (the second person reads names, never keys).
    const older = (await this.db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: { in: current.suppliesFacts } }, orderBy: { version: "desc" }, select: { canonicalFieldKey: true, meaning: true, label: true } }));
    const names: Record<string, string> = {}; for (const f of older) names[f.canonicalFieldKey] ??= nameOfField(f); for (const [k, v] of label) names[k] = v;
    const cites: SupplyCite[] = parsed.data.facts.map((f) => ({ fact: f.fact, label: label.get(f.fact)!, about: f.about, source: f.source, quote: f.quote, readOn: f.readOn }));
    const before = { facts: current.suppliesFacts, about: (current.suppliesAbout ?? {}) as Record<string, string> }, after = { facts, about: aboutOf(cites) };
    if (same(before, after)) throw problem(409, "Nothing changes", `"${current.name}" already supplies exactly these facts in the library.`);
    const uses = (await this.db.documentRequirement.findMany({ where: { workspaceId, documentTypeKey: key, status: { not: "RETIRED" } }, distinct: ["combinationId"], select: { combinationId: true } })).length;
    const n = facts.length, words = n ? `supplies ${n} fact${n === 1 ? "" : "s"}` : "supplies no fact";
    const c = await this.db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, `${SUPPLIES_KIND}:${workspaceId}:${key}`);
      const open = await openSuppliesChange(tx, workspaceId, key);
      if (open) throw problem(409, "Already waiting", open.status === "APPROVED" ? `A change of the facts "${current.name}" supplies is approved and waits for the next release. To change it again first, its proposer withdraws it (the facts go back to what they were).` : `A change of the facts "${current.name}" supplies already waits on To review or for the next release.`);
      return tx.libraryChange.create({ data: { workspaceId, kind: SUPPLIES_KIND, key, label: `${current.name} · ${words}, for every combination`.slice(0, 300), action: SUPPLIES_ACTION, reason: parsed.data.reason, status: "WAITING", proposedBy: actor.id,
        matches: { document: current.name, before: before.facts, beforeAbout: before.about, after: after.facts, afterAbout: after.about, cites, names, uses } as unknown as Prisma.InputJsonValue } });
    });
    await this.audit.log(workspaceId, actor.id, "proposed", "document type", key, `${actor.name} proposed that "${current.name}" ${words} for every combination (used by ${uses}); waits for a second person. Why: ${parsed.data.reason}`);
    // Challenge m6: a supplied fact with no question placed cannot be asked when the document is missing (P-130); said, not refused.
    const placed = new Set((await this.db.sectionQuestion.findMany({ where: { workspaceId, canonicalFieldKey: { in: facts }, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { canonicalFieldKey: true } })).map((q) => q.canonicalFieldKey));
    const warnings: SuppliesWarning[] = facts.filter((f) => !placed.has(f)).map((f) => ({ fact: f, label: label.get(f)!, why: `No question asks "${label.get(f)}" yet, so it cannot be asked when the document is missing or unreadable. Place it in a section.` }));
    return { id: c.id, status: c.status, label: c.label, supplies: suppliesView(c), warnings };
  }
}

/** What the second person compares on To review: before → after by name, each new fact's official words, the reason. */
export function suppliesView(c: Pick<LibraryChange, "matches" | "reason">): SuppliesView {
  const m = (c.matches ?? {}) as { document?: string; before?: string[]; after?: string[]; cites?: SupplyCite[]; names?: Record<string, string>; uses?: number };
  const before = m.before ?? [], after = m.after ?? [], cites = m.cites ?? [];
  const name = (f: string) => m.names?.[f] ?? cites.find((x) => x.fact === f)?.label ?? f;
  return { document: m.document ?? "", before: before.map(name), after: after.map(name), added: after.filter((f) => !before.includes(f)).map(name), removed: before.filter((f) => !after.includes(f)).map(name), cites, uses: m.uses ?? 0, reason: c.reason ?? "" };
}
/** The one line To review and History read ("none → 9 facts: Family name, …"). */
export function suppliesWords(v: SuppliesView) {
  const list = (x: string[]) => (x.length ? `${x.length} fact${x.length === 1 ? "" : "s"}` : "no fact");
  const about = v.cites.filter((c) => c.about !== "holder").map((c) => `${c.label} (about ${ABOUT_WORDS[c.about]})`);
  return `Facts it supplies, for every combination: ${list(v.before)} → ${list(v.after)}${v.added.length ? `; adds ${v.added.join(", ")}` : ""}${v.removed.length ? `; removes ${v.removed.join(", ")}` : ""}${about.length ? `; ${about.join(", ")}` : ""}${v.cites.length ? `. Official words: ${[...new Set(v.cites.map((c) => `${c.source} (read ${c.readOn})`))].join("; ")}` : ""} (used by ${v.uses} combination${v.uses === 1 ? "" : "s"}: at approval it changes each one's draft and Preview, and goes out with each one's next release; Sample until the immigration expert confirms). Reason: ${v.reason}`;
}

/** At approval (lifecycle afterApprove): the document type gets a draft version with the facts, checked again first; it
 *  is published with the next release that carries it. */
export async function applySupplies(db: Db, audit: Audit, actor: Actor, seen: LibraryChange) {
  // B83 (review R3, breaker n7): under the lock a withdrawal of a named field takes, on the change as it is now: a field
  // withdrawn just before never reaches the draft, and a change that went back to waiting writes nothing.
  const c = await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, `${SUPPLIES_KIND}:${seen.workspaceId}:${seen.key}`);
    const c = await tx.libraryChange.findUnique({ where: { id: seen.id } });
    if (c?.status !== "APPROVED") return null;
    const m = c.matches as { before?: string[]; beforeAbout?: Record<string, string>; after?: string[]; afterAbout?: Record<string, string> };
    const { rows, current } = await typeOf(tx, c.workspaceId, c.key);
    if (!current || !m.after) throw problem(409, "Not in the library", "The document type is no longer in the library, so nothing was changed. Return the change.");
    await refuseRetired(tx, c.workspaceId, "document_type", [c.key]);
    await refuseRetired(tx, c.workspaceId, "field", m.after);
    await refuseUnusable(tx, c.workspaceId, m.after);
    const live = new Set((await tx.canonicalField.findMany({ where: { workspaceId: c.workspaceId, canonicalFieldKey: { in: m.after }, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { canonicalFieldKey: true } })).map((f) => f.canonicalFieldKey));
    if (m.after.some((f) => !live.has(f))) throw problem(409, "Field withdrawn", "A field this change names is no longer in the library, so nothing was changed. Return the change; the author proposes it again.");
    if (!same({ facts: current.suppliesFacts, about: (current.suppliesAbout ?? {}) as Record<string, string> }, { facts: m.before ?? [], about: m.beforeAbout ?? {} }))
      throw problem(409, "Changed since", "The facts this document supplies changed after it was proposed, so nothing was changed. Return it; the author proposes it again.");
    await revise(tx.documentType, rows, { suppliesFacts: m.after, suppliesAbout: m.afterAbout && Object.keys(m.afterAbout).length ? (m.afterAbout as Prisma.InputJsonValue) : Prisma.DbNull }, actor.id, copyType);
    return c;
  }, { timeout: 30_000, maxWait: 10_000 });
  if (!c) throw problem(409, "Changed meanwhile", "A field this change named was withdrawn at the same moment, so the change was not applied. Refresh to see what it does now.");
  await audit.log(c.workspaceId, actor.id, "approved", "document type", c.key, `${actor.name} approved: ${c.label ?? c.key}. Every combination that names it has it in its draft now; it goes out with each one's next release.`);
}

/** Break M2: an approved change no release has carried yet (a type no released combination names would otherwise keep
 *  it for good) is withdrawn by its proposer: the document type's draft goes back to the facts it had before, checked
 *  first (changed since: refused). Called by withdrawChange (library-changes.ts) in its transaction. */
export async function withdrawApprovedSupplies(tx: Prisma.TransactionClient, actor: Actor, c: LibraryChange, why: string) {
  // One withdraw at a time (break R2 m: the losers of a race are told it is done, not "changed since").
  await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, `${SUPPLIES_KIND}:${c.workspaceId}:${c.key}`);
  const now = await tx.libraryChange.findUnique({ where: { id: c.id } });
  if (now?.status !== "APPROVED") throw problem(409, "Already decided", `This change is already ${String(now?.status ?? "gone").toLowerCase()}. Refresh to see it.`);
  const m = c.matches as { before?: string[]; beforeAbout?: Record<string, string>; after?: string[]; afterAbout?: Record<string, string> };
  const rows = await tx.documentType.findMany({ where: { workspaceId: c.workspaceId, documentTypeKey: c.key }, orderBy: { version: "desc" } });
  const draft = rows.find((r) => r.status === "DRAFT");
  // Break R2-M1: a merge since approval rewrites the draft's keys (forms.ts), so both sides are read through merges.
  const after = await throughMerges(tx, c.workspaceId, m.after ?? [], m.afterAbout ?? {}), before = await throughMerges(tx, c.workspaceId, m.before ?? [], m.beforeAbout ?? {});
  if (!draft || !sameFacts(draft.suppliesFacts, after.facts)) throw problem(409, "Changed since", "The document type's facts changed after this was approved, so nothing was withdrawn. Refresh to see them.");
  await tx.documentType.update({ where: { id: draft.id }, data: { suppliesFacts: before.facts, suppliesAbout: Object.keys(before.about).length ? (before.about as Prisma.InputJsonValue) : Prisma.DbNull, updatedBy: actor.id } });
  // Break R2-M3: the approver's decision stays on the change; the withdraw is added to its note and to History.
  const note = `${c.decisionNote ? `Approved: ${c.decisionNote.replace(/\.$/, "")}. ` : ""}Withdrawn by ${actor.name}: ${why}`.slice(0, 300);
  const done = await tx.libraryChange.updateMany({ where: { id: c.id, status: "APPROVED" }, data: { status: "WITHDRAWN", decisionNote: note } });
  if (!done.count) throw problem(409, "Already decided", "Someone released or withdrew this at the same moment. Refresh to see it.");
  await tx.auditEvent.create({ data: { workspaceId: c.workspaceId, actor: actor.id, action: "withdrawn", entity: "document type", entityKey: c.key, summary: `${actor.name} withdrew the approved change "${c.label ?? c.key}"; its facts went back to what they were. Why: ${why}`.slice(0, 600), detail: { change: c.id } } });
}

/** B83 (breaker M2, review N3): a new field withdrawn comes out of every open change of a document's facts that names it.
 *  Nothing left to change: it ends, the draft back to what it was, the approver's note kept. Something left on a waiting or
 *  returned change: it is narrowed. Something left on an approved one: its draft goes back and it waits again, because a
 *  second person approved a different set and decides the real one (never a released set nobody approved). */
export async function dropFactFromChanges(tx: Prisma.TransactionClient, actor: { id: string; name: string }, workspaceId: string, fact: string, fieldName: string, why: string) {
  const names: string[] = [];
  type Matches = { document?: string; before?: string[]; beforeAbout?: Record<string, string>; after?: string[]; afterAbout?: Record<string, string>; cites?: SupplyCite[] };
  const OPEN = ["WAITING", "RETURNED", "APPROVED"];
  // One at a time, in one order, so two withdrawals never wait for each other.
  for (const { id, key } of await tx.libraryChange.findMany({ where: { workspaceId, kind: SUPPLIES_KIND, status: { in: OPEN } }, orderBy: { id: "asc" }, select: { id: true, key: true } })) {
    await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, `${SUPPLIES_KIND}:${workspaceId}:${key}`);
    const c = await tx.libraryChange.findUnique({ where: { id } }); // read under the lock
    const m = (c?.matches ?? {}) as Matches;
    if (!c || !OPEN.includes(c.status) || !m.after?.includes(fact)) continue;
    const after = m.after.filter((f) => f !== fact), afterAbout = Object.fromEntries(Object.entries(m.afterAbout ?? {}).filter(([k]) => k !== fact));
    const before = { facts: m.before ?? [], about: m.beforeAbout ?? {} }, nothingLeft = same({ facts: after, about: afterAbout }, before), wasApproved = c.status === "APPROVED";
    const n = after.length, document = m.document ?? c.label ?? "A document";
    const said = `The new field "${fieldName}" it named was withdrawn by ${actor.name}: ${why.replace(/\.$/, "")}`;
    if (wasApproved) {
      const draft = (await tx.documentType.findMany({ where: { workspaceId, documentTypeKey: c.key, status: "DRAFT" }, orderBy: { version: "desc" }, take: 1 }))[0];
      const back = await throughMerges(tx, workspaceId, before.facts, before.about); // Break R2-M1: a merge since approval moved the keys
      if (draft) await tx.documentType.update({ where: { id: draft.id }, data: { suppliesFacts: back.facts, suppliesAbout: Object.keys(back.about).length ? (back.about as Prisma.InputJsonValue) : Prisma.DbNull, updatedBy: actor.id } });
    }
    const matches = { ...m, after, afterAbout, cites: (m.cites ?? []).filter((x) => x.fact !== fact) } as unknown as Prisma.InputJsonValue;
    const earlier = c.decisionNote ? `${wasApproved ? "Approved: " : ""}${c.decisionNote.replace(/\.$/, "")}. `.slice(0, Math.max(0, 298 - said.length)) : ""; // the withdrawal's words are never the part clipped
    await tx.libraryChange.update({ where: { id }, data: nothingLeft ? { status: "WITHDRAWN", decisionNote: `${earlier}${said}`.slice(0, 300), matches }
      : { label: `${document} · ${n ? `supplies ${n} fact${n === 1 ? "" : "s"}` : "supplies no fact"}, for every combination`.slice(0, 300), matches, decisionNote: `${earlier}${said}`.slice(0, 300), ...(wasApproved ? { status: "WAITING", decidedBy: null, decidedAt: null } : {}) } });
    const proposer = ACTORS.find((a) => a.id === c.proposedBy)?.name ?? "Another person";
    await tx.auditEvent.create({ data: { workspaceId, actor: actor.id, action: "withdrawn", entity: "document type", entityKey: c.key, summary: `${said}. It was taken out of ${proposer}'s change "${c.label ?? c.key}", which ${nothingLeft ? "has nothing left to do and ended" : wasApproved ? "waits for a second person again" : "still waits"}.`.slice(0, 600) } });
    names.push(document);
  }
  return names;
}

/** Facts and whom they are about read through merges (a merged field stands for the field it was merged into). */
async function throughMerges(db: Pick<Prisma.TransactionClient, "canonicalField">, workspaceId: string, facts: string[], about: Record<string, string>) {
  const rows = await db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: { in: facts } }, orderBy: { version: "desc" }, select: { canonicalFieldKey: true, mergedIntoKey: true } });
  const to = new Map<string, string>(); for (const r of rows) if (!to.has(r.canonicalFieldKey)) to.set(r.canonicalFieldKey, r.mergedIntoKey ?? r.canonicalFieldKey);
  const map = (f: string) => to.get(f) ?? f;
  return { facts: [...new Set(facts.map(map))], about: Object.fromEntries(Object.entries(about).map(([k, v]) => [map(k), v])), merged: facts.some((f) => map(f) !== f) };
}
const sameFacts = (a: string[], b: string[]) => JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort());

/** At a release (publishLibraryChanges): an approved change whose document type draft this release published is released. */
export async function releaseSupplies(tx: Prisma.TransactionClient, workspaceId: string, pack: number) {
  const out: { kind: string; key: string; label: string; action: string }[] = [];
  for (const c of await tx.libraryChange.findMany({ where: { workspaceId, kind: SUPPLIES_KIND, status: "APPROVED" } })) {
    if (await tx.documentType.count({ where: { workspaceId, documentTypeKey: c.key, status: "DRAFT" } })) continue;
    // Challenge m3, m4: released only when the published type carries the approved facts (a release between approval and
    // its draft, or a type never published, leaves the change approved, never "released" with nothing applied).
    const m = c.matches as { after?: string[]; afterAbout?: Record<string, string> };
    const pub = (await tx.documentType.findMany({ where: { workspaceId, documentTypeKey: c.key, status: "PUBLISHED" }, orderBy: { version: "desc" }, take: 1 }))[0];
    // Break R2-M1: read through merges (a merge since approval moved the keys); whom-about is compared when nothing merged.
    const after = await throughMerges(tx, workspaceId, m.after ?? [], m.afterAbout ?? {});
    if (!pub || !(after.merged ? sameFacts(pub.suppliesFacts, after.facts) : same({ facts: pub.suppliesFacts, about: (pub.suppliesAbout ?? {}) as Record<string, string> }, after))) continue;
    await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", releasedIn: pack } });
    out.push({ kind: c.kind, key: c.key, label: c.label ?? c.key, action: c.action });
  }
  return out;
}

@Controller("api")
export class DocumentSuppliesController {
  constructor(@Inject(DocumentSupplies) private readonly s: DocumentSupplies) {}
  @Get("library/document-types/:key/supplies") view(@Param("key") key: string, @Query("combination") combination?: string) { return this.s.view(key, combination && /^[0-9a-f-]{36}$/i.test(combination) ? combination : undefined); }
  @Post("library/document-types/:key/supplies") propose(@Headers("x-actor") a: H, @Param("key") key: string, @Body() b: unknown) { return this.s.propose(actorOf(a), key, b); }
}
