// C6.12 (M3-B, runtime lane; P-171, P-135; M3 case view r5c BR-1, BR-16, BR-18): a case's filings, submission group and
// fee lines, derived from its pinned release's combination and its people on every read (nothing stored, nothing typed by
// hand). The case officer reads them; a client and configuration people do not (deny by default, as runtime.ts). Visitor
// visa only in this slice: other combinations answer "not derived yet". Amounts Sample until the expert confirms. US$0.
import { Controller, Get, Headers, Inject, Injectable, Param } from "@nestjs/common";
import { deriveFilings } from "../../engine/runtime/filings.ts";
import { actorOf, CaseRead, type Actor } from "./core.ts";
import { Runtime } from "./runtime.ts";

type H = string | undefined;

@Injectable()
export class CaseFilings {
  constructor(@Inject(Runtime) private readonly r: Runtime) {}

  async list(actor: Actor, caseId: string) {
    const c = await this.r.reach(actor, caseId, "officer");
    const s = this.r.snapshotOf(c), pin = c.pins[0];
    return { case_id: c.id, reference: c.reference, release_version: pin.release.version, ...deriveFilings(s.combination.key, this.r.peopleOf(c)) };
  }
}

@CaseRead()
@Controller("api/runtime")
export class CaseFilingsController {
  constructor(@Inject(CaseFilings) private readonly f: CaseFilings) {}
  @Get("cases/:id/filings") list(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.list(actorOf(a), id); }
}
