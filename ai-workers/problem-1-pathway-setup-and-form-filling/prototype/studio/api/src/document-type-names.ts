// C3.6 (P-149, P-158; review of #523, M1): the library document type a person means when they name one while adding a
// requirement. One lookup for the requirement door: the same name in any letter case, spacing or punctuation, or the key
// the queue's lander would give it (keyFor, accents stripped, words kept at 60 characters), or the older slug key. A live
// type is preferred; a retired one is returned so the caller refuses it in words (refuseRetired).
import type { Prisma } from "@prisma/client";
import { normalizeLabel } from "../../contracts/programs.ts";
import { slug } from "../../engine/import.ts";
import type { Db } from "./core.ts";
import { keyFor } from "./library-changes.ts";
import { stateOf } from "./library-items.ts";

/** The key the queue's document_type lander gives a name in an empty library (proposals.ts slugKey). */
export const landedKeyOf = (name: string) => keyFor("x", name, new Set()).slice(2);

export async function namedDocumentType(db: Db | Prisma.TransactionClient, workspaceId: string, name: string): Promise<string | null> {
  const norm = normalizeLabel(name);
  const keys = new Set([slug(name), landedKeyOf(name)].filter(Boolean));
  const rows = await db.documentType.findMany({ where: { workspaceId }, select: { documentTypeKey: true, name: true, status: true, version: true }, orderBy: { version: "asc" } });
  const byKey = new Map<string, typeof rows>();
  for (const r of rows) byKey.set(r.documentTypeKey, [...(byKey.get(r.documentTypeKey) ?? []), r]);
  const matches = [...byKey].filter(([key, v]) => keys.has(key) || (!!norm && v.some((r) => normalizeLabel(r.name) === norm)));
  const live = matches.find(([, v]) => !stateOf(v.map((r) => ({ id: "", status: r.status, version: r.version }))).retired);
  return (live ?? matches[0])?.[0] ?? null;
}
