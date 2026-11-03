// The release gates' shared refusal (G1 BR-8 and G2 BR-8, tech lead on #568): Submit (400), Approve (409) and the shared
// Release page's releaseRows (409) refuse with one Problem Details that carries EVERY blocking problem in errors[]
// ({where, item, forms, message} plus the gate's own fields), never only the first. A gate marks its problems with
// `gate: "<its type>"` and adds its count sentence to GATE_WORDS below; a refusal holding no gated problem keeps the
// route's own words, as before. G1 (the source register) built it; G2 (answer-key tests) adds its line.
import { HttpException, type HttpStatus } from "@nestjs/common";
import { problemWords, type ProblemLine } from "../../contracts/programs.ts";

/** One blocking problem a gate raised: the problem line plus the gate's type and its own fields (G1: kind, key, address,
 *  value, state). */
export type GatedProblem = ProblemLine & { gate: string; [k: string]: unknown };
/** Each gate's count sentence, word for word from its concept (G1 §5: "11 numbers have no source entry. …"). */
export const GATE_WORDS: Record<string, (n: number) => string> = {
  "no-source": (n) => `${n} number${n === 1 ? " has" : "s have"} no source entry. Each is listed on Review and release.`,
  "sample-content": (n) => `${n} item${n === 1 ? " is" : "s are"} Sample content, which releases only in the demo workspace. Each is listed on Review and release.`, // C5.5
};
const gated = (p: ProblemLine): p is GatedProblem => typeof (p as { gate?: unknown }).gate === "string";

/** Throws the shared refusal when any blocking problem belongs to a gate; returns otherwise. `lead`: the route's own
 *  opening ("Release refused: ", "Fix the problems before submitting: "). `detail` gives each gate's count sentence,
 *  then the first three problems in words; `errors[]` lists every one. */
export function refuseBlocking(blocking: ProblemLine[], status: HttpStatus, lead: string): void {
  const gates = [...new Set(blocking.filter(gated).map((p) => p.gate))];
  if (!gates.length) return;
  const counts = gates.map((g) => (GATE_WORDS[g] ?? ((n: number) => `${n} item${n === 1 ? "" : "s"} refused (${g}). Each is listed on Review and release.`))(blocking.filter((p) => gated(p) && p.gate === g).length));
  // Problems no gate counted come first in the words (each is named nowhere else in `detail`), then the gated ones.
  const first = [...blocking.filter((p) => !gated(p)), ...blocking.filter(gated)].slice(0, 3).map(problemWords).join(" · ");
  const more = blocking.length > 3 ? ` and ${blocking.length - 3} more` : "";
  throw new HttpException({
    type: `https://expatready.local/problems/${gates.length === 1 ? gates[0] : "release-gates"}`, title: "Refused: items listed", status,
    detail: `${lead}${counts.join(" ")} First: ${first}${more}.`,
    errors: blocking.map((p) => {
      const { level: _l, label: _w, message: _m, ...rest } = p as ProblemLine & Record<string, unknown>;
      return { ...rest, where: p.where, item: p.item, forms: p.forms ?? [], message: problemWords(p) };
    }),
  }, status);
}
