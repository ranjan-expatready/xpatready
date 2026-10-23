// Small helpers other services use when they create a form line or take a field id from a person (F1, forms lane).
// Kept apart from forms.ts so sources.ts can use them without an import cycle.
import { Prisma } from "@prisma/client";
import { Db } from "./core.ts";

/** The channel a new line gets (challenge point 4): Online when the library has an approved online version of the form
 *  captured from the combination's portal, otherwise PDF upload. */
export async function defaultChannelFor(db: Pick<Db, "combination" | "formEdition">, combinationId: string, govFormDefId: string) {
  const c = await db.combination.findUnique({ where: { id: combinationId }, select: { portalKey: true } });
  if (!c?.portalKey) return "PDF_UPLOAD" as const;
  const online = await db.formEdition.count({ where: { govFormDefId, channel: "ONLINE", portalKey: c.portalKey } });
  return online ? ("ONLINE" as const) : ("PDF_UPLOAD" as const);
}

/** A field id merged into another redirects to it (P-65); any other id is returned as it is. */
export async function resolveKey(db: Db, workspaceId: string, key: string) {
  for (let i = 0, k = key; i < 5; i++) {
    const r = await db.canonicalField.findFirst({ where: { workspaceId, canonicalFieldKey: k }, orderBy: { version: "desc" } });
    if (!r?.mergedIntoKey) return k;
    k = r.mergedIntoKey;
  }
  return key;
}

/** Puts a library form on a combination as a draft line (QA-13), or answers "already" when its newest version is on it.
 *  Only the newest version of the line counts: a removal not released yet is undone in place, and after a released
 *  removal the form comes back as a new version that supersedes it. The line takes the default channel (F1). A second
 *  request racing this one is refused by the database's unique version and answered "already". */
export async function addFormLine(db: Pick<Db, "combination" | "combinationForm" | "formEdition">, l: { workspaceId: string; combinationId: string; govFormDefId: string; formKey: string; who?: string; origin: "HUMAN" | "AI_PROPOSAL"; by: string; sourceQuote: string }): Promise<"added" | "already"> {
  const history = await db.combinationForm.findMany({ where: { combinationId: l.combinationId, lineageKey: l.formKey }, orderBy: { version: "desc" } });
  const newest = history[0];
  if (newest && newest.status !== "RETIRED") return "already";
  const line = { govFormDefId: l.govFormDefId, who: l.who ?? "each_applicant", attachMode: "COMBINATION_MANDATORY" as const, predicateJson: Prisma.DbNull, conditionPlain: null, status: "DRAFT" as const, origin: l.origin, updatedBy: l.by, sourceQuote: l.sourceQuote.slice(0, 500), channel: await defaultChannelFor(db, l.combinationId, l.govFormDefId) };
  const pendingRemoval = newest && (!newest.supersedesId || history.find((h) => h.id === newest.supersedesId)?.status === "PUBLISHED");
  try {
    if (newest && pendingRemoval) await db.combinationForm.update({ where: { id: newest.id }, data: line });
    else await db.combinationForm.create({ data: { ...line, workspaceId: l.workspaceId, combinationId: l.combinationId, lineageKey: l.formKey, version: (newest?.version ?? 0) + 1, supersedesId: newest?.id ?? null } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return "already";
    throw e;
  }
  return "added";
}
