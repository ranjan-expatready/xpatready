// QA-144: the family information form a combination of FORM_SETUP files, by its application form's channel; none when
// its setup names its own family form among its rules (slice 4: Express Entry's IMM 5406). Used by the sections (060),
// each combination's form lines (combination/100, 120) and release 2 (130).
import type { Db } from "../../core.ts";
import { FAMILY_FORM_BY_CHANNEL, FORM_SETUP } from "../../form-setup.ts";

export async function familyForm(db: Db, combinationId: string, key: string | undefined) {
  const setup = FORM_SETUP[key ?? ""];
  if (!setup?.family) return null;
  const filed = (await db.combinationForm.findFirst({ where: { combinationId, lineageKey: setup.application }, orderBy: { version: "desc" }, select: { channel: true } }))?.channel;
  return FAMILY_FORM_BY_CHANNEL[filed === "ONLINE" ? "online" : "paper"];
}
