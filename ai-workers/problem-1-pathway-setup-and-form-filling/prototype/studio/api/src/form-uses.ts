// S4 (m2, P-116): where a Shared library › Forms entry is used, and what may be done with it now. Kept apart from
// form-library.ts so the lifecycle (api/src/lifecycle.ts) can use it without an import cycle.
import { HttpException } from "@nestjs/common";
import type { Use, UsesView } from "../../contracts/structure.ts";
import type { Prisma } from "@prisma/client";
import { manifest } from "../../engine/import.ts";
import { ACTORS, type Db } from "./core.ts";
import { combinationTrails, formLines, formReleases } from "./where-used.ts";

const problem = (status: number, title: string, detail: string) => new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail }, status);
const OPEN = ["WAITING", "RETURNED", "APPROVED"];
const nameOf = (id: string | null | undefined) => (id ? ACTORS.find((a) => a.id === id)?.name ?? "A person" : null);

/** Each combination's place as a trail: now in the one where-used service (SH2, api/src/where-used.ts). */
export { combinationTrails };

/** Where a library form is used (P-116), and what may be done with it now. `except` leaves one change out of the open-change
 *  check: the returned change that is being sent again (Lead, PR #67 review). */
export async function formUses(db: Db, workspaceId: string, code: string, except?: string): Promise<UsesView> {
  const def = await db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: code } } });
  if (!def) throw problem(404, "Not in the library", `${code} is not in the library.`);
  // SH2 (P-258): the lines and releases come from the one where-used service.
  const [newest, released] = await Promise.all([formLines(db, workspaceId, code), formReleases(db, workspaceId, code)]);
  const uses: Use[] = [];
  const trails = await combinationTrails(db, workspaceId);
  for (const [cid, l] of newest) if (l.status !== "RETIRED") uses.push({ kind: "combination", label: trails.get(cid) ?? l.combination.label, href: `/c/${cid}/forms`, blocks: true, why: l.status === "DRAFT" ? "Its current draft lists this form: remove it there first" : "It files this form" });
  for (const r of released.filter((x) => x.latest)) uses.push({ kind: "release", label: `${trails.get(r.combinationId) ?? r.label} · release ${r.version}`, href: `/c/${r.combinationId}/review`, blocks: true, why: "Its latest release files this form: a later release must drop it first" });
  for (const r of released.filter((x) => !x.latest)) uses.push({ kind: "release", label: `${trails.get(r.combinationId) ?? r.label} · release ${r.version}`, href: `/c/${r.combinationId}/review`, blocks: false, why: "An earlier release keeps this form for its cases" });
  // Review must 1: a combination that has one of its files attached as a source (its fields are read from it) uses it too.
  const editions = await db.formEdition.findMany({ where: { workspaceId, govFormDefId: def.id }, select: { sha256: true } });
  const shas = editions.map((e) => e.sha256).filter((x): x is string => !!x);
  const atts = shas.length ? await db.sourceAttachment.findMany({ where: { workspaceId, sha256: { in: shas } }, select: { combinationId: true } }) : [];
  for (const cid of new Set(atts.map((a) => a.combinationId))) if (!newest.has(cid) || newest.get(cid)!.status === "RETIRED") uses.push({ kind: "combination", label: trails.get(cid) ?? "A combination", href: `/c/${cid}`, blocks: true, retireOk: true, why: "Its file is attached here as a source: it can be retired (the combination keeps its file; AI no longer drafts from it), never deleted" });
  // P-116 / P-51: an approved official file (on the manifest, approved by a second person, or downloaded from canada.ca) is
  // kept: it is retired, never deleted.
  const approved = await hasApprovedFile(db, workspaceId, shas);
  const held = await db.intakeItem.count({ where: { workspaceId, code, status: "HELD" } });
  if (held) uses.push({ kind: "draft_change", label: `${held} held file${held === 1 ? "" : "s"} waiting for a person`, href: "/review", blocks: false, why: "A new or held edition waits on To review" });
  const pending = await db.libraryChange.findFirst({ where: { workspaceId, kind: "library_form", key: code, status: { in: OPEN }, ...(except ? { id: { not: except } } : {}) }, orderBy: { proposedAt: "desc" } });
  if (pending) uses.push({ kind: "draft_change", label: `${pending.action[0]}${pending.action.slice(1).toLowerCase()} waiting (${pending.status.toLowerCase()})`, href: `/review/change/${pending.id}`, blocks: true, why: "A change to it is already open: approve, return or withdraw it first" });
  const wasReleased = released.length > 0, blocking = uses.filter((u) => u.blocks && u.kind !== "draft_change");
  // Break M1: a retired line still points to it (its history keeps the form), so it can only be retired, never deleted.
  const retiredOnly = [...newest.values()].filter((l) => l.status === "RETIRED");
  const p = pending ? "A change to it is already open." : null;
  const history = (await db.auditEvent.findMany({ where: { workspaceId, entityKey: code }, orderBy: { at: "desc" }, take: 10, select: { at: true, actor: true, summary: true } })).map((r) => ({ at: r.at.toISOString(), by: nameOf(r.actor) ?? (r.actor === "system" ? "The studio" : r.actor), what: r.summary }));
  return { key: code, label: `${code} · ${def.displayName}`, trail: [code], retired: !!def.retiredAt, released: wasReleased, uses,
    can: {
      delete: p ?? (approved ? "Its approved official file is kept, never deleted: retire it instead." : wasReleased ? "It was released, so it is retired, never deleted (released versions and cases point to its exact edition)." : retiredOnly.length ? `A retired line on ${trails.get(retiredOnly[0].combinationId) ?? retiredOnly[0].combination.label} still points to it: retire it instead.` : blocking.length ? `Still used: ${blocking.slice(0, 3).map((u) => u.label).join("; ")}. Remove it there first.` : def.retiredAt ? "It is retired." : null),
      retire: p ?? (def.retiredAt ? "It is already retired." : !wasReleased && !approved && !retiredOnly.length && !blocking.some((u) => u.retireOk) ? "It was never released and has no approved file: delete it instead." : blocking.filter((u) => !u.retireOk).length ? `Still used: ${blocking.filter((u) => !u.retireOk).slice(0, 3).map((u) => u.label).join("; ")}${blocking.filter((u) => !u.retireOk).length > 3 ? ` and ${blocking.filter((u) => !u.retireOk).length - 3} more` : ""}.` : null),
      restore: p ?? (!def.retiredAt ? "It is not retired." : null),
    },
    pending: pending ? { id: pending.id, action: pending.action as "DELETE" | "RETIRE" | "RESTORE", by: nameOf(pending.proposedBy) } : null, history };
}

