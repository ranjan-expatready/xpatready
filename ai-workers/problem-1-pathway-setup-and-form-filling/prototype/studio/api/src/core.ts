// Shared application services: database, paths, simulated users and duties, the demo workspace, audit events and
// versioned edits. Plain classes registered as NestJS providers (explicit @Inject, so no decorator metadata is needed).
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { HttpException, HttpStatus, Inject, Injectable, SetMetadata, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const STUDIO = join(import.meta.dirname, "..", "..");
export const PROTOTYPE = join(STUDIO, "..");
export const SOLUTION = join(PROTOTYPE, "..");
export const ROOT = join(SOLUTION, "..", "..");
export const OFFICIAL = join(SOLUTION, "official-sources", "ircc");
export const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");
export const NODE = process.execPath;
export const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://xr_studio@127.0.0.1:54329/xr_studio_demo";
/** The demo workspace's key: the one workspace where Sample content passes, released as a Demo release (P-240, G3). */
export const DEMO_WORKSPACE_KEY = "demo";
/** G2/G1 (the tech lead on #558, #568): an isolated copy may run as another, non-demo workspace
 *  (STUDIO_WORKSPACE_KEY=firm), where Sample content never releases (P-240). Default and every demo copy: "demo". */
export const WORKSPACE_KEY = (() => { const k = process.env.STUDIO_WORKSPACE_KEY?.trim() || "demo"; if (!/^[a-z][a-z0-9_-]{0,39}$/.test(k)) throw new Error(`STUDIO_WORKSPACE_KEY "${k}": use lower-case letters, digits, _ or -`); return k; })();
/** Whether this server's workspace is the demo workspace (G1's Sample source condition; G2's Demo release). */
export const isDemoWorkspace = () => WORKSPACE_KEY === DEMO_WORKSPACE_KEY;
/** Working files (uploads, outputs, reset log). STUDIO_VAR lets an isolated copy (the 100-program scale database) keep its
 *  own files, so its reset can never touch the demo workspace's files. */
export const VAR_ROOT = process.env.STUDIO_VAR ?? join(STUDIO, "var");
export const VAR = (ws: string) => join(VAR_ROOT, "workspaces", ws);

@Injectable()
export class Db extends PrismaClient {
  // The driver adapter sends times without a zone; the session time zone is UTC so PostgreSQL stores the real moment,
  // whatever the server's own zone (QA-5: it was Asia/Kolkata, so every write landed 5 h 30 min early).
  constructor() { super({ adapter: new PrismaPg({ connectionString: DATABASE_URL, options: "-c TimeZone=UTC" }) }); }
}

/** Simulated people (labelled "Simulated" on every screen). Roles follow the team's staff roles; the SME is a duty of
 *  a content publisher, not another role (D254). No real sign-in: the persona switch is a demonstration control. */
export const ACTORS = [
  { id: "user-A", persona: "author", name: "Configuration author", role: "Super Admin · content publisher", duties: ["author", "review"], area: "studio" },
  { id: "user-C", persona: "sme", name: "Content reviewer", role: "Content publisher · Immigration SME duty", duties: ["review", "sme"], area: "studio" },
  { id: "user-B", persona: "approver", name: "Approver", role: "Content publisher · second person", duties: ["review", "approve"], area: "studio" },
] as const;
/** Simulated case people (runtime lane, R1): the firm's case officer and two client logins (Sample households). They
 *  hold no configuration duty; configuration people hold no case duty. */
export const RUNTIME_ACTORS = [
  { id: "user-O", persona: "officer", name: "Case officer", role: "Firm staff · case officer", duties: ["case"], area: "runtime" },
  // C6.11 (BR-20, SI-9): the Sample firm's representative (also its firm admin) and the Sample solo firm's one person,
  // who holds all three duties. Their firm and licence are in samples/firms.json (firmOf in api/src/team.ts).
  { id: "user-R", persona: "representative", name: "Representative", role: "Firm staff · representative · firm admin", duties: ["case", "represent", "firm_admin"], area: "runtime" },
  { id: "user-T", persona: "representative-2", name: "Second representative", role: "Firm staff · representative", duties: ["case", "represent"], area: "runtime" },
  { id: "user-S", persona: "solo", name: "Solo representative", role: "Solo firm · representative · case officer · firm admin", duties: ["case", "represent", "firm_admin"], area: "runtime" },
  { id: "user-P", persona: "client", name: "Client A", role: "Client · principal applicant", duties: ["answer"], area: "client" },
  { id: "user-Q", persona: "client-b", name: "Client B", role: "Client · principal applicant", duties: ["answer"], area: "client" },
] as const;
export type Actor = (typeof ACTORS)[number] | (typeof RUNTIME_ACTORS)[number];
/** Deny by default (STANDARDS §6, S-1): a missing or unknown actor is refused, never treated as the author. */
export function actorOf(header: string | undefined): Actor {
  const a = [...ACTORS, ...RUNTIME_ACTORS].find((x) => x.id === header || x.persona === header);
  if (!a) throw new HttpException({ type: "https://expatready.local/problems/unknown-actor", title: "Who is this?", status: 401, detail: "Choose a simulated person first: the request named no known person." }, HttpStatus.UNAUTHORIZED);
  return a;
}

/** Break m8 (27 Oct): reads of the configuration (catalogue, Structure, path options, where-used, the name check) are
 *  denied by default like writes: a known configuration person reads; nobody, an unknown name or a case person does not. */
export function readerOf(header: string | undefined): Actor {
  const a = actorOf(header);
  if (a.area !== "studio") throw new HttpException({ type: "https://expatready.local/problems/not-configuration", title: "Not for case people", status: 403, detail: `${a.name} (simulated) works on cases; the configuration is read in the Product Studio by its own people.` }, HttpStatus.FORBIDDEN);
  return a;
}

/** QA-53 (STANDARDS §6, deny by default): every GET under /api is a configuration read, refused to nobody (401) and to
 *  case people (403) by the one guard below, unless the route is marked as one of the few reads that are not. A new
 *  route is therefore guarded without anyone remembering to. Writes keep their own duty checks (need). */
export const READ_SCOPE = "studio:read-scope";
/** A read case people make as well, left exactly as it was: the runtime controllers, the releases Open a case lists, and
 *  the activity feed (its own rule admits the case officer). */
export const CaseRead = () => SetMetadata(READ_SCOPE, "case");
/** A read with no person: who-am-I before a person is chosen (also the copies' health check), and file links the browser
 *  opens without the person header (their ids are random and only reached from a guarded page). */
export const OpenRead = (_why: string) => SetMetadata(READ_SCOPE, "open");
/** QA-65: a configuration read made by POST (a plan or a check that changes nothing): guarded like a GET. */
export const ConfigRead = () => SetMetadata(READ_SCOPE, "config");
@Injectable()
export class ConfigReadGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ method: string; path?: string; url?: string; headers: Record<string, string | string[] | undefined> }>();
    // C6.16 (challenge M2, BR-5): an adult's link session (a Bearer token) reaches /api/link/* only; anywhere else it is
    // refused, never read as nobody or mixed with a simulated person.
    const auth = req.headers.authorization, path = req.path ?? req.url ?? "";
    if (/^\/api\/(platform|front-office)(\/|$)/.test(path)) return true;   // PF-4 (Lead 43 OK on #1744): these paths belong to the platform guard (api/src/platform/identity/guard.ts)
    if (typeof auth === "string" && /^bearer\s/i.test(auth) && !path.startsWith("/api/link/")) throw new HttpException({ type: "https://expatready.local/problems/link-only", title: "Not for a link session", status: 403, detail: "A person's own link reaches only their own questions, never the firm's or the client's pages." }, HttpStatus.FORBIDDEN);
    const scope = this.reflector.getAllAndOverride<string>(READ_SCOPE, [ctx.getHandler(), ctx.getClass()]);
    if (scope === "open") return true;
    if (req.method !== "GET" && req.method !== "HEAD" && scope !== "config") return true;
    const h = req.headers["x-actor"], who = Array.isArray(h) ? h[0] : h;
    // QA-65: a case read still needs a known person (nobody and an unknown name 401); only an open read needs none.
    if (scope === "case") actorOf(who); else readerOf(who);
    return true;
  }
}

