// C3.6 (P-149, P-158; review of #523 M1, break of #573 M2): the library document type a person means when they name one
// while adding a requirement: the same NAME, never a key collision (two different names that share a key, e.g.
// "Брак 2024" and "Паспорт 2024" or two long names alike in their first 60 characters, are two types). Names compare
// ignoring case, spacing and punctuation (normalizeLabel) and accents on Latin letters ("Relevé" is "Releve", as the
// lander's key and the older slug lookup treated them); marks of other scripts stay (normalizeLabel, break m2). A live
// type is preferred; a retired one is returned so the caller refuses it in words (refuseRetired).
import type { Prisma } from "@prisma/client";
import { normalizeLabel } from "../../contracts/programs.ts";
import type { Db } from "./core.ts";
import { stateOf } from "./library-items.ts";

/** One name's comparison form. */
export const nameKey = (name: string) => normalizeLabel(name.normalize("NFD").replace(/(\p{Script=Latin})\p{M}+/gu, "$1"));

export async function namedDocumentType(db: Db | Prisma.TransactionClient, workspaceId: string, name: string): Promise<string | null> {
  const want = nameKey(name);
  if (!want) return null;
  const rows = await db.documentType.findMany({ where: { workspaceId }, select: { documentTypeKey: true, name: true, status: true, version: true }, orderBy: { version: "asc" } });
  const byKey = new Map<string, typeof rows>();
  for (const r of rows) byKey.set(r.documentTypeKey, [...(byKey.get(r.documentTypeKey) ?? []), r]);
  const matches = [...byKey].filter(([, v]) => v.some((r) => nameKey(r.name) === want)).sort(([a], [b]) => a.localeCompare(b));
  const live = matches.find(([, v]) => !stateOf(v.map((r) => ({ id: "", status: r.status, version: r.version }))).retired);
  return (live ?? matches[0])?.[0] ?? null;
}

/** A waiting document-type proposal with the same name (any combination, person or AI), or null. */
export async function waitingDocumentType(db: Db | Prisma.TransactionClient, workspaceId: string, name: string): Promise<string | null> {
  const want = nameKey(name);
  const rows = await db.proposalItem.findMany({ where: { workspaceId, kind: "document_type", status: "waiting" }, select: { payload: true } });
  const twin = rows.map((r) => String((r.payload as { name?: unknown }).name ?? "")).find((n) => nameKey(n) === want);
  return twin ?? null;
}
