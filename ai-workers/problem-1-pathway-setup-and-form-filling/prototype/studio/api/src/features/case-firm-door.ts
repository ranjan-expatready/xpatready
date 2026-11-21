// CS-W3 part 1 (Release 1 row R1.3; brief build-lead-c-briefs/CS-W3-1.md; spec design/cs-w3-spike-2026-11-16.md "Part 1's
// brief lines"; case-side contract v0.1 §8 step 5b; P-575, P-588 (4)): the case side's door. Once the walls are on
// (CS-W4), a case-side request that carries no firm reads nothing, so this guard finds the request's firm before the
// handler runs and only tags the request with it (PF-12's setRequestFirm). PF-4's enterRequest reads the tag, and PF-12's
// FirmWallsInterceptor, which runs after every guard, opens the handler's scope from it (inRequest): the handler and every
// query in it then run as that firm. No middleware, no second AsyncLocalStorage, no Db factory.
//   * /api/runtime/* with x-actor (the prototype's stand-in sign-in): staff → their firm in samples/firms.json, through
//     CS-W1's lookup (firmIdOfActor); a simulated client → the firm of the case in the path (case_firm_of_case), else of
//     their cases (case_firm_of_client; cases in more than one firm → 409, Build Lead C's ruling 1); never on the case
//     list, which the handler refuses a client (403, the same whatever the cases asked for). A firm id is never
//     taken from a value the caller typed: x-actor names a person, and the firm comes from that person's membership.
//   * /api/link/*: open, code/send and code by the body token's case (case_firm_of_link), as those handlers act on it;
//     every other link route by the Bearer session's case (case_firm_of_link_session).
//   * Routes that declare permission keys get their firm from PF-4's guard and are left alone; /api/demo/* is part 3's.
//   * No firm found → the route answers as it does today in its area (a case 404, a link 404 or 401), except a list: a
//     case list with no firm is refused (403), never an empty 200 once the walls are on.
//   * A request already tagged with another firm (PF-25's host routing) is refused (404), never overwritten.
// Features load in file-name order (features.ts registerFeatures), so this guard runs after core.ts's ConfigReadGuard and
// BEFORE PF-4's guard (platform-identity.ts); it is correct in either order, because it only tags the request and does
// its lookups (SECURITY DEFINER, firm-free) in its own fresh scope. Test: tests/check_csw3_firm_scope.ts.
import { HttpException, HttpStatus, Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { createHash } from "node:crypto";
import { ACTORS, Db, RUNTIME_ACTORS, type Actor } from "../core.ts";
import type { Feature } from "../features.ts";
import { firmIdOfActor } from "../firms.ts";
import { currentFirm, inRequest, notInFirm, setRequestFirm } from "../platform/firm-scope.ts";
import { PLATFORM_ACCESS, type PlatformAccess } from "../platform/identity/keys.ts";

type DoorReq = { method?: string; path?: string; url?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
/** The four narrow lookups, each answering a firm id or null (case_firm_of_client may throw TwoFirms). */
export type DoorLookups = {
  ofActor(a: Actor): Promise<string | null>;
  ofCase(caseId: string): Promise<string | null>;
  ofClient(actorId: string): Promise<string | null>;
  ofLink(tokenHash: string): Promise<string | null>;
  ofLinkSession(tokenHash: string): Promise<string | null>;
};
/** case_firm_of_client's refusal: the client's cases are in more than one firm. */
export class TwoFirms extends Error {}

const RUNTIME = /^\/api\/runtime(\/|$)/i, LINK = /^\/api\/link(\/|$)/i;
const CASE_IN_PATH = /^\/api\/runtime\/cases\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/|$)/i;
const CASE_LIST = /^\/api\/runtime\/cases\/?$/i;
/** The link's own doors, which act on the body's token only (person-link.ts linkByToken), never on a session. */
const TOKEN_DOORS = /^\/api\/link\/(open|code\/send|code)\/?$/i;
const BEARER = /^Bearer ([A-Za-z0-9_-]{43})$/, TOKEN = /^[A-Za-z0-9_-]{43}$/;
const sha = (x: string) => createHash("sha256").update(x).digest("hex");
const first = (h: string | string[] | undefined) => (Array.isArray(h) ? h[0] : h);
const pathOf = (req: DoorReq) => String(req.path ?? req.url ?? "").split("?")[0];
const actorNamed = (h: string | undefined): Actor | undefined => [...ACTORS, ...RUNTIME_ACTORS].find((x) => x.id === h || x.persona === h);

/** The firm this case-side request runs as: undefined when the door does not apply, null when none was found. */
export async function doorFirm(req: DoorReq, look: DoorLookups): Promise<string | null | undefined> {
  const path = pathOf(req);
  if (LINK.test(path)) {
    // The token doors read only the body's token, as their handlers do (breaker m1: a stray session header must not pick
    // the firm of a route that acts on the token); every other link route reads only the session.
    if (TOKEN_DOORS.test(path)) {
      const token = (req.body as { token?: unknown } | undefined)?.token;
      return typeof token === "string" && TOKEN.test(token) ? look.ofLink(sha(token)) : null;
    }
    const bearer = BEARER.exec(first(req.headers.authorization) ?? "");
    return bearer ? look.ofLinkSession(sha(bearer[1])) : null;
  }
  if (!RUNTIME.test(path)) return undefined;
  const actor = actorNamed(first(req.headers["x-actor"]));
  if (!actor) return undefined;   // nobody or an unknown name: the route answers 401 as today
  const duties = actor.duties as readonly string[];
  if (duties.includes("answer")) {
    // The case list is a staff read: a client without the case duty is refused there by the handler's own 403 (need),
    // the same answer whether or not the cases asked for exist or are theirs. The door looks nothing up for it, so it
    // can never answer 409 (two firms) or 403 NO_FIRM there and so hint at someone's cases (check_bk3_client_browser BR-1).
    if (CASE_LIST.test(path) && String(req.method ?? "GET").toUpperCase() !== "POST" && !duties.includes("case")) return undefined;
    const inPath = CASE_IN_PATH.exec(path);
    return inPath ? look.ofCase(inPath[1].toLowerCase()) : look.ofClient(actor.id);
  }
  return look.ofActor(actor);
}

/** The door's decision for one request, run in its own fresh scope (inRequest): it tags the request with its firm, or
 *  refuses. A request whose route declares permission keys is PF-4's and is never passed here. */
export async function passDoor(req: DoorReq, look: DoorLookups): Promise<void> {
  await inRequest(req, async () => {
    let firm: string | null | undefined;
    try { firm = await doorFirm(req, look); } catch (e) {
      if (e instanceof TwoFirms) throw new HttpException({ type: "https://expatready.local/problems/client-in-two-firms", title: "More than one firm", status: 409, code: "CLIENT_IN_TWO_FIRMS", detail: "This client's cases are in more than one firm. A real client sign-in is needed to choose one; open a case from its own link." }, HttpStatus.CONFLICT);
      throw e;
    }
    if (firm === undefined) return;
    if (!firm) {
      if (CASE_LIST.test(pathOf(req)) && String(req.method ?? "GET").toUpperCase() !== "POST")
        throw new HttpException({ type: "https://expatready.local/problems/no-firm", title: "No firm", status: 403, code: "NO_FIRM", detail: "A case list needs a firm, and none was found for this person." }, HttpStatus.FORBIDDEN);
      return;   // the route answers as today in its area (no case is reached)
    }
    const already = currentFirm();   // the tag an earlier step set (inRequest opened this scope from it)
    if (already && already.toLowerCase() !== firm.toLowerCase()) notInFirm();
    setRequestFirm(req, firm);
  });
}

/** The lookups through the database's narrow functions (migration 20261121100000_csw3_case_door; CS-W1's for staff). */
export function dbLookups(db: Db): DoorLookups {
  const one = async (rows: Promise<{ id: string | null }[]>) => (await rows)[0]?.id ?? null;
  return {
    ofActor: (a) => firmIdOfActor(db, a),
    ofCase: (id) => one(db.$queryRaw`select case_lookup.case_firm_of_case(${id}::uuid)::text as id`),
    ofClient: async (actorId) => {
      try { return await one(db.$queryRaw`select case_lookup.case_firm_of_client(${actorId})::text as id`); } catch (e) {
        // Prisma's raw-query error (P2010) carries the database's SQLSTATE in meta.code, as busy.ts reads it (review m2).
        const x = e as { code?: string; message?: string; meta?: { code?: string; message?: string } };
        if (x?.code === "P2010" && (x.meta?.code === "21000" || /case_firm_of_client: .*more than one firm/.test(x.meta?.message ?? x.message ?? ""))) throw new TwoFirms();
        throw e;
      }
    },
    ofLink: (h) => one(db.$queryRaw`select case_lookup.case_firm_of_link(${h})::text as id`),
    ofLinkSession: (h) => one(db.$queryRaw`select case_lookup.case_firm_of_link_session(${h})::text as id`),
  };
}

@Injectable()
export class CaseFirmDoor implements CanActivate {
  private readonly look: DoorLookups;
  constructor(@Inject(Db) db: Db, @Inject(Reflector) private readonly reflector: Reflector) { this.look = dbLookups(db); }
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== "http") return true;
    const access = this.reflector.getAllAndOverride<PlatformAccess>(PLATFORM_ACCESS, [ctx.getHandler(), ctx.getClass()]);
    if (access) return true;   // PF-4's guard reads this route's firm from the staff session
    await passDoor(ctx.switchToHttp().getRequest<DoorReq>(), this.look);
    return true;
  }
}

export default { providers: [CaseFirmDoor, { provide: APP_GUARD, useExisting: CaseFirmDoor }] } satisfies Feature;