export function need(a: Actor, duty: string) {
  if (!(a.duties as readonly string[]).includes(duty)) throw new HttpException(`${a.name} (simulated) does not hold the ${duty} duty`, HttpStatus.FORBIDDEN);
}
export const fail = (msg: string, status = HttpStatus.BAD_REQUEST): never => { throw new HttpException(msg, status); };

/** The built-in starting person roles, an import file (STANDARDS §3.1), not constants in code. */
export const STARTING_ROLES = (JSON.parse(readFileSync(join(STUDIO, "samples", "person-roles.json"), "utf8")) as { roles: { key: string; label: string; meaning: string; takesPartInCase: boolean; mayBeApplicant: boolean }[] }).roles;

@Injectable()
export class Workspace {
  private cached: string | null = null;
  constructor(@Inject(Db) private readonly db: Db) {}
  /** C3.13 red check (nightly 41381724752, #493's CI 41419363380): on an empty database the page's first calls and a
   *  sample load each created the workspace at once; the losers' duplicate (P2002) answered 409 "Already in progress or
   *  already exists". Concurrent callers now share one creation, and a duplicate from another process re-reads the row. */
  private creating: Promise<string> | null = null;
  async id(): Promise<string> {
    if (this.cached) { const ok = await this.db.workspace.findUnique({ where: { id: this.cached } }); if (ok) return this.cached; }
    this.creating ??= this.create().finally(() => { this.creating = null; });
    return this.creating;
  }
  private async create(): Promise<string> {
    const make = () => this.db.workspace.upsert({ where: { key: WORKSPACE_KEY }, update: {}, create: { key: WORKSPACE_KEY, label: isDemoWorkspace() ? "Demo workspace (disposable)" : `Workspace ${WORKSPACE_KEY} (not the demo)` } });
    const w = await make().catch((e: { code?: string }) => { if (e?.code === "P2002") return make(); throw e; });
    // S5 (M3): a workspace starts with the six built-in person roles (Reset keeps them; Sample until the expert confirms).
    if (!(await this.db.personRole.count({ where: { workspaceId: w.id } }))) await this.db.personRole.createMany({ skipDuplicates: true, data: STARTING_ROLES.map((r, i) => ({ workspaceId: w.id, roleKey: r.key, label: r.label, meaning: r.meaning, takesPartInCase: r.takesPartInCase, mayBeApplicant: r.mayBeApplicant, builtIn: true, displayOrder: i + 1 })) });
    this.cached = w.id;
    return w.id;
  }
  forget() { this.cached = null; }
}

