// C3.16 (L-SA4; SA-1B-130; concept screens/C3.16-field-scope/concept.md r4, approved by the tech lead on #1054): the
// library's "Asked about" choice for a shared field. The author sets the scope only while no version of the field was
// ever published (SA-1B-130 rule 4); it goes out with the next release, whose placements then carry it (engine/snapshot.ts,
// engine/field-scope.ts). M3-only file: the rules are engine/field-scope.ts's, read here once under the field's lock.
//   GET /api/library/fields/:key/scope   the current scope, each choice with why it cannot be chosen, the saved AI runs
//                                        a change would stop replaying (the warning, Q6 on #1054)
//   PUT /api/library/fields/:key/scope   { scope, expected } → the field's draft version with the new scope
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Body, Controller, Get, Headers, HttpException, Inject, Injectable, Param, Put } from "@nestjs/common";
import { z } from "zod";
import { SCOPES, type Scope } from "../../contracts/resolver.ts";
import { SCOPE_WORDS, scopeOfStored, scopeRefusal, storedOfScope, type ScopeFacts } from "../../engine/field-scope.ts";
import { actorOf, Audit, Db, need, PROTOTYPE, readerOf, Workspace, type Actor } from "./core.ts";
import { lockItem } from "./library-items.ts";

type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);
const FIELD_KEY = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;
const Put_ = z.strictObject({ scope: z.enum(SCOPES), expected: z.enum(SCOPES) });
/** Break m7 on #1054: only these two keys, checked on the body's own keys (a "__proto__" key is not one of them). */
const onlyKeys = (b: unknown) => !!b && typeof b === "object" && !Array.isArray(b) && Reflect.ownKeys(b).every((k) => k === "scope" || k === "expected");

/** What the rules need to know about one field, read inside the caller's transaction. */
async function factsOf(db: Tx | Db, workspaceId: string, key: string) {
  const versions = await db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: key }, orderBy: { version: "desc" } });
  if (!versions.length) return null;
  const current = versions.find((v) => v.status === "DRAFT") ?? versions[0];
  // Break 2 on #1054: a placement that came in through a merge keeps its lineage key and asks this field by its field key.
  const placements = await db.sectionQuestion.findMany({ where: { workspaceId, OR: [{ lineageKey: key }, { canonicalFieldKey: key }], status: { in: ["DRAFT", "PUBLISHED"] } }, select: { repeats: true, predicateJson: true, sectionKey: true } });
  const representativeBox = (await db.formFieldMap.count({ where: { workspaceId, canonicalFieldKey: key, person: "representative", status: { in: ["DRAFT", "PUBLISHED"] } } })) > 0;
  const facts: ScopeFacts = {
    key,
    published: versions.some((v) => v.status !== "DRAFT" || !!v.supersedesId),
    placements: placements.map((p) => ({ repeats: p.repeats, condition: p.predicateJson !== null && p.predicateJson !== undefined })),
    merged: versions.some((v) => !!v.mergedIntoKey) ? (versions.find((v) => v.mergedIntoKey)!.mergedIntoKey as string) : null,
    representativeBox,
  };
  return { current, facts, sections: [...new Set(placements.map((p) => p.sectionKey))], name: (current.label ?? current.meaning ?? key).trim() };
}

/** Q6 on #1054: the saved AI runs whose question list a scope change would move (a saved job that reads the question
 *  list of a combination that asks this field). They replay only after a new run. Read from p2/jobs (committed). */
