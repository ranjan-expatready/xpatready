// Shared application services: database, paths, simulated users and duties, the demo workspace, audit events and
// versioned edits. Plain classes registered as NestJS providers (explicit @Inject, so no decorator metadata is needed).
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { join } from "node:path";

export const STUDIO = join(import.meta.dirname, "..", "..");
export const PROTOTYPE = join(STUDIO, "..");
export const SOLUTION = join(PROTOTYPE, "..");
export const ROOT = join(SOLUTION, "..", "..");
export const OFFICIAL = join(SOLUTION, "official-sources", "ircc");
export const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");
export const NODE = process.execPath;
export const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://xr_studio@127.0.0.1:54329/xr_studio_demo";
export const WORKSPACE_KEY = "demo";
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

export function need(a: Actor, duty: string) {
  if (!(a.duties as readonly string[]).includes(duty)) throw new HttpException(`${a.name} (simulated) does not hold the ${duty} duty`, HttpStatus.FORBIDDEN);
}
export const fail = (msg: string, status = HttpStatus.BAD_REQUEST): never => { throw new HttpException(msg, status); };

@Injectable()
export class Workspace {
  private cached: string | null = null;
  constructor(@Inject(Db) private readonly db: Db) {}
  async id(): Promise<string> {
    if (this.cached) { const ok = await this.db.workspace.findUnique({ where: { id: this.cached } }); if (ok) return this.cached; }
    const w = await this.db.workspace.upsert({ where: { key: WORKSPACE_KEY }, update: {}, create: { key: WORKSPACE_KEY, label: "Demo workspace (disposable)" } });
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
