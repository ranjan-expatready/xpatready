#!/bin/zsh
# B170i (P-469): the one number the cloud cannot make. Writes an engine-written copy of the finished story's Paper IMM 5257
# (C10.2: the same data as the app's own copy, written by the team's engine, packages/xfa-engine) for Adobe Validate on
# the Mac, in the same session as BK-20. Read-only on the demo: it reads the copy's row and file and writes one new PDF.
#   1. Demo › Load the finished story on the demo (:4400), and wait until it is done.
#   2. zsh ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tools/xfa-writer-trial-mac.sh
#      (DATABASE_URL defaults to the demo's; STUDIO_VALIDATED_DIR, if set, is where the copy goes; else the validated folder).
#   3. In Adobe Acrobat or Reader: open the printed file, follow the copy's person steps (the case page lists them), press
#      the form's own Validate until it passes, save as a NEW file "story-engine-validated.pdf" in the same folder.
#   4. zsh .../xfa-writer-trial-mac.sh --read   (reads that saved file back against what the engine wrote)
#   5. Put the printed line in the B170i PR, or tell the tech lead: "Adobe Validate on the engine copy: passed|failed, …".
# The PDFs stay on the Mac (never in git, QA-285).
set -e
STUDIO="${0:A:h:h}"; ROOT="${STUDIO:h:h:h:h}"
export PATH="$ROOT/.tools/node-v24.21.0/bin:/opt/homebrew/opt/postgresql@18/bin:$PATH"
export DATABASE_URL="${DATABASE_URL:-postgresql://xr_studio@127.0.0.1:54329/xr_studio_demo}"
OUT="${STUDIO_VALIDATED_DIR:-$ROOT/.tools/solution-1-prototype/validated-imm5257}"; mkdir -p "$OUT"
PY="$ROOT/.tools/solution-1-prototype/.venv/bin/python"
if [[ "${1:-}" == "--read" ]]; then
  SAVED="$OUT/story-engine-validated.pdf"
  [[ -f "$SAVED" ]] || { echo "not found: $SAVED (save Adobe's copy under that name first)"; exit 1; }
  "$PY" -I "$STUDIO/tools/read_validated.py" "$SAVED" "$OUT/story-engine.pdf" "$OUT/story-engine.request.json" | tee "$OUT/story-engine-validated.read.json" | \
    "$PY" -I -c 'import json,sys; r=json.loads(sys.stdin.read()); v=r.get("validation") or {}; print("Adobe Validate on the engine copy:", "passed" if v.get("passed") else "NOT passed", "| flag", v.get("flag"), "| date", v.get("date_last_validated"), "| values read back", r.get("read_back_equal"), "of", r.get("written"))'
  exit 0
fi
# The engine is its own package: built once from its own lockfile (B170a), never changed here.
if [[ ! -f "$ROOT/packages/xfa-engine/dist/index.js" ]]; then (cd "$ROOT/packages/xfa-engine" && npm ci --legacy-peer-deps --no-audit --no-fund && npm run build); fi
cd "$STUDIO"
TSX_TSCONFIG_PATH=api/tsconfig.json node --import tsx tools/xfa-writer-trial.ts --story-only --out "$OUT"
echo "\nNext: open $OUT/story-engine.pdf in Adobe, Validate until it passes, save as $OUT/story-engine-validated.pdf, then run this script with --read."
