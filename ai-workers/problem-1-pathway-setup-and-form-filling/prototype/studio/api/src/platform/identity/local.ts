// PF-4: the local stand-in (tech gate entry 2: an HMAC-SHA256 token signed and checked with node:crypto; no library).
// Used only when PLATFORM_IDENTITY=local, which identityConfig refuses outside PLATFORM_ENVIRONMENT=local. Its token is
// shaped like a Cognito access token where the guard reads it: `token_use: "access"`, `sub`, `iat`, `exp`, `auth_time`,
// and `amr` saying whether the second step was done (["pwd", "otp"]; ["pwd"] alone is refused by the guard).
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { IdentityRefused, type IdentityPort, type VerifiedIdentity } from "./port.ts";

export const LOCAL_ISSUER = "expatready-local-standin";
/** A local session lasts one hour (Sample; Cognito's access tokens default to one hour as well). */
export const LOCAL_TTL_SECONDS = 3600;

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const HEADER = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));

export class LocalIdentity implements IdentityPort {
  readonly via = "local" as const;
  private readonly key: Buffer;
  constructor(secret: string | null, private readonly now: () => number) { this.key = secret ? Buffer.from(secret, "utf8") : randomBytes(32); }

  private sign(body: string) { return createHmac("sha256", this.key).update(body).digest(); }

  /** Issues a token for one of our staff ids. authTimeMs: when this sign-in happened (milliseconds). */
  issue(staffId: string, o: { authTimeMs: number; secondStep: boolean }): string {
    const nowS = this.now() / 1000;
    const payload = b64(JSON.stringify({ iss: LOCAL_ISSUER, token_use: "access", sub: staffId, iat: nowS, exp: nowS + LOCAL_TTL_SECONDS, auth_time: o.authTimeMs / 1000, amr: o.secondStep ? ["pwd", "otp"] : ["pwd"] }));
    return `${HEADER}.${payload}.${b64(this.sign(`${HEADER}.${payload}`))}`;
  }

  async verify(token: string): Promise<VerifiedIdentity> {
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== HEADER || !/^[A-Za-z0-9_-]{43}$/.test(parts[2])) throw new IdentityRefused("This sign-in token is not one this server issued. Sign in again.");
    const given = Buffer.from(parts[2], "base64url"), want = this.sign(`${parts[0]}.${parts[1]}`);
    if (given.length !== want.length || !timingSafeEqual(given, want)) throw new IdentityRefused("This sign-in token is not one this server issued. Sign in again.");
    let c: Record<string, unknown>;
    try { c = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>; } catch { throw new IdentityRefused("This sign-in token cannot be read. Sign in again."); }
    const nowS = this.now() / 1000;
    if (c.iss !== LOCAL_ISSUER || c.token_use !== "access") throw new IdentityRefused("This is not a sign-in (access) token. Sign in again.");
    if (typeof c.exp !== "number" || c.exp <= nowS) throw new IdentityRefused("Your session has ended. Sign in again.", "TOKEN_EXPIRED");
    if (typeof c.iat !== "number" || c.iat > nowS + 60 || typeof c.auth_time !== "number" || c.auth_time > nowS + 60) throw new IdentityRefused("This sign-in token is dated in the future. Sign in again.");
    if (typeof c.sub !== "string" || !c.sub) throw new IdentityRefused("This sign-in token names nobody. Sign in again.");
    const amr = Array.isArray(c.amr) ? c.amr : [];
    return { via: "local", lookup: { staffId: c.sub }, authTime: c.auth_time, secondStep: amr.includes("otp") };
  }
}
