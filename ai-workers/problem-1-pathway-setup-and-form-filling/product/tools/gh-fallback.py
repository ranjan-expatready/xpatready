#!/usr/bin/env python3
"""The read-only gh commands the factory's tools use, answered with curl and `gh auth token` (P-363: gh fails TLS on the
Mac while curl with its token works). Called by gh.sh when gh fails on TLS; never on its own. Covers:
  repo view --json F            pr list [--state S] [--limit N] [--search Q] [--base B] [--head H] --json F
  pr view N --json F            search prs [Q ...] [--repo R] [--state S] [--limit N] --json F
  run list [--workflow W] [--branch B] [--limit N] --json F
  api ENDPOINT [-X M] [-f k=v] [-F k=v] [-H h] [--paginate]   (REST, and `api graphql`)
each with -q/--jq EXPR (run by jq, raw output, as gh does). Anything else exits 4 and names the command.
Env: GH_FALLBACK_API (default https://api.github.com), GH_TOKEN or GITHUB_TOKEN before `gh auth token`, GH_REPO.
Test: check-gh-fallback.sh."""
import json, os, re, subprocess, sys, tempfile

API = os.environ.get("GH_FALLBACK_API", "https://api.github.com").rstrip("/")

def die(msg, code=4):
    sys.stderr.write("gh fallback: " + msg + "\n"); sys.exit(code)

def token():
    t = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if t: return t
    r = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True)
    if r.returncode != 0 or not r.stdout.strip(): die("no token: gh auth token failed (" + r.stderr.strip() + ")", 2)
    return r.stdout.strip()

def curl(method, url, body=None):
    """One request with curl; returns (parsed JSON, Link header)."""
    with tempfile.NamedTemporaryFile() as h:
        cmd = ["curl", "-sS", "--fail-with-body", "-X", method, "-D", h.name, "-H", "Authorization: Bearer " + token(),
               "-H", "Accept: application/vnd.github+json", "-H", "X-GitHub-Api-Version: 2022-11-28"]
        if body is not None: cmd += ["-H", "Content-Type: application/json", "--data-binary", "@-"]
        r = subprocess.run(cmd + [url], input=json.dumps(body) if body is not None else None, capture_output=True, text=True)
        if r.returncode != 0: die("%s %s failed: %s %s" % (method, url, r.stderr.strip(), r.stdout.strip()[:300]), 1)
        link = ""
        for line in open(h.name, errors="replace"):
            if line.lower().startswith("link:"): link = line.split(":", 1)[1].strip()
    data = json.loads(r.stdout) if r.stdout.strip() else None
    if isinstance(data, dict) and data.get("errors"): die("GraphQL: " + json.dumps(data["errors"])[:300], 1)
    return data, link

def graphql(query, variables=None):
    return curl("POST", API + "/graphql", {"query": query, "variables": variables or {}})[0]["data"]

def repo(flags):
    r = flags.get("repo") or os.environ.get("GH_REPO")
    if not r:
        u = subprocess.run(["git", "remote", "get-url", "origin"], capture_output=True, text=True).stdout.strip()
        m = re.search(r"[:/]([^/:]+)/([^/]+?)(?:\.git)?/?$", u)
        if not m: die("cannot tell the repository from git remote 'origin' (" + u + "); set GH_REPO", 2)
        r = m.group(1) + "/" + m.group(2)
    return r.split("/", 1)

def parse(args, valued, multi=()):
    """Flags with values (by long name; short names mapped), the rest positional."""
    short = {"-q": "jq", "-L": "limit", "-s": "state", "-S": "search", "-R": "repo", "-X": "method", "-H": "header",
             "-f": "raw-field", "-F": "field", "-w": "workflow", "-b": "branch", "-B": "base"}
    flags, pos, i = {m: [] for m in multi}, [], 0
    while i < len(args):
        a = args[i]; name = short.get(a) or (a[2:] if a.startswith("--") else None)
        if name and "=" in name: name, v = name.split("=", 1); args = args[:i + 1] + [v] + args[i + 1:]
        if name in valued:
            if i + 1 >= len(args): die("flag " + a + " needs a value", 2)
            if name in multi: flags[name].append(args[i + 1])
            else: flags[name] = args[i + 1]
            i += 2
        elif name: flags[name] = True; i += 1
        else: pos.append(a); i += 1
    return flags, pos

