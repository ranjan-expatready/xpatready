// Small helpers other services use when they create a form line or take a field id from a person (F1, forms lane).
// Kept apart from forms.ts so sources.ts can use them without an import cycle.
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
