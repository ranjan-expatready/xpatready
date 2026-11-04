// C3.5 acceptance (qa/CAPABILITIES.md C3.5; P-65 a reviewed merge redirects one shared field into the other, P-266 an
// alias stays direct and logged; QA-219): "Shared fields keep aliases; a reviewed merge redirects one into the other",
// done as a person on a field's page in Shared library › Fields, on the demo data (Reset to the six, with the saved
// field maps of IMM 5257 and IMM 1294 applied: the two forms give the duplicate "Alt phone number" / "Alternate
// telephone number"). The journey is tests/check_qa219_merge_alias_browser.cjs, run here as the pack (one copy, the same
// port and database): Add another name, a name another field answers to refused on the control, Merge into… with a
// reason, waiting for a second person, the author refused, the approver approving on To review, then the page showing the
// merge and the other name. The rules underneath (no chain, cycle or fork; releases untouched; a merged field takes no
// new name) stay in tests/check_forms_channels.ts. Replays only, no model call (US$0).
//   zsh studio/tools/isolated.sh accept_c35 4445 start && tsx studio/acceptance/C3.5.test.ts 4445 xr_studio_accept_c35
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const PORT = process.argv[2] ?? "4445", DB = process.argv[3] ?? "xr_studio_accept_c35";
const r = spawnSync(process.execPath, [join(import.meta.dirname, "..", "tests", "check_qa219_merge_alias_browser.cjs"), PORT, DB], { stdio: "inherit", timeout: 900_000 });
if (r.error) { console.error("FAIL  C3.5 the browser journey did not start:", r.error.message); process.exit(1); }
process.exit(r.status ?? 1);
