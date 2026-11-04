# Adds the founder's auto-mode rules (4 Nov 2026) to a Claude Code settings file, keeping everything else.
# The founder runs it; agents never run it on the real file. Usage: python3 add-automode-rules.py [settings-path]
import json, os, shutil, sys

path = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else "~/.claude/settings.json")
RULES = [
    "$defaults",
    "In this project's GitHub repository (xpatready) only: adding or removing the label 'review: approved' on a pull request with `gh pr edit <number> --add-label 'review: approved'` or `--remove-label 'review: approved'` is authorised by the founder (decisions P-189, P-277). A session adds it only after its Opus reviewer approved the PR's current head commit; Mergify then merges only when every CI check is green. This does not authorise `gh pr merge` or any other label.",
    "In this project's GitHub repository (xpatready) only: posting a pull-request comment with `gh pr comment <number>` (test evidence, review verdicts, questions for or answers from the tech lead) is authorised by the founder.",
    "Starting or stopping the project's own isolated test copy with `zsh studio/tools/isolated.sh <prefix> <port> start` or `stop` (run from ai-workers/problem-1-pathway-setup-and-form-filling/prototype) is authorised by the founder, for ports 4430 to 4499 only. It may stop a process listening on its own port, which is always another isolated test copy; it never touches the demo on port 4400.",
]

with open(path) as f:
    settings = json.load(f)
backup = path + ".bak-2026-11-04"
shutil.copy2(path, backup)
auto = settings.setdefault("autoMode", {})
allow = auto.setdefault("allow", [])
for rule in RULES:
    if rule not in allow:
        allow.append(rule)
with open(path, "w") as f:
    json.dump(settings, f, indent=2)
    f.write("\n")
print(f"autoMode rules added to {path} ({len(allow)} allow entries); backup at {backup}")