def emit(data, flags):
    if flags.get("jq"):
        r = subprocess.run(["jq", "-r", flags["jq"]], input=json.dumps(data), capture_output=True, text=True)
        sys.stdout.write(r.stdout); sys.stderr.write(r.stderr); sys.exit(r.returncode)
    print(json.dumps(data)); sys.exit(0)

# Pull request fields: GraphQL selection and how gh shapes it.
nodes = lambda k: (lambda p: p[k]["nodes"])
PR = {
    "author": ("author{login}", lambda p: p["author"]),
    "labels": ("labels(first:50){nodes{name}}", nodes("labels")),
    "comments": ("comments(last:100){nodes{author{login} body createdAt url}}", nodes("comments")),
    "files": ("files(first:100){nodes{path additions deletions}}", nodes("files")),
    "reviews": ("reviews(last:100){nodes{author{login} state body submittedAt commit{oid}}}", nodes("reviews")),
    "commits": ("commits(last:100){nodes{commit{oid committedDate messageHeadline}}}", lambda p: [n["commit"] for n in p["commits"]["nodes"]]),
    "statusCheckRollup": ("scr:commits(last:1){nodes{commit{statusCheckRollup{contexts(first:100){nodes{__typename "
                          "... on CheckRun{name status conclusion startedAt completedAt detailsUrl} "
                          "... on StatusContext{context state targetUrl createdAt}}}}}}}",
                          lambda p: (((p["scr"]["nodes"] or [{}])[0].get("commit") or {}).get("statusCheckRollup") or {}).get("contexts", {}).get("nodes", [])),
}
PLAIN = set("number title body state isDraft url createdAt updatedAt mergedAt closedAt headRefName baseRefName headRefOid "
            "baseRefOid mergeable mergeStateStatus reviewDecision additions deletions changedFiles".split())

def pr_fields(fields):
    sel, conv = [], {}
    for f in fields:
        if f in PLAIN: sel.append(f)
        elif f in PR: sel.append(PR[f][0]); conv[f] = PR[f][1]
        else: die("pr field '%s' is not covered; use curl (P-363)" % f)
    return " ".join(sel), lambda p: {f: (conv[f](p) if f in conv else p.get(f)) for f in fields}

def pr_search(flags, terms):
    owner, name = repo(flags); fields = flags["json"].split(",") if isinstance(flags.get("json"), str) else die("--json is needed")
    sel, shape = pr_fields(fields)
    state = flags.get("state", "open")
    q = "repo:%s/%s is:pr %s %s" % (owner, name, {"open": "is:open", "merged": "is:merged", "closed": "is:closed", "all": ""}.get(state, "is:" + state), " ".join(terms))
    if flags.get("base"): q += " base:" + flags["base"]
    if flags.get("head"): q += " head:" + flags["head"]
    if "sort:" not in q: q += " sort:created-desc"
    limit, out, after = int(flags.get("limit", 30)), [], None
    while len(out) < limit:
        d = graphql("query($q:String!,$n:Int!,$a:String){search(type:ISSUE,query:$q,first:$n,after:$a){pageInfo{hasNextPage endCursor} nodes{... on PullRequest{%s}}}}" % sel,
                    {"q": " ".join(q.split()), "n": min(100, limit - len(out)), "a": after})["search"]
        out += [shape(p) for p in d["nodes"] if p]
        if not d["pageInfo"]["hasNextPage"]: break
        after = d["pageInfo"]["endCursor"]
    return out[:limit]

RUN = {"databaseId": "id", "status": "status", "conclusion": "conclusion", "headBranch": "head_branch", "headSha": "head_sha",
       "createdAt": "created_at", "updatedAt": "updated_at", "startedAt": "run_started_at", "event": "event", "name": "name",
       "workflowName": "name", "displayTitle": "display_title", "url": "html_url", "number": "run_number", "attempt": "run_attempt"}

