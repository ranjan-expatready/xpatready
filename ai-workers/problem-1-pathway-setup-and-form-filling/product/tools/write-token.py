#!/usr/bin/env python3
"""No PR-controlled code runs with a write token (P-214 fix, 7 Nov; #1145 round 1 Major 1, #1202).

Reads every .github/workflows/*.yml (from the working tree, or from a git revision with --rev) and fails when a job
that can hold a write token (any `write` scope or write-all in its own permissions, else the workflow's, else GitHub's
default, counted as write) could run code from a pull request or a branch:

  PR-controlled workflows (pull_request, or push to any branch but main: the branch's own copy of the file runs):
    W0  a write job that is not on ALLOW below: a new one is a reviewed change to this file, never silent;
    W1  a write job checks out anything but the base commit (exactly ref: ${{ github.event.pull_request.base.sha }})
        into a path of its own;
    W2  ... or keeps the token in .git/config (persist-credentials must be false);
    W3  a run: line names the product's files (ai-workers/, "$P/", "$S/", "$T/") outside that checkout's path;
    W4  a write job uses a local action or workflow (uses: ./...), the PR's code;
    W5  a write job downloads an artifact into the workspace (no path:) or runs a file from one.
  Main's-code workflows that hold PR data (pull_request_target, workflow_run, issue_comment, pull_request_review,
  pull_request_review_comment: main's copy runs, with the token):
    T1  a checkout names the PR's code (head.sha/ref, refs/pull/, merge_commit_sha, workflow_run.head_*, another
        repository);
    T2  a run: line checks out, switches to, pipes or builds the PR's fetched commits (pr/, FETCH_HEAD, gh pr checkout);
    T3  a run: line pastes PR-written text (title, body, branch name, comment, review) into the script (GitHub's
        script-injection guidance: pass it through env: instead).
A guard, not the boundary: a PR can edit this file too. The boundary is that main's copy decides (records-label.yml,
label-guard.yml), and a new write job fails here in the PR's own check (W0) where the reviewer sees it.

  python3 write-token.py [--rev REV] [--dir DIR]   exit 0 clean, 1 a finding, 2 could not check
"""
import argparse, os, re, subprocess, sys

try:
    import yaml
except ImportError:
    print("PyYAML is missing: nothing was checked"); sys.exit(2)

# (workflow file, job): the write jobs of PR-controlled workflows that were reviewed. retry-comment: base commit's
# flaky.mjs only, artifacts read as data (B122 F5, #1145).
ALLOW = {("ci.yml", "retry-comment")}
TRUSTED = {"pull_request_target", "workflow_run", "issue_comment", "pull_request_review", "pull_request_review_comment"}
BASE_REF = "${{ github.event.pull_request.base.sha }}"
PR_CODE_REF = re.compile(r"head\.sha|head\.ref|head_sha|head_branch|refs/pull/|merge_commit_sha|github\.head_ref|pull/\d|\bpr/")
SWITCH = re.compile(r"\bgit\b[^\n]*\b(checkout|switch|worktree|reset|restore|archive|stash|show|cat-file\s+-p|read-tree)\b[^\n]*(\bpr/|FETCH_HEAD|refs/pull/|head\.sha)"
                    r"|--work-tree[^\n]*\b(pr/|FETCH_HEAD)|\bgh\s+pr\s+(checkout|diff)\b|\bgh\s+repo\s+clone\b")
RUN_PR = re.compile(r"\b(npm|npx|node|bash|sh|zsh|python3?|tsx|make|source)\b[^\n]*(\s|^|[\"'])pr/")
INJECT = re.compile(r"\$\{\{\s*github\.(event\.(pull_request\.(title|body|head\.ref|head\.label)|issue\.(title|body)"
                    r"|comment\.body|review\.body|review_comment\.body|workflow_run\.(head_branch|display_title|head_commit\.message))|head_ref)\s*\}\}")
PRODUCT = re.compile(r"(?<![\w/.-])(\./)?ai-workers/|\"?\$\{?[PST]\}?/")


def triggers(doc):
    on = doc.get("on", doc.get(True))  # PyYAML reads a bare `on:` key as True
    if isinstance(on, str):
        return {on: None}
    if isinstance(on, list):
        return {t: None for t in on}
    return dict(on or {})


def pr_controlled(trig):
    if "pull_request" in trig:
        return True
    if "push" in trig:
        b = (trig["push"] or {}).get("branches") if isinstance(trig["push"], dict) else None
        return b != ["main"]
    return False


def writes(perm):
    """True when this permissions value can give any write scope (None: GitHub's default, counted)."""
    if perm is None:
        return True
    if isinstance(perm, str):
        return perm == "write-all"
    return any(str(v) == "write" for v in perm.values())


