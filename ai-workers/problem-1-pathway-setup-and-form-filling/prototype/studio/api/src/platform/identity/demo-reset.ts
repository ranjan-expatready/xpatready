// PF-4 (P-571 (1), B-6; PF-3 review m3): the demo reset's one platform step. The reset deletes the demo workspace's rows
// and never platform rows or platform audit lines (those carry the platform's own audit workspace, audit.ts). This step
// returns the Sample firms' settings to their seed values through the settings write path (writeSetting), so each change
// leaves its own audit line (actor "system", reason "demo reset") and no value is ever left without a trail. PF-3's seed
// stores no setting values, so a Sample firm's seed value of each key is its registered default. Only the demo calls it
// (Demo.wipe, one line); a firm that is not seeded is skipped.
import type { PrismaClient } from "@prisma/client";
import { firmScope } from "../firm-scope.ts";
import { readSampleFirms } from "../seed-sample-firms.ts";
import { registeredSettings, writeSetting } from "../settings.ts";
import { platformAuditWorkspaceId } from "./audit.ts";

export const RESET_ACTOR = "system";
export const RESET_REASON = "demo reset";

export async function resetSampleFirmSettings(db: PrismaClient, firmKeys: string[] = readSampleFirms().map((f) => f.key)): Promise<{ changed: { firmKey: string; key: string }[]; unregistered: string[] }> {
  const defs = new Map(registeredSettings().map((d) => [d.key, d]));
  const changed: { firmKey: string; key: string }[] = [], unregistered: string[] = [];
  for (const firmKey of firmKeys) {
    const firm = await db.platformFirm.findUnique({ where: { key: firmKey }, select: { id: true } });
    if (!firm) continue;
    for (const row of await db.platformFirmSetting.findMany({ where: firmScope(firm.id), orderBy: { key: "asc" } })) {
      const def = defs.get(row.key);
      if (!def) { unregistered.push(`${firmKey}:${row.key}`); continue; }   // another module's key, not loaded here: left as it is
      if (JSON.stringify(row.value) === JSON.stringify(def.default)) continue;
      await writeSetting(db, { firmId: firm.id, key: row.key, value: def.default, by: RESET_ACTOR, workspaceId: await platformAuditWorkspaceId(db), reason: RESET_REASON });
      changed.push({ firmKey, key: row.key });
    }
  }
  if (unregistered.length) console.warn(`demo reset: platform settings of keys not registered in this process were left as they are: ${unregistered.join(", ")}`);
  return { changed, unregistered };
}