function savedRunsOf(combinationKeys: string[]): { combination: string; job: string }[] {
  if (!combinationKeys.length) return [];
  const dir = join(PROTOTYPE, "p2", "jobs");
  let names: string[] = [];
  try { names = readdirSync(dir).filter((n) => n.endsWith(".json")); } catch { return []; }
  const out: { combination: string; job: string }[] = [];
  for (const n of names) {
    try {
      const j = JSON.parse(readFileSync(join(dir, n), "utf8")) as { job_id?: string; combination?: string; inputs?: { file?: string }[] };
      if (j.combination && combinationKeys.includes(j.combination) && (j.inputs ?? []).some((i) => /\/question-lists\//.test(i.file ?? ""))) out.push({ combination: j.combination, job: j.job_id ?? n });
    } catch { /* an unreadable job file is not a saved run */ }
  }
  return out.sort((a, b) => a.job.localeCompare(b.job));
}

@Injectable()
export class FieldScopes {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit) {}

  /** The combinations that ask this field: a section they select places it, or a form line of theirs has a form field
   *  that reads it (a box asks what it reads, P-62). */
  private async combinationsAsking(workspaceId: string, key: string, sections: string[]) {
    const rows = await this.db.$queryRaw<{ combination_key: string }[]>`
      SELECT DISTINCT c.combination_key FROM combination c
      WHERE c.workspace_id = ${workspaceId}::uuid AND c.retired_at IS NULL AND (
        EXISTS (SELECT 1 FROM sqr_section_selection s WHERE s.combination_id = c.id AND s.section_key = ANY(${sections}::text[]))
        OR EXISTS (SELECT 1 FROM combination_form f JOIN form_edition e ON e.gov_form_def_id = f.gov_form_def_id JOIN form_field_map m ON m.form_edition_id = e.id
                   WHERE f.combination_id = c.id AND f.status <> 'RETIRED' AND m.canonical_field_key = ${key} AND m.status IN ('DRAFT', 'PUBLISHED')))
      ORDER BY 1`;
    return rows.map((r) => r.combination_key);
  }

  async view(key: string) {
    if (!FIELD_KEY.test(key)) throw problem(404, "Not in the library", `${key} is not a shared field.`);
    const workspaceId = await this.ws.id();
    const f = await factsOf(this.db, workspaceId, key);
    if (!f) throw problem(404, "Not in the library", `${key} is not in the shared library (it may have been deleted or reset).`);
    const scope = scopeOfStored(f.current.scope);
    const saved = savedRunsOf(await this.combinationsAsking(workspaceId, key, f.sections));
    return {
      key, name: f.name, scope, words: SCOPE_WORDS[scope], published: f.facts.published, merged_into: f.facts.merged,
      choices: SCOPES.map((s) => ({ scope: s, ...SCOPE_WORDS[s], current: s === scope, refused: s === scope ? null : scopeRefusal(f.facts, s)?.message ?? null })),
      saved_runs: saved,
      warning: saved.length ? `Changing this moves the saved AI results of ${new Set(saved.map((x) => x.combination)).size} combination${new Set(saved.map((x) => x.combination)).size === 1 ? "" : "s"} (${saved.length} saved run${saved.length === 1 ? "" : "s"}); they replay only after a new run.` : null,
    };
  }

  async set(actor: Actor, key: string, body: unknown) {
    need(actor, "author"); // the library's draft edits are the author's duty (the approver approves, never edits)
    if (!FIELD_KEY.test(key)) throw problem(404, "Not in the library", `${key} is not a shared field.`);
    const b = onlyKeys(body) ? Put_.safeParse(body) : ({ success: false } as const);
    if (!b.success) throw problem(400, "Choose a scope", `Choose one of: ${SCOPES.map((s) => SCOPE_WORDS[s].label).join(", ")}, and send the scope you saw as "expected".`);
    const workspaceId = await this.ws.id();
    const to: Scope = b.data.scope;
    const done = await this.db.$transaction(async (tx) => {
      await lockItem(tx, workspaceId, "field", [key]); // two saves at once: one waits, then sees the other's scope
      const f = await factsOf(tx, workspaceId, key);
      if (!f) throw problem(404, "Not in the library", `${key} is not in the shared library (it may have been deleted or reset).`);
      const from = scopeOfStored(f.current.scope);
      if (from !== b.data.expected) throw problem(409, "Changed since you looked", `Someone changed whom "${f.name}" is about after you looked: it is now ${SCOPE_WORDS[from].label}. Reload, then choose again.`, { current: from });
      if (from === to) return { f, from, changed: false };
      const no = scopeRefusal(f.facts, to);
      if (no) throw problem(no.status, no.status === 409 ? "Published" : "Not this scope", no.message);
      await tx.canonicalField.update({ where: { id: f.current.id }, data: { scope: storedOfScope(to), updatedBy: actor.id } });
      return { f, from, changed: true };
    });
    if (done.changed) await this.audit.log(workspaceId, actor.id, "updated", "field", key, `${actor.name} set "${done.f.name}" to be asked ${SCOPE_WORDS[to].short} (was ${SCOPE_WORDS[done.from].short}; draft v${done.f.current.version}; goes out with the next release)`, { from: done.from, to });
    return this.view(key);
  }
}

@Controller("api/library/fields")
export class FieldScopeController {
  constructor(@Inject(FieldScopes) private readonly s: FieldScopes) {}
  @Get(":key/scope") get(@Headers("x-actor") a: string | undefined, @Param("key") k: string) { readerOf(a); return this.s.view(k); }
  @Put(":key/scope") put(@Headers("x-actor") a: string | undefined, @Param("key") k: string, @Body() b: unknown) { return this.s.set(actorOf(a), k, b); }
}
