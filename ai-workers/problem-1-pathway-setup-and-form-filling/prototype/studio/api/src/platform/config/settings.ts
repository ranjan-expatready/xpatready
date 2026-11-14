// PF-24 (SA-8-1, SA-8-3, SA8-D1; SA-08 §3.1): the one typed configuration loader for every secret and service setting the
// platform reads. Read from the environment once (the deploy injects them from AWS Secrets Manager into the task's
// environment, PF-8; on the Mac and in lane copies they are simply unset). Rules:
//  * PLATFORM_ENVIRONMENT=test or production: every setting below is required; one missing stops the start-up, naming it.
//  * local (the default): each may be unset (that service is then off on this server), but one that is set must be valid.
//  * a refusal names the setting and the rule it broke, never its value; a secret is held as a `Secret` (secret.ts), so
//    it prints, logs and serialises as "[secret NAME]".
//  * a Stripe live key is refused outside production (no live money from the Mac, a lane or the test environment).
// A later row adds its own setting as one entry in SETTINGS (and its field in PlatformConfig). PF-23's redaction reads
// SECRET_SETTING_NAMES. Rotation: deploy/RUNBOOK-secrets.md. Test: tests/check_pf24_secrets.ts.
import { z } from "zod";
import { Secret } from "./secret.ts";

export const ENVIRONMENTS = ["local", "test", "production"] as const;
export type PlatformEnvironment = (typeof ENVIRONMENTS)[number];

/** The demo database on the Mac and in lane copies (as api/src/core.ts DATABASE_URL); never used in test or production. */
export const LOCAL_DATABASE_URL = "postgresql://xr_studio@127.0.0.1:54329/xr_studio_demo";

const KEY_ENTRY = /^[1-9][0-9]{0,5}:[A-Za-z0-9+/]{43}=$/;

type Setting = { name: string; secret: boolean; rule: z.ZodType<string>; expects: string; service: string };
const s = (service: string, name: string, secret: boolean, rule: z.ZodType<string>, expects: string): Setting => ({ service, name, secret, rule, expects });

/** Every setting, in the order a refusal lists them. */
export const SETTINGS: readonly Setting[] = Object.freeze([
  s("database", "DATABASE_URL", true, z.string().regex(/^postgres(ql)?:\/\/\S+$/), "a postgresql:// address"),
  s("cognito", "PLATFORM_COGNITO_USER_POOL_ID", false, z.string().regex(/^[a-z]{2}-[a-z]+-[0-9]_[A-Za-z0-9]{1,55}$/), "a user pool id such as ca-central-1_AbC123"),
  s("cognito", "PLATFORM_COGNITO_CLIENT_ID", false, z.string().regex(/^[A-Za-z0-9]{1,128}$/), "an app client id (letters and digits)"),
  s("stripe", "PLATFORM_STRIPE_SECRET_KEY", true, z.string().regex(/^(sk|rk)_(test|live)_[A-Za-z0-9]{8,255}$/), "a Stripe secret or restricted key (sk_… or rk_…)"),
  s("stripe", "PLATFORM_STRIPE_WEBHOOK_SECRET", true, z.string().regex(/^whsec_[A-Za-z0-9+/=]{8,255}$/), "a Stripe webhook signing secret (whsec_…)"),
  s("ses", "PLATFORM_SES_REGION", false, z.string().regex(/^[a-z]{2}-[a-z]+-[0-9]$/), "an AWS region such as ca-central-1 (SES signs with the task's role: no key)"),
  s("boldsign", "PLATFORM_BOLDSIGN_API_KEY", true, z.string().regex(/^[A-Za-z0-9+/=_-]{16,512}$/), "a BoldSign API key (16 or more characters)"),
  s("zoom", "PLATFORM_ZOOM_CLIENT_ID", false, z.string().regex(/^[A-Za-z0-9_-]{8,128}$/), "the Zoom app's client id"),
  s("zoom", "PLATFORM_ZOOM_CLIENT_SECRET", true, z.string().regex(/^[A-Za-z0-9_-]{16,256}$/), "the Zoom app's client secret (16 or more characters)"),
  s("zoom", "PLATFORM_ZOOM_WEBHOOK_SECRET_TOKEN", true, z.string().regex(/^[A-Za-z0-9_-]{16,256}$/), "the Zoom app's webhook secret token (16 or more characters)"),
  s("secret-box", "PLATFORM_SECRET_BOX_KEYS", true, z.string().refine((v) => v.split(",").every((e) => KEY_ENTRY.test(e.trim()))), "version:key pairs, comma-separated, each key 32 random bytes in base64 (e.g. 2:…=,1:…=)"),
  s("secret-box", "PLATFORM_SECRET_BOX_KEY_VERSION", false, z.string().regex(/^[1-9][0-9]{0,5}$/), "the key version new values are sealed with, one of the versions in PLATFORM_SECRET_BOX_KEYS"),
]);

