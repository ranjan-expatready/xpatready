// D1 (P-226): Demo › Reset to the six, one request: Reset (all configuration emptied) then Load sample "six", by the
// same code paths (api/src/demo.ts resetToSix). Same permissions as Reset: the author duty; anyone else 403.
import { Body, Controller, Headers, Inject, Post } from "@nestjs/common";
import { actorOf } from "./core.ts";
import { Demo } from "./demo.ts";

@Controller("api/demo")
export class DemoResetToSixController {
  constructor(@Inject(Demo) private readonly d: Demo) {}
  @Post("reset-to-six") resetToSix(@Headers("x-actor") a: string | undefined, @Body() b: { confirm?: unknown } | null) { return this.d.resetToSix(actorOf(a), b?.confirm); }
}