/** P-51: one of these files is on the manifest, approved by a second person, or downloaded from canada.ca (kept). */
export async function hasApprovedFile(db: Pick<Db, "approvedSource" | "officialDownload">, workspaceId: string, shas: string[]) {
  if (!shas.length) return false;
  const [inProduct, downloaded] = await Promise.all([db.approvedSource.count({ where: { workspaceId, sha256: { in: shas } } }), db.officialDownload.count({ where: { workspaceId, sha256: { in: shas } } })]);
  return inProduct + downloaded > 0 || manifest().some((i) => shas.includes(i.sha256));
}

/** Break round 2 N5, N6: changes to one combination's forms list run one after the other in this server (attach, remove,
 *  a line edit, Undo, the finder's attach), so a check and its write never interleave with another change. */
const listLocks = new Map<string, Promise<unknown>>();
export async function oneAtATime<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const combinationId = id.toLowerCase().replace(/^urn:uuid:/, "").replace(/[^0-9a-f]/g, "") || id; // round 3 m1: one key per combination, however spelled
  const prev = listLocks.get(combinationId) ?? Promise.resolve();
  const run = prev.catch(() => undefined).then(fn);
  const tail = run.catch(() => undefined);
  listLocks.set(combinationId, tail);
  try { return await run; } finally { if (listLocks.get(combinationId) === tail) listLocks.delete(combinationId); }
}

/** Break round 2 N2: a retire or delete asked for this form and not yet decided or released (nothing new may use it). */
export async function closingChange(db: Pick<Db, "libraryChange">, workspaceId: string, code: string) {
  return db.libraryChange.findFirst({ where: { workspaceId, kind: "library_form", key: code, action: { in: ["RETIRE", "DELETE"] }, status: { in: ["WAITING", "APPROVED"] } } });
}

// ------------------------------------------------------------------ Undo: one change on a forms list
export type LineRow = Prisma.CombinationFormGetPayload<object>;
/** Every row of these forms' lines on a combination, as they are now (what Undo puts back). */
export async function snapshotLines(db: Pick<Db, "combinationForm">, combinationId: string, codes: string[]) {
  return (await db.combinationForm.findMany({ where: { combinationId, lineageKey: { in: codes } } })) as LineRow[];
}
/** What a line says (break M4): an edit that keeps its status and version still changes this, an exact Undo does not.
 *  P-143: the signature counts too, only when set, so a step recorded before it keeps its signature; C1.8: copies the same
 *  way, only when more than one. */
export const lineSig = (r: Pick<LineRow, "who" | "attachMode" | "conditionPlain" | "origin" | "predicateJson" | "minAge" | "signedBy" | "channel" | "sourceQuote" | "govFormDefId"> & { signature?: string | null; copies?: number | null }) => JSON.stringify([r.who, r.attachMode, r.conditionPlain, r.origin, r.predicateJson, r.minAge, r.signedBy, r.channel, r.sourceQuote, r.govFormDefId, ...(r.signature && r.signature !== "NONE" ? [r.signature] : []), ...(r.copies && r.copies > 1 ? [`copies:${r.copies}`] : [])]);
/** Records one change with the rows it started from; the rows after it are read again when it is undone. */
export async function recordAction(db: Pick<Db, "formLineAction" | "combinationForm">, a: { workspaceId: string; combinationId: string; action: "attach" | "remove" | "finder_attach" | "edit"; codes: string[]; before: LineRow[]; by: string; batchId?: string }) {
  const after = await snapshotLines(db, a.combinationId, a.codes);
  await db.formLineAction.create({ data: { workspaceId: a.workspaceId, combinationId: a.combinationId, action: a.action, by: a.by, detail: JSON.parse(JSON.stringify({ codes: a.codes, batch_id: a.batchId ?? null, before: a.before, after: after.map((r) => ({ id: r.id, status: r.status, version: r.version, sig: lineSig(r) })) })) as Prisma.InputJsonValue } });
}
