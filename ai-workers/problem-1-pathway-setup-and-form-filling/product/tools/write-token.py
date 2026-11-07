#!/usr/bin/env python3
"""No PR-controlled code runs with a write token (P-214 fix, 7 Nov; #1145 round 1 Major 1, #1202).

Reads every .github/workflows/*.yml (from the working tree, or from a git revision with --rev) and fails when a job
that can hold pull-requests: write or issues: write (its own permissions, else the workflow's, else GitHub's default,
counted as write) could run code from the pull request:

  pull_request workflows (the jobs run the PR's merge commit):
    W1  a write job checks out the PR: every actions/checkout in it must name the base commit
        (ref: github.event.pull_request.base.sha) and a path of its own;
    W2  ... with persist-credentials: false (else the token sits in .git/config for any later step);
    W3  ... and every run: line naming the product's files names them inside that checkout's path
        (e.g. node base/ai-workers/...), never the workspace the PR would fill;
    W4  a write job uses a local action (uses: ./...), which is the PR's code;
    W5  a write job runs a file from a downloaded artifact (the PR's jobs made it: data to read, never to run).
  pull_request_target / workflow_run workflows (main's copy runs, with the token):
    T1  a checkout names the PR's code (head.sha, head.ref, refs/pull/, merge_commit_sha, workflow_run.head_*);
    T2  a run: line checks out, switches to or builds the PR's fetched commits (git checkout/switch/worktree/
        reset/restore/archive/stash on pr/ or FETCH_HEAD, npm/npx/node/bash/sh/python on a pr/ path).

  python3 write-token.py [--rev REV] [--dir DIR]   exit 0 clean, 1 a finding, 2 could not check
"""
import argparse, os, re, subprocess, sys

try:
    import yaml
except ImportError:
    print("PyYAML is missing: nothing was checked"); sys.exit(2)

WRITE_SCOPES = ("pull-requests", "issues")
PR_CODE_REF = re.compile(r"head\.sha|head\.ref|head_sha|head_branch|refs/pull/|merge_commit_sha|github\.head_ref")
SWITCH = re.compile(r"\bgit\s+(checkout|switch|worktree|reset|restore|archive|stash)\b[^\n]*(pr/|FETCH_HEAD|refs/pull/)")
RUN_PR = re.compile(r"\b(npm|npx|node|bash|sh|python3?|tsx|make)\b[^\n]*\bpr/")
PRODUCT = re.compile(r"(?<![\w/.-])(\./)?ai-workers/")


def triggers(doc):
    on = doc.get("on", doc.get(True))  # PyYAML reads a bare `on:` key as True
    if isinstance(on, str):
        return {on}
    if isinstance(on, list):
        return set(on)
    return set((on or {}).keys())


def writes(perm):
    """True when this permissions value can give pull-requests or issues write (None: GitHub's default, counted)."""
    if perm is None:
        return True
    if isinstance(perm, str):
        return perm == "write-all"
    return any(str(perm.get(k, "")) == "write" for k in WRITE_SCOPES)


def check(name, text):
    out = []
    try:
        doc = yaml.safe_load(text) or {}
    except yaml.YAMLError as e:
        return [f"{name}: not YAML ({e})"]
    trig = triggers(doc)
    pr = "pull_request" in trig
    trusted = bool(trig & {"pull_request_target", "workflow_run"})
    for jid, job in (doc.get("jobs") or {}).items():
        job = job or {}
        perm = job["permissions"] if "permissions" in job else doc.get("permissions")
        if not writes(perm):
            continue
        where = f"{name} job {jid}"
        if "uses" in job and str(job["uses"]).startswith("./") and pr:
            out.append(f"W4 {where}: calls the local workflow {job['uses']} (the PR's copy) with a write token")
        steps = job.get("steps") or []
        paths, arts = [], []
        for st in steps:
            uses = str(st.get("uses", ""))
            w = st.get("with") or {}
            if pr and uses.startswith("./"):
                out.append(f"W4 {where}: uses the local action {uses} (the PR's code) with a write token")
            if uses.startswith("actions/download-artifact") and w.get("path"):
                arts.append(str(w["path"]).rstrip("/"))
            if uses.startswith("actions/checkout"):
                ref = str(w.get("ref", ""))
                if pr:
                    if "pull_request.base.sha" not in ref or not w.get("path"):
                        out.append(f"W1 {where}: checks out {'the PR (no ref)' if not ref else ref} with "
                                   "pull-requests/issues write; check out the base commit into a path of its own")
                    elif w.get("persist-credentials") is not False:
                        out.append(f"W2 {where}: checkout keeps the write token in .git/config (persist-credentials: false)")
                    else:
                        paths.append(str(w["path"]).rstrip("/") + "/")
                if trusted and PR_CODE_REF.search(ref):
                    out.append(f"T1 {where}: checks out the PR's code ({ref}) in a {'/'.join(sorted(trig))} workflow")
            run = st.get("run")
            if not run:
                continue
            for line in str(run).splitlines():
                if pr:
                    for m in PRODUCT.finditer(line):
                        head = line[:m.start()]
                        if not any(head.endswith(p) or head.endswith("/" + p) for p in paths) and "${{" not in line[max(0, m.start() - 3):m.start()]:
                            out.append(f"W3 {where}: runs the product's files from the PR's workspace: {line.strip()[:120]}")
                            break
                for d in arts:
                    if re.search(r"(^|[;&|(]\s*|\s)(bash|sh|zsh|node|npx|tsx|python3?|source|\.|chmod)\s+[\"']?(\./)?" + re.escape(d) + "/", line):
                        out.append(f"W5 {where}: runs a downloaded artifact's file: {line.strip()[:120]}")
                if trusted and (SWITCH.search(line) or RUN_PR.search(line)):
                    out.append(f"T2 {where}: runs or checks out the PR's fetched commits: {line.strip()[:120]}")
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
