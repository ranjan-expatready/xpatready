#!/usr/bin/env python3
"""Measure, from local git history only, which files merged PRs touched and where real textual
conflicts happened. For each first-parent merge 'Merge pull request #N' on main since SINCE:
  files  = git diff --name-only H^1 H                       (what the PR changed)
  class  = app (P-500 folders) / tests / tooling / records-docs
  inner merges = merge commits inside the branch (H^1..H^2); each is re-merged with
  `git merge-tree --write-tree --name-only`; exit 1 = a real conflict, with its files.
Usage: conflicts_from_git.py <repo> <since ISO> <out prefix>"""
import subprocess, sys, re, collections, json
repo, since, out = sys.argv[1:4]
APP = re.compile(r'^ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/(api/src|web/src|engine|prisma|contracts|samples|packages)/')
TESTS = re.compile(r'^ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/(tests|acceptance|evidence)/')
TOOL = re.compile(r'^(tools/|\.github/|\.mergify|\.githooks/|\.claude/|ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tools/|packages/)')
STUDIO = 'ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/'
def g(*a, ok=(0,)):
    p = subprocess.run(['git', '-C', repo, *a], capture_output=True, text=True)
    if p.returncode not in ok: raise SystemExit(p.stderr)
    return p.returncode, p.stdout
_, log = g('log', 'origin/main', '--first-parent', '--merges', f'--since={since}', '--format=%H\t%cI\t%s')
rows = []; filetouch = collections.Counter(); conf_files = collections.Counter(); conf_by_pr = {}
for line in log.splitlines():
    h, t, s = line.split('\t', 2)
    m = re.match(r'Merge pull request #(\d+) from \S+/(\S+)', s)
    if not m: continue
    pr, br = int(m.group(1)), m.group(2)
    _, fl = g('diff', '--name-only', f'{h}^1', h); files = [f for f in fl.splitlines() if f]
    app = [f for f in files if APP.match(f)]
    cls = 'app' if app else 'tests' if any(TESTS.match(f) for f in files) else 'tooling' if any(TOOL.match(f) for f in files) else 'records-docs'
    _, inner = g('rev-list', '--merges', f'{h}^1..{h}^2')
    inner = inner.split(); nconf = 0; cf = set()
    for mc in inner:
        _, ps = g('rev-list', '--parents', '-n1', mc); ps = ps.split()
        if len(ps) < 3: continue
        rc, mt = g('merge-tree', '--write-tree', '--name-only', '--no-messages', ps[1], ps[2], ok=(0, 1))
        if rc == 1:
            nconf += 1; fs = [x for x in mt.splitlines()[1:] if x.strip()]; cf.update(fs)
    for f in cf: conf_files[f] += 1
    if cls == 'app':
        for f in app: filetouch[f] += 1
    rows.append(dict(pr=pr, merged=t, branch=br, cls=cls, files=len(files), app_files=len(app),
                     inner_merges=len(inner), conflicted_merges=nconf, conflict_files=sorted(cf)))
with open(out + '-prs.tsv', 'w') as fh:
    fh.write('pr\tmerged\tclass\tfiles\tapp_files\tmerges_of_main\tconflicted_merges\tbranch\tconflict_files\n')
    for r in rows:
        fh.write(f"{r['pr']}\t{r['merged']}\t{r['cls']}\t{r['files']}\t{r['app_files']}\t{r['inner_merges']}\t{r['conflicted_merges']}\t{r['branch']}\t{';'.join(x.replace(STUDIO,'') for x in r['conflict_files'])}\n")
with open(out + '-hot-files.tsv', 'w') as fh:
    fh.write('file\tapp_prs_touching\tprs_with_conflict_on_it\n')
    keys = set(filetouch) | set(conf_files)
    for f in sorted(keys, key=lambda k: (-conf_files[k], -filetouch[k])):
        fh.write(f"{f.replace(STUDIO,'')}\t{filetouch[f]}\t{conf_files[f]}\n")
c = collections.Counter(r['cls'] for r in rows); print('merged PRs by class:', dict(c), 'total', len(rows))
app = [r for r in rows if r['cls'] == 'app']
print('app PRs: with >=1 merge of main', sum(1 for r in app if r['inner_merges']), 'merges of main', sum(r['inner_merges'] for r in app),
      '| PRs with a real conflict', sum(1 for r in app if r['conflicted_merges']), 'conflicted merges', sum(r['conflicted_merges'] for r in app))
print('top conflict files:', conf_files.most_common(15))
print('top touched app files:', [(f.replace(STUDIO,''), n) for f, n in filetouch.most_common(15)])
