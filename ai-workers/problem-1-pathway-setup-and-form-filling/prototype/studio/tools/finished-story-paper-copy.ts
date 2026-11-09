// C10.2 (Lead 37, 9 Nov; P-349 row 12b's method): prints where the finished story's Paper IMM 5257 copy is, for the person
// who validates it in Adobe on the Mac, and the steps after. Read-only (the copy's database row and file); writes nothing.
// Run after Demo › Load the finished story, on the copy that loaded it (the demo: DATABASE_URL of xr_studio_demo):
//   cd prototype/studio && DATABASE_URL=postgresql://xr_studio@127.0.0.1:54329/<db> TSX_TSCONFIG_PATH=api/tsconfig.json \
//     node --import tsx tools/finished-story-paper-copy.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Db, ROOT, STUDIO } from "../api/src/core.ts";
import { SAMPLE_CASE } from "../api/src/sample-case.ts";
import { copiesWithHash, paperFile, validatedDir } from "../api/src/sample-validated.ts";

const person: string = JSON.parse(readFileSync(join(STUDIO, "samples", "finished-story.json"), "utf8")).paper_line.person;
const db = new Db();
const c = await db.case.findFirst({ where: { reference: SAMPLE_CASE.reference }, select: { id: true } });
const copy = c ? (await copiesWithHash(db, c.id)).find((x) => x.person === person) : undefined;
await db.$disconnect();
if (!copy?.path) { console.error(`No IMM 5257 copy for ${person} on ${SAMPLE_CASE.reference}: load the finished story first (Demo › Load the finished story).`); process.exit(1); }
const abs = copy.path.startsWith("/") ? copy.path : join(ROOT, copy.path);
console.log(JSON.stringify({ person, case: SAMPLE_CASE.reference, case_id: c!.id, copy_id: copy.id, file: abs, exists: existsSync(abs), validated_folder: validatedDir(), saved_read_back: paperFile() }, null, 1));
console.log(`
Next, on the Mac (Adobe Acrobat or Reader; never a simulated Validate):
 1. Open ${abs}
 2. Press the form's own Validate button. Follow the copy's person steps first (the case page lists them: after the first
    Validate, tick "Canada/US" again for a North American telephone number), then Validate until it passes.
 3. Save it as a new file in ${validatedDir()} (for example paper-${copy.id.slice(0, 8)}-validated.pdf).
 4. Read it back through the product's upload door, as the case officer: on the case page, IMM 5257 for ${person},
    "Read back the validated copy" (choose the saved file), or
      curl -s -X POST -H 'x-actor: user-O' -F file=@<that file> http://localhost:4400/api/runtime/form-copies/${copy.id}/validated
 5. Record it: node --import tsx tools/record-validated-samples.ts --paper "the tech lead, Adobe on the Mac"
    (writes ${paperFile()}; commit that file; the PDF stays on the Mac, QA-285).
 6. Load the finished story again: its Paper, forms, ready and record stages read done, and acceptance/C10.2 5b and 6d pass on the Mac.`);