def main(a):
    if a[:2] == ["repo", "view"]:
        flags, _ = parse(a[2:], {"json", "jq", "repo"}); owner, name = repo(flags)
        emit({"nameWithOwner": owner + "/" + name, "name": name, "owner": {"login": owner}}, flags)
    if a[:2] == ["pr", "list"]:
        flags, _ = parse(a[2:], {"json", "jq", "state", "limit", "search", "repo", "base", "head"})
        emit(pr_search(flags, [flags["search"]] if flags.get("search") else []), flags)
    if a[:2] == ["search", "prs"]:
        flags, terms = parse(a[2:], {"json", "jq", "state", "limit", "repo"}); emit(pr_search(flags, terms), flags)
    if a[:2] == ["pr", "view"]:
        flags, pos = parse(a[2:], {"json", "jq", "repo"}); owner, name = repo(flags)
        if not pos or not isinstance(flags.get("json"), str): die("pr view needs a number and --json")
        sel, shape = pr_fields(flags["json"].split(","))
        d = graphql("query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){%s}}}" % sel,
                    {"o": owner, "r": name, "n": int(pos[0].lstrip("#"))})
        emit(shape(d["repository"]["pullRequest"]), flags)
    if a[:2] == ["run", "list"]:
        flags, _ = parse(a[2:], {"json", "jq", "workflow", "branch", "limit", "repo", "status"}); owner, name = repo(flags)
        limit = int(flags.get("limit", 20)); base = "%s/repos/%s/%s/actions/" % (API, owner, name)
        url = base + ("workflows/%s/runs" % flags["workflow"] if flags.get("workflow") else "runs") + "?per_page=%d" % min(100, limit)
        for k in ("branch", "status"):
            if flags.get(k): url += "&%s=%s" % (k, flags[k])
        runs = curl("GET", url)[0]["workflow_runs"][:limit]
        fields = flags.get("json").split(",") if isinstance(flags.get("json"), str) else die("--json is needed")
        for f in fields:
            if f not in RUN: die("run field '%s' is not covered; use curl (P-363)" % f)
        emit([{f: r.get(RUN[f]) for f in fields} for r in runs], flags)
    if a[:1] == ["api"]:
        flags, pos = parse(a[1:], {"jq", "method", "header", "raw-field", "field", "repo", "input"}, multi=("raw-field", "field", "header"))
        if not pos: die("api needs an endpoint", 2)
        ep = pos[0]
        if "{owner}" in ep or "{repo}" in ep:
            owner, name = repo(flags); ep = ep.replace("{owner}", owner).replace("{repo}", name)
        vals = {}
        for kv in flags["raw-field"]: k, v = kv.split("=", 1); vals[k] = v
        for kv in flags["field"]:
            k, v = kv.split("=", 1)
            vals[k] = {"true": True, "false": False, "null": None}.get(v, int(v) if re.fullmatch(r"-?\d+", v) else v)
        if ep == "graphql":
            q = vals.pop("query", None) or die("api graphql needs -f query=...", 2)
            emit(curl("POST", API + "/graphql", {"query": q, "variables": vals})[0], flags)
        method = flags.get("method") or ("POST" if vals else "GET")
        url = ep if ep.startswith("http") else API + "/" + ep.lstrip("/")
        if method == "GET" and vals: url += ("&" if "?" in url else "?") + "&".join("%s=%s" % kv for kv in vals.items())
        data, link = curl(method, url, vals if method != "GET" and vals else None)
        while flags.get("paginate") and isinstance(data, list):
            m = re.search(r'<([^>]+)>;\s*rel="next"', link or "")
            if not m: break
            more, link = curl("GET", m.group(1)); data += more
        emit(data, flags)
    die("'gh %s' is not covered by the fallback; use curl with gh auth token (P-363)" % " ".join(a[:2]))

if __name__ == "__main__":
    main(sys.argv[1:])