@Injectable()
export class Audit {
  constructor(@Inject(Db) private readonly db: Db) {}
  /** combinationId: the configuration row an edit belongs to (review derives every draft author from these events). */
  async log(workspaceId: string, actor: string, action: string, entity: string, entityKey: string | null, summary: string, detail?: unknown, combinationId?: string) {
    await this.db.auditEvent.create({ data: { workspaceId, actor, action, entity, entityKey, summary: summary.slice(0, 600), detail: detail === undefined ? undefined : (detail as any), combinationId: combinationId ?? null } });
  }
}

/** Versioned edit: a DRAFT row changes in place; a PUBLISHED row gets a new DRAFT version that supersedes it, so a
 *  released configuration (a frozen snapshot) never changes under case work. Returns the draft row. */
export async function revise<T extends { id: string; version: number; status: string }>(
  delegate: any, rows: T[], changes: Record<string, unknown>, by: string, copy: (r: T) => Record<string, unknown>,
): Promise<{ row: T; created: boolean }> {
  const newest = [...rows].sort((a, b) => b.version - a.version)[0];
  if (!newest) fail("no such definition", HttpStatus.NOT_FOUND);
  if (newest.status === "DRAFT") return { row: await delegate.update({ where: { id: newest.id }, data: { ...changes, updatedBy: by } }), created: false };
  return { row: await delegate.create({ data: { ...copy(newest), ...changes, version: newest.version + 1, status: "DRAFT", supersedesId: newest.id, updatedBy: by } }), created: true };
}

/** Removes a row's own bookkeeping columns before it is copied into a new version. */
export const strip = (r: any) => { const { id, version, status, supersedesId, updatedAt, updatedBy, ...rest } = r; void id; void version; void status; void supersedesId; void updatedAt; void updatedBy; return rest; };
