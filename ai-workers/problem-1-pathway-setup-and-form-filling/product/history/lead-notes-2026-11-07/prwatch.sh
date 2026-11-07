#!/bin/zsh
# usage: prwatch.sh <pr>...  — one line per change: PR head/state/labels/checks + failing names; main head checks; merge-queue runs
R=$(git remote get-url origin | sed -E "s#.*github.com[:/]##; s#\.git$##")
T=$(gh auth token 2>/dev/null)
H=(-s -m 20 -H "Authorization: Bearer $T")
typeset -A prev
emit(){ local k=$1 v=$2; [[ "${prev[$k]}" != "$v" ]] && { print -r -- "$(TZ=Asia/Kolkata date +%H:%M) IST $v"; prev[$k]=$v; } }
sumchecks(){ curl $H "https://api.github.com/repos/$R/commits/$1/check-runs?per_page=100&filter=latest" | jq -r '"[" + ([.check_runs[]|(.conclusion // .status)]|group_by(.)|map("\(.[0])=\(length)")|join(" ")) + "]" + ([.check_runs[]|select(.conclusion=="failure" or .conclusion=="timed_out")|.name]|if length>0 then " FAILED: "+join(", ") else "" end)' 2>/dev/null; }
while true; do
  for n in "$@"; do
    j=$(curl $H https://api.github.com/repos/$R/pulls/$n) || continue
    st=$(print -r -- "$j" | jq -r '"\(.state) merged=\(.merged) head=\(.head.sha[0:9]) labels=\([.labels[].name]|join(","))"' 2>/dev/null) || continue
    [[ -z "$st" || "$st" == null* ]] && continue
    sha=$(print -r -- "$j" | jq -r .head.sha)
    emit $n "#$n $st checks$(sumchecks $sha)"
  done
  m=$(curl $H https://api.github.com/repos/$R/commits/main | jq -r .sha 2>/dev/null)
  [[ -n "$m" && "$m" != null ]] && emit main "main ${m[1,9]} checks$(sumchecks $m)"
  q=$(curl $H "https://api.github.com/repos/$R/actions/runs?per_page=20" | jq -r '[.workflow_runs[]|select(.head_branch|startswith("mergify/"))|"\(.head_branch|split("/")|last) \(.created_at[11:16])Z \(.conclusion // .status)"]|.[0:3]|join(" | ")' 2>/dev/null)
  [[ -n "$q" ]] && emit queue "queue: $q"
  nr=$(curl $H "https://api.github.com/repos/$R/actions/workflows/nightly.yml/runs?per_page=1" | jq -r ".workflow_runs[0]|\"nightly \\(.id) \\(.event) \\(.created_at[11:16])Z \\(.conclusion // .status)\"" 2>/dev/null)
  [[ -n "$nr" ]] && emit nightly "$nr"
  sleep 60
done
