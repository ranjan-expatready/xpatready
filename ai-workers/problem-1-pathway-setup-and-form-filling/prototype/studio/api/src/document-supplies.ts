// C4.5 (P-130; Lead 9's ruling on C4.5, option 1, 5 Nov): "Facts this document supplies", a person's step, US$0, no AI.
// Every document type of the six is made with no facts (checklist.ts docTypeOf: the checklist names a document, never
// what it shows), so no fact ever left the Smart questionnaire there. A document type's facts are library data used by
// every combination whose checklist names it, so they change only as a library change, the same path as "who fills"
// (who-fills.ts) and "when it is asked" (question-condition.ts): the author proposes the whole set with the official
// words for each fact and a reason; a second person approves it on To review (decideChange: never the proposer); at
// approval the document type gets a draft version with the facts (checked again first), published with the next release
// that carries it (publishLibraryChanges marks the change released). Nothing changes before approval. Sample until the
// immigration expert confirms (the cites are kept on the change, shown to the second person and in History).
import { Body, Controller, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { Prisma, type LibraryChange } from "@prisma/client";
import { problemFromZod } from "../../contracts/programs.ts";
import { ABOUT_WORDS, SUPPLIES_ACTION, SUPPLIES_KIND, SuppliesBody, type SupplyCite, type SuppliesView, type SuppliesWarning } from "../../contracts/document-supplies.ts";
import { actorOf, Audit, Db, need, revise, strip, Workspace, type Actor } from "./core.ts";
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
/** A new version copies the row; a Json column that is null is written as the database's null (Prisma refuses a bare null). */
const copyType = (r: Record<string, unknown>) => { const x = strip(r); if (x.readerProfile === null) x.readerProfile = Prisma.DbNull; return x; };
const nameOfField = (f: { canonicalFieldKey: string; meaning: string | null; label: string | null }) => (f.meaning ?? f.label ?? f.canonicalFieldKey).trim().replace(/\.$/, "").replace(/^./, (x) => x.toUpperCase());

/** The waiting, returned or approved (not yet released) change of a document type's facts, if any. */
export async function openSuppliesChange(db: Pick<Db, "libraryChange">, workspaceId: string, key: string) {
  return db.libraryChange.findFirst({ where: { workspaceId, kind: SUPPLIES_KIND, key, status: { in: OPEN } }, orderBy: { proposedAt: "desc" } });
}

@Injectable()
export class DocumentSupplies {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(Workspace) private readonly ws: Workspace) {}

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
    const merged = fields.filter((x) => x.mergedIntoKey && !fields.some((y) => y.canonicalFieldKey === x.canonicalFieldKey && !y.mergedIntoKey));
    if (merged.length) throw problem(409, "Merged", `"${nameOfField(merged[0])}" was merged into another shared field: choose that one.`);
    await refuseRetired(this.db, workspaceId, "field", facts);
    const label = new Map(facts.map((f) => [f, nameOfField(fields.find((x) => x.canonicalFieldKey === f)!)]));
    const cites: SupplyCite[] = parsed.data.facts.map((f) => ({ fact: f.fact, label: label.get(f.fact)!, about: f.about, source: f.source, quote: f.quote, readOn: f.readOn }));
    const before = { facts: current.suppliesFacts, about: (current.suppliesAbout ?? {}) as Record<string, string> }, after = { facts, about: aboutOf(cites) };
    if (same(before, after)) throw problem(409, "Nothing changes", `"${current.name}" already supplies exactly these facts in the library.`);
    const uses = (await this.db.documentRequirement.findMany({ where: { workspaceId, documentTypeKey: key, status: { not: "RETIRED" } }, distinct: ["combinationId"], select: { combinationId: true } })).length;
    const n = facts.length, words = n ? `supplies ${n} fact${n === 1 ? "" : "s"}` : "supplies no fact";
    const c = await this.db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, `${SUPPLIES_KIND}:${workspaceId}:${key}`);
      if (await openSuppliesChange(tx, workspaceId, key)) throw problem(409, "Already waiting", `A change of the facts "${current.name}" supplies already waits on To review or for the next release.`);
      return tx.libraryChange.create({ data: { workspaceId, kind: SUPPLIES_KIND, key, label: `${current.name} · ${words}, for every combination`.slice(0, 300), action: SUPPLIES_ACTION, reason: parsed.data.reason, status: "WAITING", proposedBy: actor.id,
        matches: { document: current.name, before: before.facts, beforeAbout: before.about, after: after.facts, afterAbout: after.about, cites, uses } as unknown as Prisma.InputJsonValue } });
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
  const m = (c.matches ?? {}) as { document?: string; before?: string[]; after?: string[]; cites?: SupplyCite[]; uses?: number };
  const before = m.before ?? [], after = m.after ?? [], cites = m.cites ?? [];
  const name = (f: string) => cites.find((x) => x.fact === f)?.label ?? f;
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
export async function applySupplies(db: Db, audit: Audit, actor: Actor, c: LibraryChange) {
  const m = c.matches as { before?: string[]; beforeAbout?: Record<string, string>; after?: string[]; afterAbout?: Record<string, string> };
  const { rows, current } = await typeOf(db, c.workspaceId, c.key);
  if (!current || !m.after) throw problem(409, "Not in the library", "The document type is no longer in the library, so nothing was changed. Return the change.");
  await refuseRetired(db, c.workspaceId, "document_type", [c.key]);
  await refuseRetired(db, c.workspaceId, "field", m.after);
  if (!same({ facts: current.suppliesFacts, about: (current.suppliesAbout ?? {}) as Record<string, string> }, { facts: m.before ?? [], about: m.beforeAbout ?? {} }))
    throw problem(409, "Changed since", "The facts this document supplies changed after it was proposed, so nothing was changed. Return it; the author proposes it again.");
  await revise(db.documentType, rows, { suppliesFacts: m.after, suppliesAbout: m.afterAbout && Object.keys(m.afterAbout).length ? (m.afterAbout as Prisma.InputJsonValue) : Prisma.DbNull }, actor.id, copyType);
  await audit.log(c.workspaceId, actor.id, "approved", "document type", c.key, `${actor.name} approved: ${c.label ?? c.key}. Every combination that names it has it in its draft now; it goes out with each one's next release.`);
}