def check(name, text):
    out = []
    try:
        doc = yaml.safe_load(text) or {}
    except yaml.YAMLError as e:
        return [f"{name}: not YAML ({e})"]
    trig = triggers(doc)
    pr = pr_controlled(trig)
    trusted = bool(set(trig) & TRUSTED)
    for jid, job in (doc.get("jobs") or {}).items():
        job = job or {}
        perm = job["permissions"] if "permissions" in job else doc.get("permissions")
        if not writes(perm):
            continue
        where = f"{name} job {jid}"
        if pr and (name, jid) not in ALLOW:
            out.append(f"W0 {where}: a write token in a workflow the PR or branch controls, and not a reviewed job (ALLOW)")
        if pr and str(job.get("uses", "")).startswith("./"):
            out.append(f"W4 {where}: calls the local workflow {job['uses']} (the PR's copy) with a write token")
        paths, arts = [], []
        for st in job.get("steps") or []:
            uses = str(st.get("uses", ""))
            w = st.get("with") or {}
            if pr and uses.startswith("./"):
                out.append(f"W4 {where}: uses the local action {uses} (the PR's code) with a write token")
            if pr and uses.startswith("actions/download-artifact"):
                if not w.get("path"):
                    out.append(f"W5 {where}: downloads an artifact into the workspace (give it a path of its own)")
                else:
                    arts.append(str(w["path"]).rstrip("/"))
            if uses.startswith("actions/checkout"):
                ref = str(w.get("ref", "")).strip()
                if pr:
                    if ref != BASE_REF or not w.get("path") or w.get("repository"):
                        out.append(f"W1 {where}: checks out {ref or 'the PR (no ref)'} with a write token; "
                                   "check out exactly the base commit into a path of its own")
                    elif w.get("persist-credentials") is not False:
                        out.append(f"W2 {where}: checkout keeps the write token in .git/config (persist-credentials: false)")
                    else:
                        paths.append(str(w["path"]).rstrip("/") + "/")
                if trusted and (PR_CODE_REF.search(ref) or (w.get("repository") and "github.repository" not in str(w["repository"]))):
                    out.append(f"T1 {where}: checks out the PR's code ({ref or w.get('repository')}) in a {'/'.join(sorted(set(trig) & TRUSTED))} workflow")
            run = st.get("run")
            if not run:
                continue
            for line in str(run).splitlines():
                if pr:
                    for m in PRODUCT.finditer(line):
                        head = line[:m.start()].rstrip('"')
                        if not any(head.endswith(p.rstrip("/")) or head.endswith(p) for p in paths):
                            out.append(f"W3 {where}: runs the product's files from the workspace: {line.strip()[:120]}")
                            break
                    for d in arts:
                        if re.search(r"(^|[;&|(]\s*|\s)(bash|sh|zsh|node|npx|tsx|python3?|source|\.|chmod|cd)\s+[\"']?(\./)?" + re.escape(d) + r"(/|\s|$)", line):
                            out.append(f"W5 {where}: runs a downloaded artifact's file: {line.strip()[:120]}")
                if trusted and (SWITCH.search(line) or RUN_PR.search(line)):
                    out.append(f"T2 {where}: runs or checks out the PR's fetched commits: {line.strip()[:120]}")
                if trusted and INJECT.search(line):
                    out.append(f"T3 {where}: pastes PR-written text into the script: {line.strip()[:120]}")
    return out


def files(rev, d):
    if rev:
        ls = subprocess.run(["git", "ls-tree", "--name-only", f"{rev}:.github/workflows"], capture_output=True, text=True)
        if ls.returncode:
            print(f"no .github/workflows at {rev}: nothing was checked"); sys.exit(2)
        for n in sorted(ls.stdout.split()):
            if n.endswith((".yml", ".yaml")):
                yield n, subprocess.run(["git", "show", f"{rev}:.github/workflows/{n}"], capture_output=True, text=True).stdout
    else:
        for n in sorted(os.listdir(d)):
            if n.endswith((".yml", ".yaml")):
                with open(os.path.join(d, n)) as f:
                    yield n, f.read()


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--rev")
    a.add_argument("--dir", default=".github/workflows")
    o = a.parse_args()
    found, n = [], 0
    for name, text in files(o.rev, o.dir):
        n += 1
        found += check(name, text)
    if n == 0:
        print("no workflow files: nothing was checked"); sys.exit(2)
    for f in found:
        print("FAIL  " + f)
    print(f"{n} workflows, {len(found)} findings: " + ("no PR-controlled code runs with a write token" if not found else "a write token is reachable by PR code"))
    sys.exit(1 if found else 0)


if __name__ == "__main__":
    main()
