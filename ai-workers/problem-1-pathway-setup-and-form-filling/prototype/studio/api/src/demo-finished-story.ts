// C10.2 (DEMO.md checkpoint 3): Demo › Load the finished story, POST /api/demo/checkpoints/finished-story. The author
// duty only, as every checkpoint (anyone else 403); a job: 202 at once, its progress and result on GET /api/demo/status
// (`checkpoint`, `story`). The work is api/src/demo.ts finishedStory and api/src/finished-story.ts.
import { Body, Controller, Headers, HttpCode, HttpStatus, Inject, Post } from "@nestjs/common";
import { actorOf } from "./core.ts";
import { Demo } from "./demo.ts";

@Controller("api/demo/checkpoints")
export class DemoCheckpointsController {
  constructor(@Inject(Demo) private readonly d: Demo) {}
  @Post("finished-story") @HttpCode(HttpStatus.ACCEPTED) finished(@Headers("x-actor") a: string | undefined, @Body() b: { confirm?: unknown } | null) { return this.d.finishedStory(actorOf(a), b); }
}
