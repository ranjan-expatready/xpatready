// C3.6 (Lead, 2 Nov; runtime-3's R3): a choice fact's answer values. The person writes words; the codes are built here
// (keys are never typed, P-34). The list is part of its field: it lands as a draft with the field, is approved, released,
// withdrawn and undone with it (break B1, review B1), and only a released list with the same values is reused (break M1).
import type { Prisma } from "@prisma/client";
import { VALUE_TYPE_TO_DATA_TYPE } from "../../engine/snapshot.ts";
import { fail } from "./core.ts";

type Tx = Prisma.TransactionClient;
export type AnswerValue = { code: string; label: string };
/** The answer types that take a list of answer values. */
export const CHOICE_TYPES = ["code", "multi_choice"] as const;
export const isChoice = (t: string) => (CHOICE_TYPES as readonly string[]).includes(t);
const sameWords = (s: string) => s.normalize("NFKC").toLocaleLowerCase("en-CA");

/** Pure: the answer values a person wrote, as the list a proposal carries. A choice needs two or more values; an empty
 *  or repeated value is refused in words; a non-choice takes none. A value in any script is accepted (break M3): its
 *  code is built from its Latin letters and digits, else from its place; two values that build one code are told apart
 *  by a number (break m1), never refused. */
export function answerValues(valueType: string, labels: readonly string[] | undefined): AnswerValue[] | undefined {
  if (!isChoice(valueType)) { if (labels?.length) fail(`Only a choice (${CHOICE_TYPES.join(" or ")}) takes answer values: remove them, or choose a choice as the answer type.`); return undefined; }
  if (!labels?.length) fail("A choice needs its answer values: write two or more, one per line.");
  const out: AnswerValue[] = [], codes = new Set<string>();
  labels!.forEach((raw, i) => {
    // Break m-d: invisible and direction-control characters are dropped, so a blank or look-alike value cannot land.
    const label = String(raw).replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g, "").replace(/[\s\u00a0]+/g, " ").trim();
    if (!label) fail(`Answer value ${i + 1} is empty: give it a name, or remove it.`);
    const twin = out.find((o) => sameWords(o.label) === sameWords(label));
    if (twin) fail(`"${label}" is listed twice: give each answer value once.`);
    const ascii = label.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 56);
    const base = !ascii ? `value_${i + 1}` : /^[a-z]/.test(ascii) ? ascii : `v_${ascii}`.slice(0, 56);
    let code = base;
    for (let n = 2; codes.has(code); n++) code = `${base}_${n}`;
    codes.add(code); out.push({ code, label });
  });
  if (out.length < 2) fail("A choice needs two or more answer values.");
  return out;
}

/** The checks a field's answer type and values pass wherever it lands (the add, an accept or an edit on To review: break
 *  M2): a known type; values only on a choice; the codes rebuilt from the words, so a typed code never lands. */
export function checkedFieldValues(valueType: string, values: readonly AnswerValue[] | undefined, needsValues: boolean): AnswerValue[] | undefined {
  if (!(valueType in VALUE_TYPE_TO_DATA_TYPE)) fail(`Choose a kind of value from the list (${Object.keys(VALUE_TYPE_TO_DATA_TYPE).join(", ")}).`);
  if (values?.length) return answerValues(valueType, values.map((v) => String(v.label)));
  if (needsValues && isChoice(valueType)) answerValues(valueType, undefined); // refuses: a choice needs its values
  return undefined;
}

/** A field's own draft list, removed with the field (undo, withdraw) unless another field uses it (break B2). Call it
 *  with the list key read before the field row is deleted. */
export async function dropFieldList(tx: Tx, ws: string, listKey: string | null | undefined): Promise<void> {
  if (!listKey) return;
  if (await tx.canonicalField.count({ where: { workspaceId: ws, answerListKey: listKey } })) return;
  await tx.answerList.deleteMany({ where: { workspaceId: ws, answerListKey: listKey, version: 1, status: "DRAFT" } });
}

/** A field's draft list is released with the field it rides with (publishLibraryChanges, ADD of a field). */
export async function releaseFieldList(tx: Tx, ws: string, listKey: string | null | undefined): Promise<void> {
  if (!listKey) return;
  await tx.answerList.updateMany({ where: { workspaceId: ws, answerListKey: listKey, status: "DRAFT" }, data: { status: "PUBLISHED" } });
}

/** The values a library change's field carries, for the second person (review M2). */
export async function fieldListValues(db: Pick<Tx, "answerList">, ws: string, listKey: string | null | undefined): Promise<{ key: string; label: string; status: string; values: AnswerValue[] } | null> {
  if (!listKey) return null;
  const l = await db.answerList.findFirst({ where: { workspaceId: ws, answerListKey: listKey }, orderBy: { version: "desc" }, include: { values: { orderBy: { sortOrder: "asc" }, select: { valueKey: true, label: true } } } });
  return l ? { key: l.answerListKey, label: l.label, status: l.status, values: l.values.map((v) => ({ code: v.valueKey, label: v.label })) } : null;
}
