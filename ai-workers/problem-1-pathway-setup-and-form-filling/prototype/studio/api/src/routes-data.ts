// C6.17 A multi-stage case (B139; concept BR-2, §6b scaffolding): routes as data. The Sample route comes from an import
// file (samples/routes.json; STAND-INS row for the tech lead), loaded by a step of the configured checkpoint after release
// one; read only here (no authoring: SA-1B-66 later). A route is loaded only when the engine's route check passes against
// the workspace's combinations (engine/runtime/stages.ts routeProblems). Also the stage rows a case is opened with.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { openingStages, routeProblems, type EarlierInput, type KeyDetailDef, type RouteDef, type RouteStage, type StoredDetail } from "../../engine/runtime/stages.ts";
import { STUDIO, type Db } from "./core.ts";

type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];
export const ROUTES_FILE = join(STUDIO, "samples", "routes.json");
/** The stage as frozen on the case at opening (case_stage.spec): its key details, deadline rule and same-document pairs. */
export type StageSpec = { key_details: KeyDetailDef[]; deadline: RouteStage["deadline"] | null; same_documents: NonNullable<RouteStage["same_documents"]> };
export const specOf = (s: RouteStage): StageSpec => ({ key_details: s.key_details ?? [], deadline: s.deadline ?? null, same_documents: s.same_documents ?? [] });
export const readSpec = (x: unknown): StageSpec => { const s = (x ?? {}) as Partial<StageSpec>; return { key_details: s.key_details ?? [], deadline: s.deadline ?? null, same_documents: s.same_documents ?? [] }; };

/** The workspace's routes, as loaded. */
export async function routesOf(db: Pick<Db, "route">, workspaceId: string): Promise<RouteDef[]> {
  const rows = await db.route.findMany({ where: { workspaceId }, orderBy: { key: "asc" } });
  return rows.map((r) => ({ key: r.key, label: r.label, basis: r.basis as RouteDef["basis"], stages: r.stages as unknown as RouteStage[] }));
}
/** The route a combination is a stage of, and where (a combination is on at most one route here: the loader refuses a
 *  second route that uses it, so a case's route is never a guess). */
export function routeOf(routes: RouteDef[], combinationKey: string): { route: RouteDef; at: number } | null {
  for (const route of routes) { const at = route.stages.findIndex((s) => s.combination_key === combinationKey); if (at >= 0) return { route, at }; }
  return null;
}

/** Loads samples/routes.json into the workspace: each route the engine accepts against the workspace's combinations,
 *  and that uses no combination another loaded route already uses; a refused route is named with why. Replaces the
 *  workspace's routes (a case keeps the stages it was opened with: they are frozen on its stage rows). */
export async function loadSampleRoutes(db: Db, workspaceId: string, actor: string): Promise<{ loaded: string[]; refused: string[] }> {
  const file = JSON.parse(readFileSync(ROUTES_FILE, "utf8")) as { routes: RouteDef[] };
  const known = new Set((await db.combination.findMany({ where: { workspaceId }, select: { combinationKey: true } })).map((c) => c.combinationKey));
  const loaded: string[] = [], refused: string[] = [], used = new Set<string>();
  const ok: RouteDef[] = [];
  for (const r of file.routes ?? []) {
    const problems = routeProblems(r, known);
    const twice = (r.stages ?? []).filter((s) => used.has(s.combination_key)).map((s) => `combination "${s.combination_key}" is already a stage of another route`);
    if (problems.length || twice.length) { refused.push(`${r.key}: ${[...problems, ...twice].join("; ")}`); continue; }
    r.stages.forEach((s) => used.add(s.combination_key)); ok.push(r);
  }
  await db.$transaction(async (tx) => {
    await tx.route.deleteMany({ where: { workspaceId } });
    for (const r of ok) { await tx.route.create({ data: { workspaceId, key: r.key, label: r.label, basis: r.basis ?? "SAMPLE", stages: r.stages as object, createdBy: actor } }); loaded.push(r.label); }
  });
  return { loaded, refused };
}

/** BR-3 (and M5: every case writes its stage rows): the stage rows a new case is opened with, in its creating
 *  transaction. A case on no route gets one CURRENT stage (route null, the combination's key and label). Returns the
 *  key details written as the person's answers (fields the route marks the same at every stage, P-412 F13 (c)). */
export async function writeOpeningStages(tx: Tx, a: { workspaceId: string; caseId: string; firmKey: string; combination: { id: string; combinationKey: string; label: string }; applicationSubjectId: string;
  route: RouteDef | null; earlier: EarlierInput[]; actor: string; at: Date }): Promise<{ answers: { field: string; value: string }[]; stages: number; doneBefore: number } | { field: string; message: string }> {
  const plan = openingStages(a.route, a.combination.combinationKey, a.earlier, a.actor, a.at.toISOString());
  if ("field" in plan) return plan;
  if (!plan.rows.length) {
    await tx.caseStage.create({ data: { workspaceId: a.workspaceId, caseId: a.caseId, firmKey: a.firmKey, ord: 1, stageKey: a.combination.combinationKey, staffName: a.combination.label, clientName: a.combination.label, combinationId: a.combination.id,
      applicationSubjectId: a.applicationSubjectId, state: "CURRENT", startedFrom: "BEGIN", startedBy: a.actor, startedAt: a.at } });
    return { answers: [], stages: 1, doneBefore: 0 };
  }
  const ids = new Map((await tx.combination.findMany({ where: { workspaceId: a.workspaceId, combinationKey: { in: plan.rows.map((r) => r.stage.combination_key) } }, select: { id: true, combinationKey: true } })).map((c) => [c.combinationKey, c.id]));
  const answers: { field: string; value: string }[] = [];
  for (const r of plan.rows) {
    const combinationId = ids.get(r.stage.combination_key);
    if (!combinationId) return { field: "combinationId", message: `The route's stage "${r.stage.staff_name}" names a combination that is not in this workspace.` };
    const current = r.state === "CURRENT", done = r.state === "DONE_BEFORE";
    await tx.caseStage.create({ data: { workspaceId: a.workspaceId, caseId: a.caseId, firmKey: a.firmKey, ord: r.ord, stageKey: r.stage.key, staffName: r.stage.staff_name, clientName: r.stage.client_name, combinationId,
      applicationSubjectId: current ? a.applicationSubjectId : null, state: r.state, startedFrom: current ? "BEGIN" : null, startedBy: current ? a.actor : null, startedAt: current ? a.at : null,
      keyDetails: r.key_details as object, spec: specOf(r.stage) as object, routeKey: a.route!.key, recordedBy: done ? a.actor : null, recordedAt: done ? a.at : null } });
    if (done) for (const d of r.stage.key_details) if (d.same_every_stage && (r.key_details as Record<string, StoredDetail>)[d.field] && !answers.some((x) => x.field === d.field)) answers.push({ field: d.field, value: r.key_details[d.field].value });
  }
  return { answers, stages: plan.rows.length, doneBefore: plan.rows.filter((r) => r.state === "DONE_BEFORE").length };
}
