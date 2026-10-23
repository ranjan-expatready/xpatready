// Reader policy, fixed in code (AIW-D271, the synthetic-document reader approval; historically labelled D270-reader).
// The reader has its OWN input scope: only the made-up synthetic documents listed, by hash, in p5/reader/docs/
// manifest.json. It does not widen P2's public-official-input controls (p2/guard.ts is unchanged). It shares the one
// experiment ledger and caps (US$5 per run, US$40 in total), the AIW-D261 route and model.
import { join } from "node:path";
import { FORBIDDEN as P2_FORBIDDEN, LEDGER_DIR, PROTOTYPE } from "../../p2/policy.ts";

export { BASE_URL, EXPERIMENT_CAP_USD, KEY_FILE, LEDGER_DIR, MAX_ATTEMPTS, MODELS, PRICE_PER_MTOK, PROTOTYPE, RUN_CAP_USD } from "../../p2/policy.ts";

export const READER = join(PROTOTYPE, "p5", "reader");
export const DOCS_DIR = join(READER, "docs");
export const DOCS_MANIFEST = join(DOCS_DIR, "manifest.json");
export const READER_PROMPTS = join(READER, "prompts");
export const READER_JOBS = join(READER, "jobs");
export const READER_RUNS = join(READER, "runs");
export const DOC_TYPES = join(READER, "doc-types.json");
export const READER_SCREENING_DIR = join(READER, "screening");
export const READER_DIGEST_FILE = join(READER_SCREENING_DIR, "reader-digest.json");
export const READER_USED_TICKETS = join(LEDGER_DIR, "used-reader-tickets");
/** The one script a paid reader call may run in. */
export const READ_ENTRY = join(READER, "read.ts");

/** AIW-D271 reuses the AIW-D261 route; the route id names the reader purpose so the ledger shows it apart. */
export const READER_ROUTE_ID = "anthropic-api/aiw-d261-route/aiw-d271-synthetic-reader";
export const LABEL = "AI-read proposal from a made-up synthetic document under AIW-D271 (prototype only); staff confirm every value";

/** What the reader process may never read: every P2 forbidden place (answer keys, family values, test outputs),
 *  the case store (it holds the made-up family's facts) and the reader's own runs. */
export const FORBIDDEN = [...P2_FORBIDDEN, join(PROTOTYPE, "p5", "case"), READER_RUNS];

/** Strings the launcher screens every maker-written request part against (never the image bytes): the reader key's
 *  values, the made-up family's values and the case scenario's values. Found, not listed: every JSON in expected/ is
 *  read for values, so a new key file is screened from the moment it exists. */
export const SCREEN_SOURCES = ["expected", "p1/e5-family-values.json", "p1/adobe-complete-1295-values.json"];
