"""Adobe test helper: write a complete synthetic IMM 1295 data set with the E5 diagnostic append
and confirm the read-back, so Adobe Reader's Validate can run end to end. Writes to p1/adobe-test/. Usage (project root):
  .tools/solution-1-prototype/.venv/bin/python -I ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1/adobe_complete_1295.py [suffix]
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import e5_roundtrip as E  # noqa: E402

HERE = Path(__file__).resolve().parent
OUT = HERE / "adobe-test"
values = json.loads((HERE / "adobe-complete-1295-values.json").read_text())["values"]
orig = E.official("imm1295e.pdf").read_bytes()
r0 = E.open_reader(orig)
parts = {k: v.get_object().get_data() for k, v in E.xfa_streams(r0).items()}
out, notes = E.write(orig, E.new_datasets(parts["datasets"], values), "append-only-encrypted-diagnostic")
name = f"imm1295e.complete{('-' + sys.argv[1]) if len(sys.argv) > 1 else ''}.append-only-encrypted-diagnostic.pdf"
(OUT / name).write_bytes(out)
rb = E.read_back((OUT / name).read_bytes(), values, parts)
print(json.dumps({"file": name, "sha256": E.sha(out), "written": rb["written"], "read_back_equal": rb["read_back_equal"],
                  "prefix_kept": out[: len(orig)] == orig}))
