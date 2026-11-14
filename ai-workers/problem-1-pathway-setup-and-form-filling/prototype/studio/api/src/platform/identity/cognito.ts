// PF-4 (tech gate entry 2): the Cognito adapter. aws-jwt-verify 5.2.1 checks the access token against the pool's public
// keys: signature, issuer (the pool's address in ca-central-1), expiry, `token_use: "access"` (an ID token is refused) and
// `client_id` (Cognito access tokens carry no `aud`). The keys are warmed at start (`hydrate()`); tests load a test key
// set with `cacheJwks()` and never reach the network. Two-step sign-in: the pool requires it for everyone (P-567;
// PLATFORM_POOL_MFA_REQUIRED, default true); set to false, every Cognito sign-in is refused and says why. PF-4b verifies
// the pool's real settings at AWS's own documentation; nothing more is assumed here.
import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { Jwks } from "aws-jwt-verify/jwk";
import { IdentityRefused, type IdentityConfig, type IdentityPort, type VerifiedIdentity } from "./port.ts";

/** The pool must live in the Canadian region (contracts §0.3). */
export const POOL_REGION = "ca-central-1";
const POOL_ID = /^ca-central-1_[0-9A-Za-z]+$/;

export class CognitoIdentity implements IdentityPort {
  readonly via = "cognito" as const;
  private readonly verifier: ReturnType<typeof CognitoIdentity.make> | null;
  private readonly notReady: string | null;

  private static make(userPoolId: string, clientId: string) { return CognitoJwtVerifier.create({ userPoolId, tokenUse: "access", clientId }); }

  constructor(private readonly config: IdentityConfig["cognito"]) {
    const { userPoolId, clientId } = config;
    if (!userPoolId || !clientId) this.notReady = "Staff sign-in is not set up on this server (no Cognito pool or app client is configured).";
    else if (!POOL_ID.test(userPoolId)) this.notReady = `Staff sign-in is not set up on this server: the Cognito pool must be in ${POOL_REGION}.`;
    else this.notReady = null;
    this.verifier = this.notReady ? null : CognitoIdentity.make(userPoolId!, clientId!);
  }

  /** Whether the adapter can verify anything (a pool and client in ca-central-1 are configured). */
  get ready() { return !this.notReady; }

  async warm() { if (this.verifier) await this.verifier.hydrate(); }

  /** Tests only: the key set to verify with (no network). */
  cacheJwks(jwks: Jwks) { if (!this.verifier) throw new Error(this.notReady!); this.verifier.cacheJwks(jwks); }

  async verify(token: string): Promise<VerifiedIdentity> {
    if (!this.verifier) throw new IdentityRefused(this.notReady!, "SIGN_IN_NOT_SET_UP");
    if (!this.config.mfaRequired) throw new IdentityRefused("Sign-in is refused: this server's Cognito pool is not set to require two-step sign-in for every staff member (PLATFORM_POOL_MFA_REQUIRED=false), and every staff member must use two-step sign-in.", "TWO_STEP_REQUIRED");
    let p: Record<string, unknown>;
    try { p = (await this.verifier.verify(token)) as unknown as Record<string, unknown>; }
    catch (e) { throw new IdentityRefused(reasonOf(e), /Expired/.test(String((e as Error)?.name)) ? "TOKEN_EXPIRED" : "TOKEN_REFUSED"); }
    if (typeof p.sub !== "string" || !p.sub) throw new IdentityRefused("This sign-in token names nobody. Sign in again.");
    if (typeof p.auth_time !== "number") throw new IdentityRefused("This sign-in token does not say when you signed in. Sign in again.");
    return { via: "cognito", lookup: { identitySubject: p.sub }, authTime: p.auth_time, secondStep: true };
  }
}

/** A plain reason for each refusal the verifier gives (its own message names the claim; the token itself is never echoed). */
function reasonOf(e: unknown): string {
  const name = String((e as Error)?.name ?? ""), msg = String((e as Error)?.message ?? "");
  if (/Expired/.test(name)) return "Your session has ended. Sign in again.";
  if (/Issuer/.test(name)) return "This sign-in token was issued by another sign-in service. Sign in again.";
  if (/token_use|tokenUse/i.test(msg)) return "This is not a sign-in (access) token: an ID token cannot be used here.";
  if (/client_id|clientId|Audience/i.test(name + msg)) return "This sign-in token is for another application. Sign in again.";
  if (/Signature|Jwk|Kid/i.test(name)) return "This sign-in token's signature does not match the sign-in service's keys. Sign in again.";
  return "This sign-in token is not valid. Sign in again.";
}
