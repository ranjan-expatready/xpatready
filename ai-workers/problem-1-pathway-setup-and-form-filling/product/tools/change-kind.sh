#!/usr/bin/env bash
# What a pull request or merge-queue batch changes, so CI runs only what that kind of change needs (I1, 3 Nov: P-291 (3),
# P-292 (2)). Prints one word:
#   notes    every changed file is a *.md record or under product/reports/ (none under sources/, code/, archive/, .tools,
#            no .md the app or a suite reads as data, such as the AI prompts or STAND-INS.md, and none of graph.mjs's
#            inputs: DECISIONS.md, decisions/, qa/CAPABILITIES.md): only check-docs.sh and decision-impact.sh run (and
#            the push guard, which keeps excluded paths, secrets and names off GitHub).
#   code     a file the app, its suites or their tools depend on (select-suites.mjs chooses everything, or a suite for a
#            reason other than the smoke set): the suites run, the affected ones on the PR and every one in the queue.
#   records  anything else (boards, guards, settings, other workflows): the fast checks, no suites.
# Usage: change-kind.sh <base>..<head>   (the files of git diff <base>...<head>, as run-suites.sh --changed reads them)
#        change-kind.sh --files          (the changed paths on stdin; used by check-select-suites.sh)
set -u
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT" || exit 2
P=ai-workers/problem-1-pathway-setup-and-form-filling
if [ "${1:-}" = --files ]; then files=$(cat)
elif [[ "${1:-}" == *..* ]]; then files=$(git -c core.quotePath=false diff --no-renames --name-only "${1%%..*}...${1##*..}") || { echo "git diff failed" >&2; exit 2; }
else echo "usage: change-kind.sh <base>..<head> | --files" >&2; exit 2; fi
files=$(printf '%s\n' "$files" | grep . || true)
# Notes: *.md or product/reports/; never an excluded path (the push guard refuses those) or a data .md (prompts, the API's
# own guide, test fixtures, official sources).
other=$(printf '%s\n' "$files" | grep . | grep -vE "\.md$|^$P/product/reports/" || true)
risky=$(printf '%s\n' "$files" | grep -E "(^|/)(sources|code|archive|\.tools)/|^$P/product/(DECISIONS\.md|decisions/|qa/CAPABILITIES\.md)|^$P/prototype/(.*/)?prompts/|^$P/prototype/studio/(api/src|tests/fixtures)/|^$P/official-sources/" || true)
sel=$(printf '%s\n' "$files" | node "$P/product/tools/select-suites.mjs") || { echo "select-suites.mjs failed" >&2; exit 2; }
if printf '%s\n' "$sel" | awk -F'\t' '$1 == "ALL" || ($1 != "" && $2 != "smoke") { found = 1 } END { exit !found }'; then echo code
elif [ -z "$other" ] && [ -z "$risky" ]; then echo notes; else echo records; fi
