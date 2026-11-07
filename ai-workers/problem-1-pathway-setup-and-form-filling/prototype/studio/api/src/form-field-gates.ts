// B107 (QA-296, QA-299, QA-300; C6.11, C7.7): two hand-written decisions on a mapped form field, each taken from the form's
// own printed words, cited, and never from the AI's words: a gate (the form field is written only while its gate holds:
// IMM 5476 prints one membership number box per regulatory body, and its own script clears the others once one is ticked)
// and "filled by hand" (IMM 5475's designated individual is "someone who will not act as your representative", a person the
// case does not hold). The same door as B86 (api/src/form-field-condition.ts): an author proposes one library change per
// form field, a second person approves it on To review, and only then the form field gets a draft version (checked again
// first); the next release carries it. No route: the configured checkpoint proposes them from cited data
// (samples/form-field-gates.json, P-319; api/src/features/checkpoint/combination/410-form-field-gates.ts). Every gate and
// every decision is Sample, Unconfirmed: expert (AGENTS rule 4).
import { HttpException, HttpStatus, Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { Prisma, type LibraryChange } from "@prisma/client";
import { canonical as canonicalOf, validatePredicate } from "../../../contracts/rules.ts";
import { boxGate, type BoxGate } from "../../engine/form-field-condition.ts";
import { effective } from "../../engine/snapshot.ts";
import { isNode } from "../../engine/validate.ts";
import { Audit, Db, need, revise, strip, Workspace, type Actor } from "./core.ts";
import { closeReplaced, FORM_FIELD_KIND } from "./form-field-condition.ts";
import { APPROVAL_HOOKS } from "./lifecycle.ts";

export const GATE_ACTION = "SET_FORM_FIELD_GATE", BY_HAND_ACTION = "SET_FORM_FIELD_BY_HAND";
const BLOCKING = ["WAITING", "RETURNED"];
const canonical = (x: unknown) => canonicalOf(x as never);
const problem = (status: number, title: string, detail: string) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail }, status);
const CHANGED = "This form field changed after this was proposed, so nothing was changed. Return it; it can be proposed again.";

/** What a proposal asks for: a gate on a mapped form field, or that the form field is filled by hand. `words` are the form's
 *  own printed words the decision reads (at least 8 characters); `cite` names the form, its page and the quote (P-170). */
export type GateProposal = { formEditionId: string; dataPath: string; words: string; cite: string } & ({ gate: unknown; byHand?: never } | { byHand: true; gate?: never });
/** The form field as the proposal saw it, compared again at approval (BR-7: nothing applied from a stale view). */
type Seen = { outcome: string; fact: string | null; person: string | null; transform: string | null; rule: unknown };
type Matches = { formEditionId: string; dataPath: string; form: string; edition: string; caption: string; words: string; sentence: string; cite: string; before: Seen; after: BoxGate | null; byHand: boolean; reason: string; replaces: unknown[] };
const seenOf = (r: { outcome: string; canonicalFieldKey: string | null; person: string | null; transform: string | null; conditionRule: unknown }): Seen =>
  ({ outcome: r.outcome, fact: r.canonicalFieldKey, person: r.person, transform: r.transform, rule: r.conditionRule ?? null });
const same = (a: Seen, b: Seen) => a.outcome === b.outcome && a.fact === b.fact && a.person === b.person && (a.transform ?? null) === (b.transform ?? null) && canonical(a.rule ?? null) === canonical(b.rule ?? null);