/** The names whose values are secret: PF-23's log redaction drops them by name (and their values, wherever they appear). */
export const SECRET_SETTING_NAMES: readonly string[] = Object.freeze(SETTINGS.filter((x) => x.secret).map((x) => x.name));

export type SecretBoxKeys = { current: number; keys: ReadonlyMap<number, Secret> };
export type PlatformConfig = Readonly<{
  environment: PlatformEnvironment;
  databaseUrl: Secret;
  cognito: Readonly<{ userPoolId: string | null; clientId: string | null }>;
  stripe: Readonly<{ secretKey: Secret | null; webhookSecret: Secret | null }>;
  ses: Readonly<{ region: string | null }>;
  boldsign: Readonly<{ apiKey: Secret | null }>;
  zoom: Readonly<{ clientId: string | null; clientSecret: Secret | null; webhookSecretToken: Secret | null }>;
  /** null when this server holds no secret-box key (local only): sealing or opening then says so. */
  secretBox: SecretBoxKeys | null;
}>;

/** The configuration cannot start the app. Holds setting names only, never a value. */
export class ConfigRefused extends Error {
  constructor(readonly environment: string, readonly missing: string[], readonly invalid: { name: string; expects: string }[]) {
    super([
      `The app cannot start (PLATFORM_ENVIRONMENT=${environment}).`,
      missing.length ? `Missing required setting${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.` : "",
      ...invalid.map((i) => `${i.name} is set but not valid: expected ${i.expects}.`),
      "Values are never shown. How to supply them: deploy/RUNBOOK-secrets.md.",
    ].filter(Boolean).join(" "));
    this.name = "ConfigRefused";
  }
}

/** A read-only view of a private Map: no set, delete or clear, and not a Map, so Map.prototype.set.call on it throws
 *  too (break m6). The key ring is fixed once loaded. */
function frozenMap<K, V>(src: Map<K, V>): ReadonlyMap<K, V> {
  const m = new Map(src);
  const view: ReadonlyMap<K, V> = {
    get: (k) => m.get(k), has: (k) => m.has(k), get size() { return m.size; },
    forEach: (cb, self) => m.forEach((v, k) => cb.call(self, v, k, view)),
    entries: () => m.entries(), keys: () => m.keys(), values: () => m.values(), [Symbol.iterator]: () => m[Symbol.iterator](),
  };
  return Object.freeze(view);
}

