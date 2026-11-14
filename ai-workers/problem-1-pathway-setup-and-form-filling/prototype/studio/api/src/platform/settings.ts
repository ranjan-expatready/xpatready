// PF-3 (contracts §7 "Firm settings", Lead 37 ruling; AG-16-3, -24, -59): the typed settings home. A module registers a
// key with a zod schema, a default and the permission key that may change it; a firm's value is read with the default
// when unset; a write whose value fails the key's schema is refused; every change writes one audit_event line in its
// own transaction (AUD-1 owns the trail; until it adds firm_id, the line carries the caller's workspace and the firm in its
// entity key and detail). Known gap, for AUD-1 / the reset's owner: the demo reset deletes the workspace's audit lines
// (and sweeps lines of no workspace), while platform rows stay, so after a reset a setting value has no trail.
// Other modules register their own keys (e.g. front office's web-form defaults) by calling registerSetting.
import { HttpException, HttpStatus } from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { firmScope } from "./firm-scope.ts";

export type SettingDefinition<T> = {
  key: string;
  ownerModule: string;
  description: string;
  schema: z.ZodType<T>;
  default: T;
  /** The permission key that may change it (SA-06 §10b); routes check it (PF-4). */
  changePermission: string;
};

type Tx = Prisma.TransactionClient;
type DbOrTx = PrismaClient | Tx;

const REGISTRY = new Map<string, SettingDefinition<unknown>>();

/** Registers a setting. A key is registered once; its default must pass its own schema. */
export function registerSetting<T>(def: SettingDefinition<T>): SettingDefinition<T> {
  if (!/^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$/.test(def.key)) throw new Error(`registerSetting: "${def.key}" is not a key (module.name)`);
  if (REGISTRY.has(def.key)) throw new Error(`registerSetting: "${def.key}" is already registered`);
  const ok = def.schema.safeParse(def.default);
  if (!ok.success) throw new Error(`registerSetting: the default of "${def.key}" fails its own schema: ${ok.error.issues.map((i) => i.message).join("; ")}`);
  REGISTRY.set(def.key, def as SettingDefinition<unknown>);
  return def;
}

export const registeredSettings = () => [...REGISTRY.values()];

export class SettingRefused extends HttpException {
  constructor(detail: string, readonly issues: string[] = []) {
    super({ type: "https://expatready.local/problems/setting-refused", title: "Setting not saved", status: 400, detail, issues }, HttpStatus.BAD_REQUEST);
  }
}

function definitionOf(key: string): SettingDefinition<unknown> {
  const def = REGISTRY.get(key);
  if (!def) throw new SettingRefused(`There is no setting "${key}".`);
  return def;
}

const definitionRow = (def: SettingDefinition<unknown>) => ({
  ownerModule: def.ownerModule,
  description: def.description,
  valueSchema: z.toJSONSchema(def.schema, { unrepresentable: "any" }) as Prisma.InputJsonValue,
  defaultValue: def.default as Prisma.InputJsonValue,
  changePermission: def.changePermission,
});

/** Writes every registered key's definition row (schema as JSON Schema, default, permission). Idempotent. */
export async function syncSettingDefinitions(db: DbOrTx): Promise<number> {
  for (const def of REGISTRY.values()) {
    const row = definitionRow(def);
    await db.platformSettingDefinition.upsert({ where: { key: def.key }, create: { key: def.key, ...row }, update: row });
  }
  return REGISTRY.size;
}

/** A firm's value of a registered key, or the key's default when the firm has none. A stored value that no longer fits
 *  the schema is an error, never silently replaced. */
export async function readSetting<T>(db: DbOrTx, firmId: string, key: string): Promise<T> {
  const def = definitionOf(key);
  const row = await db.platformFirmSetting.findFirst({ where: firmScope(firmId, { key }) });
  if (!row) return def.default as T;
  const parsed = def.schema.safeParse(row.value);
  if (!parsed.success) throw new Error(`readSetting: the stored value of "${key}" no longer fits its schema`);
  return parsed.data as T;
}

/** Every registered key's value for one firm (defaults filled in). */
export async function readSettings(db: DbOrTx, firmId: string): Promise<Record<string, unknown>> {
  const rows = await db.platformFirmSetting.findMany({ where: firmScope(firmId) });
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const out: Record<string, unknown> = {};
  for (const def of REGISTRY.values()) {
    if (!stored.has(def.key)) { out[def.key] = def.default; continue; }
    const p = def.schema.safeParse(stored.get(def.key));
    if (!p.success) throw new Error(`readSettings: the stored value of "${def.key}" no longer fits its schema`);
    out[def.key] = p.data;
  }
  return out;
}

export type SettingWrite = {
  firmId: string;
  key: string;
  value: unknown;
  /** Who changes it (the staff member's actor or staff id). */
  by: string;
  /** audit_event's workspace column (required until AUD-1 adds firm_id): the request's workspace. */
  workspaceId: string;
};

/** Saves a firm's value of a registered key and writes one audit line, in one transaction: a value that fails the key's
 *  schema is refused (nothing written), and a failed audit line rolls the change back. Given a transaction client, it
 *  runs inside the caller's transaction. */
