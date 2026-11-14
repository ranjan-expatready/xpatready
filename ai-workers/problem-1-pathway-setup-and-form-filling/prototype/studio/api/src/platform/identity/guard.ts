// PF-4 (contracts §7 §1.2; SA-6-14 AUTHZ_UNCONFIGURED, AG-1-19): the one guard of /api/platform/* and /api/front-office/*.
// bearer token → staff member, grants and keys (PF-3's tables) → a deactivated person or a session started before the
// person's last revocation is refused at once (401) → the route's declared permission keys, all of them (403 otherwise)
// → { staffId, firmId, keys, duties } on the request (req.platform; read with staffOf). Any other path is left exactly as
// it was: this guard returns at once and the simulated-person header keeps its own guard (core.ts ConfigReadGuard, which
// in turn leaves these paths to this guard). The simulated-person header gives nothing here: no bearer token is a 401.
// At start-up every route under those paths must declare its access (keys.ts); one that does not, or a firm route naming
// a key outside agent/*, stops the start-up with its name.
import { Inject, Injectable, type CanActivate, type ExecutionContext, type OnModuleInit } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants.js";
import { ModulesContainer, Reflector } from "@nestjs/core";
import { FIRM_KEY, PLATFORM_ACCESS, PLATFORM_PATH, forbidden, type PlatformAccess, type StaffContext } from "./keys.ts";
import { PlatformIdentity } from "./service.ts";

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "ALL", "OPTIONS", "HEAD", "SEARCH"];
const join = (...p: string[]) => `/${p.map((s) => s.replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/")}`;

/** Every route the app serves under the platform paths, with its declared access (undefined when none). */
export function platformRoutes(modules: ModulesContainer, reflector: Reflector) {
  const out: { name: string; method: string; path: string; access: PlatformAccess | undefined }[] = [];
  for (const m of modules.values()) for (const wrapper of m.controllers.values()) {
    const ctrl = wrapper.metatype as (new (...a: never[]) => unknown) | undefined;
    if (!ctrl?.prototype) continue;
    const base = ([] as string[]).concat(Reflect.getMetadata(PATH_METADATA, ctrl) ?? "");
    for (const key of Object.getOwnPropertyNames(ctrl.prototype)) {
      if (key === "constructor") continue;
      const handler = ctrl.prototype[key as keyof typeof ctrl.prototype] as unknown;
      if (typeof handler !== "function" || Reflect.getMetadata(METHOD_METADATA, handler) === undefined) continue;
      const method = METHODS[Reflect.getMetadata(METHOD_METADATA, handler) as number] ?? "?";
      const paths = ([] as string[]).concat(Reflect.getMetadata(PATH_METADATA, handler) ?? "");
      for (const b of base) for (const p of paths) {
        const path = join(b, p);
        if (PLATFORM_PATH.test(path)) out.push({ name: `${ctrl.name}.${key}`, method, path, access: reflector.getAllAndOverride<PlatformAccess>(PLATFORM_ACCESS, [handler as () => unknown, ctrl]) });
      }
    }
  }
  return out;
}

/** The start-up rule: every platform route declares its access, and a firm route names agent/* keys only. */
export function assertEveryRouteDeclared(routes: ReturnType<typeof platformRoutes>) {
  const none = routes.filter((r) => !r.access).map((r) => `${r.name} (${r.method} ${r.path})`);
  if (none.length) throw new Error(`Platform routes with no declared permission keys (default deny; add @PermissionKeys, @AnyStaff or @StaffSignIn): ${none.join(", ")}`);
  const plane = routes.filter((r) => r.access?.kind === "keys" && r.access.keys.some((k) => !FIRM_KEY.test(k))).map((r) => `${r.name} (${r.method} ${r.path}: ${(r.access as { keys: string[] }).keys.filter((k) => !FIRM_KEY.test(k)).join(", ")})`);
  if (plane.length) throw new Error(`Firm routes accept only agent/* keys (SA-6-4): ${plane.join(", ")}`);
}

type Req = { method: string; path?: string; url?: string; headers: Record<string, string | string[] | undefined>; platform?: StaffContext };

export class PlatformGuard implements CanActivate, OnModuleInit {
  constructor(private readonly reflector: Reflector, private readonly modules: ModulesContainer, private readonly identity: PlatformIdentity) {}

  onModuleInit() { assertEveryRouteDeclared(platformRoutes(this.modules, this.reflector)); }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Req>();
    const access = this.reflector.getAllAndOverride<PlatformAccess>(PLATFORM_ACCESS, [ctx.getHandler(), ctx.getClass()]);
    // A declared platform route is guarded whatever the path's letter case (break M1); an undeclared one on these paths is refused.
    if (!access && !PLATFORM_PATH.test(req.path ?? req.url ?? "")) return true;
    if (!access) forbidden("This route declares no permission keys, so it is refused (default deny).", "AUTHZ_UNCONFIGURED");
    if (access.kind === "sign-in") return true;
    const h = req.headers.authorization, auth = Array.isArray(h) ? h[0] : h;
    const m = typeof auth === "string" ? /^Bearer\s+(\S+)$/i.exec(auth.trim()) : null;
    const staff = await this.identity.authenticate(m?.[1]);
    if (access.kind === "keys") {
      const missing = access.keys.filter((k) => !staff.keys.includes(k));
      if (missing.length) forbidden(`Your roles do not include the permission this needs (${missing.join(", ")}).`, "MISSING_PERMISSION");
    }
    req.platform = staff;
    return true;
  }
}
Injectable()(PlatformGuard);
[Reflector, ModulesContainer, PlatformIdentity].forEach((token, i) => Inject(token)(PlatformGuard, undefined, i));