/** At a release (publishLibraryChanges): an approved change whose document type draft this release published is released. */
export async function releaseSupplies(tx: Prisma.TransactionClient, workspaceId: string, pack: number) {
  const out: { kind: string; key: string; label: string; action: string }[] = [];
  for (const c of await tx.libraryChange.findMany({ where: { workspaceId, kind: SUPPLIES_KIND, status: "APPROVED" } })) {
    if (await tx.documentType.count({ where: { workspaceId, documentTypeKey: c.key, status: "DRAFT" } })) continue;
    // Challenge m3, m4: released only when the published type carries the approved facts (a release between approval and
    // its draft, or a type never published, leaves the change approved, never "released" with nothing applied).
    const m = c.matches as { after?: string[]; afterAbout?: Record<string, string> };
    const pub = (await tx.documentType.findMany({ where: { workspaceId, documentTypeKey: c.key, status: "PUBLISHED" }, orderBy: { version: "desc" }, take: 1 }))[0];
    if (!pub || !same({ facts: pub.suppliesFacts, about: (pub.suppliesAbout ?? {}) as Record<string, string> }, { facts: m.after ?? [], about: m.afterAbout ?? {} })) continue;
    await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", releasedIn: pack } });
    out.push({ kind: c.kind, key: c.key, label: c.label ?? c.key, action: c.action });
  }
  return out;
}

@Controller("api")
export class DocumentSuppliesController {
  constructor(@Inject(DocumentSupplies) private readonly s: DocumentSupplies) {}
  @Post("library/document-types/:key/supplies") propose(@Headers("x-actor") a: H, @Param("key") key: string, @Body() b: unknown) { return this.s.propose(actorOf(a), key, b); }
}
