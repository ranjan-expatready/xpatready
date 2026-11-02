// D1 (P-226): Demo › Reset to the six, one request: Reset (all configuration emptied) then Load sample "six", by the
// same code paths (api/src/demo.ts resetToSix). Same permissions as Reset: the author duty; anyone else 403.
import { Body, Controller, Headers, HttpStatus, Inject, Post } from "@nestjs/common";
import { actorOf, fail } from "./core.ts";
import { Demo } from "./demo.ts";

@Controller("api/demo")
export class DemoResetToSixController {
  constructor(@Inject(Demo) private readonly d: Demo) {}
  @Post("reset-to-six") resetToSix(@Headers("x-actor") a: string | undefined, @Headers("content-type") type: string | undefined, @Body() b: { confirm?: unknown } | null) {
    const who = actorOf(a);
    // D1 break m3: a destructive step takes its confirmation only as JSON, never as a form post (415).
    if (!/^application\/json\b/i.test(type ?? "")) fail('Send the confirmation as JSON: {"confirm":"RESET"}.', HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    return this.d.resetToSix(who, b?.confirm);
  }
}