/** Reads and checks every setting from `env`; throws ConfigRefused naming each missing or invalid one. */
export function loadPlatformConfig(env: NodeJS.ProcessEnv): PlatformConfig {
  const setEnv = (env.PLATFORM_ENVIRONMENT ?? "").trim();
  // A task on AWS (ECS sets these) never falls back to local: a task definition that forgot the setting would otherwise
  // start with every secret optional (break m7).
  if (!setEnv && (env.ECS_CONTAINER_METADATA_URI_V4 || env.ECS_CONTAINER_METADATA_URI || env.AWS_EXECUTION_ENV)) throw new ConfigRefused("unset", ["PLATFORM_ENVIRONMENT"], []);
  const rawEnv = setEnv || "local";
  // The refusal never repeats what was set (it may be a pasted key, break m1).
  if (!(ENVIRONMENTS as readonly string[]).includes(rawEnv)) throw new ConfigRefused("not recognised", [], [{ name: "PLATFORM_ENVIRONMENT", expects: "local, test or production" }]);
  const environment = rawEnv as PlatformEnvironment;
  const required = environment !== "local";
  const missing: string[] = [], invalid: { name: string; expects: string }[] = [];
  const got = new Map<string, string>();
  for (const x of SETTINGS) {
    const v = env[x.name]?.trim();
    if (!v) { if (required) missing.push(x.name); continue; }
    if (!x.rule.safeParse(v).success) { invalid.push({ name: x.name, expects: x.expects }); continue; }
    got.set(x.name, v);
  }
  // Rules across settings (names only in what they say).
  const stripeKey = got.get("PLATFORM_STRIPE_SECRET_KEY");
  if (stripeKey && /^(sk|rk)_live_/.test(stripeKey) && environment !== "production") invalid.push({ name: "PLATFORM_STRIPE_SECRET_KEY", expects: `a test-mode key (sk_test_… or rk_test_…): a live key is refused when PLATFORM_ENVIRONMENT=${environment}` });
  let secretBox: SecretBoxKeys | null = null;
  const keysRaw = got.get("PLATFORM_SECRET_BOX_KEYS"), versionRaw = got.get("PLATFORM_SECRET_BOX_KEY_VERSION");
  if (keysRaw || versionRaw) {
    // One without the other is refused even locally: half a key ring would seal nothing and say nothing.
    for (const n of ["PLATFORM_SECRET_BOX_KEYS", "PLATFORM_SECRET_BOX_KEY_VERSION"])
      if (!got.has(n) && !missing.includes(n) && !invalid.some((i) => i.name === n)) missing.push(n);
    if (keysRaw && versionRaw) {
      const keys = new Map<number, Secret>();
      let dup = false;
      for (const e of keysRaw.split(",").map((t) => t.trim())) {
        const at = e.indexOf(":"), version = Number(e.slice(0, at));
        if (keys.has(version)) dup = true;
        keys.set(version, new Secret(`PLATFORM_SECRET_BOX_KEYS v${version}`, e.slice(at + 1)));
      }
      const current = Number(versionRaw);
      // Compared as bytes, in canonical base64 only: two spellings of one key never pass as two keys (break m2).
      const bytes = [...keys.values()].map((k) => Buffer.from(k.reveal(), "base64"));
      const canonical = [...keys.values()].every((k) => Buffer.from(k.reveal(), "base64").toString("base64") === k.reveal());
      const distinct = new Set(bytes.map((b) => b.toString("hex"))).size === keys.size;
      const random = bytes.every((b) => b.length === 32 && new Set(b).size > 8);
      if (dup || !distinct || !canonical || !random) invalid.push({ name: "PLATFORM_SECRET_BOX_KEYS", expects: "each version once, each with its own random 32-byte key written as openssl rand -base64 32 prints it" });
      else if (!keys.has(current)) invalid.push({ name: "PLATFORM_SECRET_BOX_KEY_VERSION", expects: "one of the versions listed in PLATFORM_SECRET_BOX_KEYS" });
      else secretBox = Object.freeze({ current, keys: frozenMap(keys) });
    }
  }
  if (missing.length || invalid.length) throw new ConfigRefused(environment, missing, invalid);
  const secret = (name: string) => (got.has(name) ? new Secret(name, got.get(name)!) : null);
  const plain = (name: string) => got.get(name) ?? null;
  return Object.freeze({
    environment,
    databaseUrl: secret("DATABASE_URL") ?? new Secret("DATABASE_URL", LOCAL_DATABASE_URL),
    cognito: Object.freeze({ userPoolId: plain("PLATFORM_COGNITO_USER_POOL_ID"), clientId: plain("PLATFORM_COGNITO_CLIENT_ID") }),
    stripe: Object.freeze({ secretKey: secret("PLATFORM_STRIPE_SECRET_KEY"), webhookSecret: secret("PLATFORM_STRIPE_WEBHOOK_SECRET") }),
    ses: Object.freeze({ region: plain("PLATFORM_SES_REGION") }),
    boldsign: Object.freeze({ apiKey: secret("PLATFORM_BOLDSIGN_API_KEY") }),
    zoom: Object.freeze({ clientId: plain("PLATFORM_ZOOM_CLIENT_ID"), clientSecret: secret("PLATFORM_ZOOM_CLIENT_SECRET"), webhookSecretToken: secret("PLATFORM_ZOOM_WEBHOOK_SECRET_TOKEN") }),
    secretBox,
  });
}

/**
 * Secret settings taken out of process.env once loaded, so a child process (a PDF reader, the AI launcher, the form
 * filler: each starts with the server's environment) never inherits them (break M1). DATABASE_URL stays: api/src/core.ts
 * reads it from the environment itself (outside api/src/platform/; a later row moves it to this loader) and child jobs
 * may use it.
 */
export const SCRUBBED_FROM_ENV: readonly string[] = Object.freeze(SECRET_SETTING_NAMES.filter((n) => n !== "DATABASE_URL"));

let loaded: PlatformConfig | null = null;
/** This process's configuration, read from process.env the first time it is asked for and then kept (read once). */
export function platformConfig(): PlatformConfig {
  if (!loaded) {
    loaded = loadPlatformConfig(process.env);
    for (const n of SCRUBBED_FROM_ENV) delete process.env[n];
  }
  return loaded;
}
