// PF-4 (contracts §7 §1.2, binding; SA-6-14, -15, BR-1, BR-9; AG-1-19): every route under /api/platform/ and
// /api/front-office/ declares what it needs, and the platform guard (guard.ts) refuses anything it was not given (default
// deny). A route declares one of:
//   @PermissionKeys("agent/staff:manage", …)  the signed-in staff member must hold every key named (roles only bundle keys);
//   @AnyStaff("why")                           any signed-in staff member of the firm (their own identity, their own licence);
//   @StaffSignIn("why")                        no session yet: the sign-in door itself (the local stand-in only, PF-4).
// A route with none of these stops the start-up with its name (guard.ts, assertEveryRouteDeclared). Firm routes accept
// only agent/* keys (SA-6-4, BR-4: platform roles hold system/* keys and the two never mix): a firm route naming another
// key stops the start-up, and the guard reads only a person's agent/* keys.
// core.ts's ConfigReadGuard leaves these paths to this guard (its one line, Lead 43's OK on #1744); the staff session
// travels as `Authorization: Bearer <token>`.
// Nest's decorators are applied as calls in this folder, not with @ syntax: api/tsconfig.json compiles decorators only for
// src/*.ts and src/features/** (adding src/platform/** is a later row for Lead B, Lead 43 on #1744).
import { HttpException, HttpStatus, SetMetadata } from "@nestjs/common";

export const PLATFORM_ACCESS = "platform:access";
export type PlatformAccess = { kind: "keys"; keys: string[] } | { kind: "any-staff"; why: string } | { kind: "sign-in"; why: string };

/** The paths the platform guard owns, in any letter case (Express routes ignore case: break M1). Every other route is left
 *  exactly as it was. The guard also takes any route that declares its access, whatever its path. */
export const PLATFORM_PATH = /^\/api\/(platform|front-office)(\/|$)/i;
/** Firm routes (every path the guard owns today) accept only the firm plane's keys. */
export const FIRM_KEY = /^agent\/[a-z][a-z0-9-]*:[a-z][a-z0-9.-]*$/;

const declare = (a: PlatformAccess) => SetMetadata(PLATFORM_ACCESS, a);
export const PermissionKeys = (...keys: string[]) => {
  if (!keys.length) throw new Error("PermissionKeys: name at least one key (or use AnyStaff with a reason)");
  return declare({ kind: "keys", keys });
};
export const AnyStaff = (why: string) => declare({ kind: "any-staff", why });
export const StaffSignIn = (why: string) => declare({ kind: "sign-in", why });

/** Today's duty words (engine/runtime/team.ts `Duty`; not imported: platform code never imports engine/), derived from
 *  keys (trace t3 §1: `represent` is holding the sign-off keys, SA-06 Appendix C): */
export const DUTY_KEYS = {
  /** The three sign-off keys (Owner and Case Manager by default). A representative of record also needs a licence record. */
  represent: ["agent/case:form-approve", "agent/case:review-approve", "agent/retainer:countersign"],
  /** Works on cases. */
  case: ["agent/case:edit"],
  /** Runs the firm's staff (Owner and Admin by default). */
  firm_admin: ["agent/staff:manage"],
} as const;
export type Duty = keyof typeof DUTY_KEYS;
export const dutiesOf = (keys: ReadonlySet<string>): Duty[] => (Object.keys(DUTY_KEYS) as Duty[]).filter((d) => DUTY_KEYS[d].every((k) => keys.has(k)));

/** What the guard puts on the request (req.platform). */
export type StaffContext = { staffId: string; firmId: string; firmKey: string; roles: string[]; keys: string[]; duties: Duty[]; authTime: number; via: "local" | "cognito" };
export const staffOf = (req: { platform?: StaffContext }): StaffContext => {
  if (!req.platform) return unauthorized("Sign in first: this needs a staff member's session (a bearer token).");   // never a 500 (break M1)
  return req.platform;
};

/** The problem answers of this module (type URLs as the rest of the app). */
export function problem(status: number, title: string, detail: string, extra: Record<string, unknown> = {}): never {
  throw new HttpException({ type: `https://expatready.local/problems/${extra.code ? String(extra.code).toLowerCase().replace(/_/g, "-") : status}`, title, status, detail, ...extra }, status as HttpStatus);
}
export function unauthorized(detail: string, code = "NOT_SIGNED_IN"): never { return problem(401, "Sign in again", detail, { code }); }
export function forbidden(detail: string, code = "NOT_ALLOWED"): never { return problem(403, "Not allowed", detail, { code }); }

/** Applies method decorators to one method of a class, and parameter decorators to its parameters in order (the calls the
 *  @ syntax would make). */
export function decorate<C extends { prototype: object }>(cls: C, method: string, methodDecorators: MethodDecorator[], paramDecorators: ParameterDecorator[] = []) {
  const proto = cls.prototype, d = Object.getOwnPropertyDescriptor(proto, method);
  if (!d) throw new Error(`decorate: ${String((cls as { name?: string }).name)} has no method ${method}`);
  for (const m of [...methodDecorators].reverse()) { const r = m(proto, method, d); if (r) Object.defineProperty(proto, method, r); }
  paramDecorators.forEach((p, i) => p(proto, method, i));
}
