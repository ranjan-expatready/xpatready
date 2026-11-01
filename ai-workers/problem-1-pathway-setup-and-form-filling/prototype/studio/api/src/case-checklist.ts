// C6.4 (M3-B, runtime lane; P-171; M3 case view r5c "checklist per person"): a case's document checklist, one list per
// person, from its pinned release's requirements and rechecked against the case's answers on every read (nothing stored).
// The case officer reads it; a client and configuration people do not (deny by default, as runtime.ts). Visitor visa
// only in this slice: other combinations answer "not derived yet". Sample until the immigration expert confirms. US$0.
import { Controller, Get, Headers, HttpStatus, Inject, Injectable, Param } from "@nestjs/common";
import { caseChecklist } from "../../engine/runtime/case-checklist.ts";
import { knownOf } from "../../engine/runtime/case.ts";
import { actorOf, CaseRead, Db, fail, type Actor } from "./core.ts";
import { Runtime } from "./runtime.ts";

type H = string | undefined;

@Injectable()
export class CaseChecklists {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db) {}

  async list(actor: Actor, caseId: string) {
    const c = await this.r.reach(actor, caseId, "officer");
    const s = this.r.snapshotOf(c), pin = c.pins[0];
    // The release must describe the case's own combination (as case-filings.ts): never another combination's lines.
    const own = await this.db.combination.findUnique({ where: { id: c.combinationId }, select: { combinationKey: true } });
    if (!own || s?.combination?.key !== own.combinationKey) fail("This case's release does not describe the case's own combination; no checklist was worked out. Ask the Lead.", HttpStatus.CONFLICT);
    const people = this.r.peopleOf(c), today = new Date();
    const { answers, rows } = await this.r.state(c);
    const { known } = knownOf(s, people, answers, rows, today);
    return { case_id: c.id, reference: c.reference, release_version: pin.release.version, today: today.toISOString().slice(0, 10), ...caseChecklist(s, own!.combinationKey, people, known, today) };
  }
}

@CaseRead()
@Controller("api/runtime")
export class CaseChecklistsController {
  constructor(@Inject(CaseChecklists) private readonly x: CaseChecklists) {}
  @Get("cases/:id/checklist") list(@Headers("x-actor") a: H, @Param("id") id: string) { return this.x.list(actorOf(a), id); }
}