export async function writeSetting(db: DbOrTx, w: SettingWrite): Promise<{ key: string; value: unknown; changed: boolean }> {
  const def = definitionOf(w.key);
  if (typeof w.by !== "string" || !w.by.trim()) throw new SettingRefused("A setting change needs who makes it.");
  const parsed = def.schema.safeParse(w.value);
  if (!parsed.success) throw new SettingRefused(`The value for "${w.key}" is not allowed.`, parsed.error.issues.map((i) => `${i.path.join(".") || "value"}: ${i.message}`));
  const value = parsed.data as Prisma.InputJsonValue;
  const scope = firmScope(w.firmId, { key: w.key });
  const run = async (tx: Tx) => {
    const firm = await tx.platformFirm.findUnique({ where: { id: scope.firmId }, select: { id: true, key: true } });
    if (!firm) throw new SettingRefused("There is no such firm.");
    const row = definitionRow(def);
    await tx.platformSettingDefinition.upsert({ where: { key: def.key }, create: { key: def.key, ...row }, update: row });
    const before = await tx.platformFirmSetting.findFirst({ where: scope });
    const from = before ? before.value : (def.default as Prisma.InputJsonValue);
    const changed = JSON.stringify(from) !== JSON.stringify(value);
    await tx.platformFirmSetting.upsert({
      where: { firmId_key: { firmId: scope.firmId, key: w.key } },
      create: { firmId: scope.firmId, key: w.key, value, changedBy: w.by },
      update: { value, changedBy: w.by, changedAt: new Date() },
    });
    await tx.auditEvent.create({ data: {
      workspaceId: w.workspaceId, actor: w.by, action: "platform.setting.change", entity: "platform_firm_setting",
      entityKey: `${scope.firmId}:${w.key}`, summary: `Firm ${firm.key}: setting ${w.key} ${changed ? "changed" : "saved unchanged"}`.slice(0, 600),
      detail: { firmId: scope.firmId, firmKey: firm.key, key: w.key, from, to: value },
    } });
    return { key: w.key, value: parsed.data, changed };
  };
  return "$transaction" in db ? (db as PrismaClient).$transaction(run) : run(db as Tx);
}

// ---------------------------------------------------------------------------------------------------- the first keys
// Contracts §7: time zone, default language, currency (CAD), business hours (Sample Mon-Fri 09:00-17:00), closed days,
// everyone-sees-all, "Require two-step sign-in for all staff". Defaults are Sample unless a source says otherwise.
const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "a time as HH:MM (24-hour)");
const DAY = z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);
// The zone's own spelling only (Intl also takes "america/toronto"; break m-11).
const isZone = (s: string) => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: s }).resolvedOptions().timeZone === s && (s.includes("/") || s === "UTC"); } catch { return false; } };
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

export const TIME_ZONE = registerSetting({
  key: "platform.time_zone", ownerModule: "platform", changePermission: "agent/settings:edit",
  description: "The firm's time zone (an IANA zone name). Sample default America/Toronto, the zone the case side uses.",
  schema: z.string().refine(isZone, "an IANA time zone, e.g. America/Toronto"), default: "America/Toronto",
});
export const LANGUAGE = registerSetting({
  key: "platform.language", ownerModule: "platform", changePermission: "agent/settings:edit",
  description: "The firm's default language (English or French).",
  schema: z.enum(["en", "fr"]), default: "en" as "en" | "fr",
});
export const CURRENCY = registerSetting({
  key: "platform.currency", ownerModule: "platform", changePermission: "agent/settings:edit",
  description: "The firm's default currency: CAD or USD (SA-06 §10b agent/settings:edit, X-6); default CAD.",
  schema: z.enum(["CAD", "USD"]), default: "CAD" as "CAD" | "USD",
});
export const BUSINESS_HOURS = registerSetting({
  key: "platform.business_hours", ownerModule: "platform", changePermission: "agent/settings:edit",
  description: "Opening hours per weekday, in the firm's time zone; a day not listed is closed. Sample Mon-Fri 09:00-17:00.",
  schema: z.array(z.object({ day: DAY, opens: HHMM, closes: HHMM }).strict().refine((h) => h.opens < h.closes, "opens before it closes"))
    .refine((a) => new Set(a.map((h) => h.day)).size === a.length, "each day once"),
  default: (["MON", "TUE", "WED", "THU", "FRI"] as const).map((day) => ({ day, opens: "09:00", closes: "17:00" })) as { day: z.infer<typeof DAY>; opens: string; closes: string }[],
});
export const CLOSED_DAYS = registerSetting({
  key: "platform.closed_days", ownerModule: "platform", changePermission: "agent/settings:edit",
  description: "Dates the firm is closed (YYYY-MM-DD, in its time zone); none by default.",
  schema: z.array(z.string().refine(isDate, "a date as YYYY-MM-DD")).max(366).refine((a) => new Set(a).size === a.length, "each date once"),
  default: [] as string[],
});
export const EVERYONE_SEES_ALL = registerSetting({
  key: "platform.everyone_sees_all", ownerModule: "platform", changePermission: "agent/settings:edit",
  description: "Everyone in the firm sees every client, case, prospect and task (SA6-D1 seeds the view.all keys on every starter role); off means each person sees their own.",
  schema: z.boolean(), default: true,
});
export const REQUIRE_TWO_STEP = registerSetting({
  key: "platform.require_two_step", ownerModule: "platform", changePermission: "agent/security-policy:manage",
  description: "Require two-step sign-in for all staff (AG-1-40, AG-16-24). Default off as AG01-3 says, until founder question 3 decides (Lead B recommends on); enforced at sign-in by PF-4.",
  schema: z.boolean(), default: false,
});
