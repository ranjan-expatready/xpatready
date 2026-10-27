// S4 (m2, P-116): where a Shared library › Forms entry is used, and what may be done with it now. Kept apart from
// form-library.ts so the lifecycle (api/src/lifecycle.ts) can use it without an import cycle.
import { HttpException } from "@nestjs/common";
import type { Use, UsesView } from "../../contracts/structure.ts";
import type { Prisma } from "@prisma/client";
import { ACTORS, type Db } from "./core.ts";

const problem = (status: number, title: string, detail: string) => new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail }, status);
const OPEN = ["WAITING", "RETURNED", "APPROVED"];
const nameOf = (id: string | null | undefined) => (id ? ACTORS.find((a) => a.id === id)?.name ?? "A person" : null);

/** Where a library form is used (P-116, L3): combinations whose draft lists it, releases that carry it, held files. */
export async function formUses(db: Db, workspaceId: string, code: string): Promise<UsesView> {
  const def = await db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: code } } });
  if (!def) throw problem(404, "Not in the library", `${code} is not in the library.`);
  const lines = await db.combinationForm.findMany({ where: { workspaceId, lineageKey: code }, orderBy: { version: "desc" }, include: { combination: { select: { id: true, label: true } } } });
  const newest = new Map<string, (typeof lines)[number]>();
  for (const l of lines) if (!newest.has(l.combinationId)) newest.set(l.combinationId, l);
  const released = await db.$queryRaw<{ combination_id: string; version: number; latest: number; label: string }[]>`
    SELECT r.combination_id, r.version, (SELECT max(version) FROM config_release x WHERE x.combination_id = r.combination_id) AS latest, c.label
    FROM config_release r JOIN combination c ON c.id = r.combination_id
    WHERE r.workspace_id = ${workspaceId}::uuid AND r.snapshot->'forms' @> jsonb_build_array(jsonb_build_object('form_number', ${code}::text))`;
  const uses: Use[] = [];
  for (const [cid, l] of newest) if (l.status !== "RETIRED") uses.push({ kind: "combination", label: l.combination.label, href: `/c/${cid}/forms`, blocks: true, why: l.status === "DRAFT" ? "Its current draft lists this form: remove it there first" : "It files this form" });
  for (const r of released.filter((x) => Number(x.version) === Number(x.latest))) uses.push({ kind: "release", label: `${r.label} · release ${r.version}`, href: `/c/${r.combination_id}/review`, blocks: true, why: "Its latest release files this form: a later release must drop it first" });
  for (const r of released.filter((x) => Number(x.version) !== Number(x.latest))) uses.push({ kind: "release", label: `${r.label} · release ${r.version}`, href: `/c/${r.combination_id}/review`, blocks: false, why: "An earlier release keeps this form for its cases" });
  const held = await db.intakeItem.count({ where: { workspaceId, code, status: "HELD" } });
  if (held) uses.push({ kind: "draft_change", label: `${held} held file${held === 1 ? "" : "s"} waiting for a person`, href: "/review", blocks: false, why: "A new or held edition waits on To review" });
  const pending = await db.libraryChange.findFirst({ where: { workspaceId, kind: "library_form", key: code, status: { in: OPEN } }, orderBy: { proposedAt: "desc" } });
  if (pending) uses.push({ kind: "draft_change", label: `${pending.action[0]}${pending.action.slice(1).toLowerCase()} waiting (${pending.status.toLowerCase()})`, href: `/review/change/${pending.id}`, blocks: true, why: "A change to it is already open: approve, return or withdraw it first" });
  const wasReleased = released.length > 0, blocking = uses.filter((u) => u.blocks && u.kind !== "draft_change");
  const p = pending ? "A change to it is already open." : null;
  const history = (await db.auditEvent.findMany({ where: { workspaceId, entityKey: code }, orderBy: { at: "desc" }, take: 10, select: { at: true, actor: true, summary: true } })).map((r) => ({ at: r.at.toISOString(), by: nameOf(r.actor) ?? (r.actor === "system" ? "The studio" : r.actor), what: r.summary }));
  return { key: code, label: `${code} · ${def.displayName}`, trail: [code], retired: !!def.retiredAt, released: wasReleased, uses,
    can: {
      delete: p ?? (wasReleased ? "It was released, so it is retired, never deleted (released versions and cases point to its exact edition)." : blocking.length ? `Still used: ${blocking.slice(0, 3).map((u) => u.label).join("; ")}. Remove it there first.` : def.retiredAt ? "It is retired." : null),
      retire: p ?? (def.retiredAt ? "It is already retired." : !wasReleased ? "It was never released: delete it instead." : blocking.length ? `Still used: ${blocking.slice(0, 3).map((u) => u.label).join("; ")}${blocking.length > 3 ? ` and ${blocking.length - 3} more` : ""}.` : null),
      restore: p ?? (!def.retiredAt ? "It is not retired." : null),
    },
    pending: pending ? { id: pending.id, action: pending.action as "DELETE" | "RETIRE" | "RESTORE", by: nameOf(pending.proposedBy) } : null, history };
}

// ------------------------------------------------------------------ Undo: one change on a forms list
export type LineRow = Prisma.CombinationFormGetPayload<object>;
/** Every row of these forms' lines on a combination, as they are now (what Undo puts back). */
export async function snapshotLines(db: Pick<Db, "combinationForm">, combinationId: string, codes: string[]) {
  return (await db.combinationForm.findMany({ where: { combinationId, lineageKey: { in: codes } } })) as LineRow[];
}
/** Records one change with the rows it started from; the rows after it are read again when it is undone. */
export async function recordAction(db: Pick<Db, "formLineAction" | "combinationForm">, a: { workspaceId: string; combinationId: string; action: "attach" | "remove" | "finder_attach" | "edit"; codes: string[]; before: LineRow[]; by: string; batchId?: string }) {
  const after = await snapshotLines(db, a.combinationId, a.codes);
  await db.formLineAction.create({ data: { workspaceId: a.workspaceId, combinationId: a.combinationId, action: a.action, by: a.by, detail: JSON.parse(JSON.stringify({ codes: a.codes, batch_id: a.batchId ?? null, before: a.before, after: after.map((r) => ({ id: r.id, status: r.status, version: r.version })) })) as Prisma.InputJsonValue } });
}
