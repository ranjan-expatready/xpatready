// The one rule for run messages a person reads (S3 early look 1), shared by the run card (runs.ts) and the AI work page
// (ai.ts batch view, C3.3 review M1).
/** S3 early look (1): a run never shows raw technical text (an error code, a stack, a server path), whatever wrote it;
 *  such a message is replaced by plain words and the detail stays in the server log. */
const TECH = /\b(E(NOENT|ACCES|PERM|CONN[A-Z]+|ADDRINUSE|TIMEDOUT|PIPE|NOTDIR|ISDIR|EXIST)|errno|syscall|Node\.js v\d)|\/(Users|home|private|tmp|var)\/|[A-Za-z]:\\|\bat \S+:\d+:\d+|\.(m?[jt]s|json):\d+/;
export function plainRunText(t: string | null): string | null {
  if (!t || !TECH.test(t)) return t;
  console.warn("run message kept from the page:", t.slice(0, 600));
  return "Something went wrong on this computer; what the run spent is on this card. Try again, or attach the forms from the Form library by hand.";
}