/** The fields a gate reads (its `field`s, nested ones included), once each. */
export const gateFields = (tree: unknown) => [...new Set([...JSON.stringify(tree ?? null).matchAll(/"field":"([^"]+)"/g)].map((m) => m[1]))];

/** Why a proposal cannot be made, in words (empty: it can). Pure, so the cited data is checked before anything is written
 *  (the checkpoint step) and by tests/forms/check_b107_form_field_gates.ts. */
export function gateProblems(p: Pick<GateProposal, "words" | "cite" | "gate" | "byHand">, known: (fact: string) => boolean): string[] {
  const out: string[] = [];
  if (typeof p.words !== "string" || p.words.trim().length < 8) out.push("the form's own words are missing (at least 8 characters)");
  if (typeof p.cite !== "string" || p.cite.trim().length < 20) out.push("no source is quoted (P-170: the form, its page and its words)");
  if (!!p.byHand === !!p.gate) out.push("say either a gate or filled by hand, not both");
  if (p.gate) {
    const errs = validatePredicate(p.gate, isNode);
    if (errs.length) out.push(`the gate is not a condition the rules can run: ${errs.join("; ")}`);
    for (const f of gateFields(p.gate)) if (!known(f)) out.push(`the gate reads "${f}", which is not in the shared library`);
  }
  return out;
}

@Injectable()
export class FormFieldGates implements OnModuleInit {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(Workspace) private readonly ws: Workspace) {}

  /** At a second person's approval (lifecycle.ts asks the hook by action, no import cycle; as the rename door). */
  onModuleInit() {
    for (const action of [GATE_ACTION, BY_HAND_ACTION]) APPROVAL_HOOKS.set(action, { check: (c) => this.recheck(c).then(() => undefined), apply: (actor, c) => this.apply(actor, c) });
  }

  /** One waiting library change for one form field; nothing is applied before a second person approves. */
  async propose(actor: Actor, combinationId: string | null, p: GateProposal) {
    need(actor, "author");
    const workspaceId = await this.ws.id();
    const ed = await this.db.formEdition.findUnique({ where: { id: p.formEditionId }, include: { form: { select: { formKey: true } } } }).catch(() => null);
    if (!ed || ed.workspaceId !== workspaceId || ed.channel === "ONLINE") throw problem(404, "Not found", "That form edition does not exist, or is an online version.");
    const rows = await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id, dataPath: p.dataPath } });
    const cur = effective(rows, (x) => x.dataPath, "draft")[0];
    if (!cur || cur.status === "RETIRED") throw problem(404, "Not found", `${ed.editionLabel} has no form field ${p.dataPath}.`);
    if (cur.outcome !== "mapped" || !cur.canonicalFieldKey) throw problem(409, "Not mapped", `"${cur.caption ?? p.dataPath}" is not mapped to a shared field, so it holds no gate and needs no decision here (decide it on To review › Form fields).`);
    const library = new Set((await this.db.canonicalField.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { canonicalFieldKey: true } })).map((f) => f.canonicalFieldKey));
    const why = gateProblems(p, (f) => library.has(f));
    if (why.length) throw problem(HttpStatus.BAD_REQUEST, "Some details need fixing", `${why.join("; ")}. Nothing was changed.`);
    // B86's own rule on a form field (its question's condition) is never replaced by a gate (break-proofing: two doors, one column).
    if (cur.conditionRule && !boxGate(cur.conditionRule)) throw problem(409, "Holds its question's condition", `"${cur.caption ?? p.dataPath}" holds its question's condition (Review and release › form fields): take that off first. Nothing was changed.`);
    const after: BoxGate | null = p.gate ? { gate: p.gate, words: p.words.trim(), cite: p.cite.trim() } : null;
    if (after && canonical(cur.conditionRule ?? null) === canonical(after)) throw problem(409, "Nothing changes", "This form field already holds this gate.");
    const field = cur.caption || p.dataPath, words = p.words.trim();
    const sentence = after ? `filled only when ${words.replace(/[.\s]+$/, "")}` : `filled by hand: ${words.replace(/[.\s]+$/, "")}`;
    const label = `${ed.form.formKey} · ${field}: ${sentence}`.slice(0, 300);
    const key = `${ed.id}:${p.dataPath}`;
    return this.db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, `form_field_condition:${workspaceId}:${key}`);
      if (await tx.libraryChange.findFirst({ where: { workspaceId, kind: FORM_FIELD_KIND, key, status: { in: BLOCKING } } })) throw problem(409, "Already waiting", "A change of this form field already waits on To review. Decide or withdraw it first.");
      const replaces = await closeReplaced(tx, workspaceId, key);
      const matches: Matches = { formEditionId: ed.id, dataPath: p.dataPath, form: ed.form.formKey, edition: ed.editionLabel, caption: cur.caption ?? "", words, sentence, cite: p.cite.trim(), before: seenOf(cur), after, byHand: !!p.byHand, reason: p.cite.trim(), replaces };
      const change = await tx.libraryChange.create({ data: { workspaceId, kind: FORM_FIELD_KIND, key, label, action: p.byHand ? BY_HAND_ACTION : GATE_ACTION, reason: p.cite.trim().slice(0, 1000), status: "WAITING", proposedBy: actor.id, appliedBy: actor.id, combinationId,
        matches: matches as unknown as Prisma.InputJsonValue } });
      await this.audit.log(workspaceId, actor.id, "proposed", "form field", ed.form.formKey, `${actor.name} proposed: ${label}. It waits for a second person.`, undefined, combinationId ?? undefined);
      return { id: change.id, status: change.status, label };
    });
  }

  /** Checked again at approval: the form field is still as the proposal saw it. */
  private async recheck(c: LibraryChange) {
    const m = c.matches as unknown as Matches;
    const rows = await this.db.formFieldMap.findMany({ where: { formEditionId: m.formEditionId, dataPath: m.dataPath } });
    const now = effective(rows, (x) => x.dataPath, "draft")[0];
    if (!now || now.status === "RETIRED" || !same(seenOf(now), m.before)) throw problem(HttpStatus.CONFLICT, "Changed since", CHANGED);
    return rows;
  }

  /** At approval: the form field gets a draft version holding the gate, or filled by hand (no shared field, no person). The
   *  draft is the proposer's: approving is not authoring (B86 break M1). */
  private async apply(actor: Actor, c: LibraryChange) {
    const m = c.matches as unknown as Matches, rows = await this.recheck(c);
    const changes = m.byHand
      ? { outcome: "by_hand", canonicalFieldKey: null, person: null, transform: null, confidence: null, optionMap: Prisma.DbNull, conditionRule: Prisma.DbNull, origin: "HUMAN" as const, reason: `${m.sentence} (${m.cite})`.slice(0, 500) }
      : { conditionRule: m.after as unknown as Prisma.InputJsonValue };
    await revise(this.db.formFieldMap, rows, changes, c.proposedBy, strip);
    await this.audit.log(c.workspaceId, actor.id, "approved", "form field", m.form, `${actor.name} approved: ${c.label ?? c.key}. It goes out with the next release that carries ${m.edition}.`, undefined, c.combinationId ?? undefined);
  }
}
