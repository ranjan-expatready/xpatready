#!/bin/zsh
# Read-only check. Archive downloads have no .git; use their folder SHA and source index.
# Works under bash and zsh: the repo root is two folders above tools/.
ROOT="$(cd "$(dirname "$0")/../.." && pwd -P)"
python3 - "$ROOT" <<'PY'
import pathlib,re,subprocess,sys,json
root=pathlib.Path(sys.argv[1]); index=(root/'code/README-copies.md').read_text()
latest={}; ambiguous=set(); failed=False
for d in sorted((root/'code').iterdir()):
    m=re.fullmatch(r'(.+)@([0-9a-f]+)-(\d{4}-\d{2}-\d{2})',d.name)
    if not d.is_dir() or not m:continue
    repo,sha,date=m.groups()
    if repo not in latest or date>latest[repo][2]:
        latest[repo]=(d,sha,date); ambiguous.discard(repo)
    elif date==latest[repo][2]:ambiguous.add(repo)
def api(route):
    try:r=subprocess.run(['gh','api',route],capture_output=True,text=True)
    except FileNotFoundError:
        print('UNVERIFIED: gh not available');sys.exit(1)
    if r.returncode:raise RuntimeError(r.stderr.strip().splitlines()[-1] if r.stderr.strip() else 'GitHub read failed')
    return json.loads(r.stdout)
print('Code: newest local copy versus GitHub default branch and dev')
if not latest:print('UNVERIFIED: no dated code copies');failed=True
for repo,(d,sha,date) in sorted(latest.items()):
    slugs=set(re.findall(r'github\.com/([^/\s\x60]+/'+re.escape(repo)+r')(?=[/\x60\s])',index))
    if len(slugs)!=1:
        print(f'{repo}: UNVERIFIED source mapping ({len(slugs)} matches)');failed=True;continue
    slug=next(iter(slugs))
    try:
        meta=api('repos/'+slug); branches=list(dict.fromkeys([meta['default_branch'],'dev']))
        # The source index records dev for ERv2 copies and main for the older repositories.
        target_branch='dev' if repo.startswith('ERv2-') else meta['default_branch']
        if repo in ambiguous:
            target=api('repos/'+slug+'/commits/'+target_branch)
            candidates=[]
            for candidate in (root/'code').iterdir():
                match=re.fullmatch(re.escape(repo)+r'@([0-9a-f]+)-'+date,candidate.name)
                if match and candidate.is_dir() and target['sha'].startswith(match[1]):candidates.append((candidate,match[1]))
            if len(candidates)!=1:
                print(f'{repo}: UNVERIFIED — {len(candidates)} same-date copies match the live target; refresh or select evidence explicitly');failed=True;continue
            d,sha=candidates[0]
            print(f'{repo}: multiple same-date captures; using only the one matching live {target_branch}')
        for branch in branches:
            try:remote=api('repos/'+slug+'/commits/'+branch)
            except RuntimeError as e:
                if branch!=target_branch and '(HTTP 422)' in str(e):continue
                raise
            status='MATCH' if remote['sha'].startswith(sha) else ('STALE' if branch==target_branch else 'DIFFERENT REFERENCE BRANCH')
            print(f'{d.name} | {branch}: {remote["sha"][:7]} ({remote["commit"]["committer"]["date"]}) | {status}')
            if status=='STALE':failed=True
    except (RuntimeError,KeyError,ValueError) as e:
        print(f'{repo}: UNVERIFIED — {e}');failed=True
snapshots=sorted((root/'sources').glob('drive-snapshot-*'))
print('Drive: newest local snapshot '+(snapshots[-1].name if snapshots else 'NONE'))
print('Lead must check live Drive metadata before citing requirements; this script does not check Drive.')
sys.exit(1 if failed else 0)
PY
