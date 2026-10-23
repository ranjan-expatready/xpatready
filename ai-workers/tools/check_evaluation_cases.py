#!/usr/bin/env python3
"""Check the evaluation seed cases (scrum 5.7 and 5.8; checker 2026-10-15T15:09:05Z, condition 3).

Read-only. Source: requirements/tests/evaluation-cases.csv. Checks that:
  1. every row has the columns and a unique, well-formed Case ID;
  2. every live AI set of AW-01 §11.4 (E-n) and AW-02 §11.4 (EV-n) has cases (rules tests excluded);
  3. each set has at least one Normal, one "Missing, stale or conflicting" and one
     "Refuse or flag" case, and E-18 has at least one case with advice-like phrasing;
  4. every case is labelled seed, held out, with its pass bar Unknown;
  5. every answer is Unconfirmed unless "Confirmed by" names a dated confirmation;
  6. every cited fixture exists in requirements/tests/fixtures.csv;
  7. the file uses LF line endings and every field is quoted.
A seed set sets no pass bar or catch rate; nothing here is run against a model (AIW-D139, D160).

Usage (from the repository root):
  python3 ai-workers/tools/check_evaluation_cases.py [--root ai-workers] [--json FILE]
Exit code 1 when a check fails.
"""
import argparse, csv, io, json, os, re, sys

HEAD = ['Case ID', 'Set', 'Use', 'Doer', 'Label', 'Bucket', 'Scored or example', 'Fixtures', 'Made-up input',
        'Proposed known answer', 'Zero-tolerance item', 'Advice-like phrasing', 'Answer status', 'Confirmed by',
        'Pass bar', 'Sources']
BUCKETS = ['Normal', 'Missing, stale or conflicting', 'Refuse or flag']


def sets_in(path, prefix):
    """The live set IDs in a module's §11.4 table: rows that start '| E-n |' or '| **EV-n** |',
    leaving out withdrawn rows (struck through or marked withdrawn in the first cell) and rows the
    table marks 'a rules test' (EV-4, skill 13: rules only, so it passes functional tests and is never
    a model-quality set, AW-1-155, AIW-D92)."""
    found = set()
    for line in open(path, encoding='utf-8'):
        m = re.match(r'\| (?:\*\*)?(' + prefix + r'-\d+)(?:\*\*)?([^|]*)\|', line)
        if m and not line.startswith('| ~~') and 'withdrawn' not in m.group(2).lower() and 'a rules test' not in line:
            found.add(m.group(1))
    return sorted(found, key=lambda s: int(s.split('-')[1]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default=os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')))
    ap.add_argument('--json')
    a = ap.parse_args()
    req = os.path.join(a.root, 'requirements')
    path = os.path.join(req, 'tests', 'evaluation-cases.csv')
    raw = open(path, encoding='utf-8', newline='').read()
    rows = list(csv.DictReader(io.StringIO(raw)))
    fixtures = {r['Fixture ID'] for r in csv.DictReader(open(os.path.join(req, 'tests', 'fixtures.csv'), encoding='utf-8'))}
    aw1 = sets_in(os.path.join(req, 'AW-01-firm-ai-assistants_v0.1.md'), 'E')
    aw2 = sets_in(os.path.join(req, 'AW-02-platform-ai-assistants_v0.1.md'), 'EV')
    checks = []

    def check(name, bad):
        checks.append({'check': name, 'pass': not bad, 'failures': len(bad), 'offenders': bad[:25]})

    header = next(csv.reader(io.StringIO(raw)))
    bad = [] if header == HEAD else ['header differs: ' + '; '.join(header)]
    ids = [r['Case ID'] for r in rows]
    bad += [i for i in ids if not re.fullmatch(r'EC-(?:E|EV)\d{2}-\d{2}', i)]
    bad += sorted({i for i in ids if ids.count(i) > 1})
    check('Columns are complete and every Case ID is unique and well-formed', bad)

    by_set = {}
    for r in rows:
        by_set.setdefault(r['Set'], []).append(r)
    expected = aw1 + aw2
    bad = [s + ': no cases' for s in expected if s not in by_set]
    bad += [s + ': not a set in §11.4' for s in by_set if s not in aw1 + aw2]
    check('Every live AI set of AW-01 §11.4 and AW-02 §11.4 has cases, and no case names another set', bad)

    bad = []
    for s in expected:
        got = {r['Bucket'] for r in by_set.get(s, [])}
        bad += [f'{s}: no "{b}" case' for b in BUCKETS if b not in got]
    bad += [f"{r['Case ID']}: bucket '{r['Bucket']}'" for r in rows if r['Bucket'] not in BUCKETS]
    if not any(r['Advice-like phrasing'] == 'Yes' for r in by_set.get('E-18', [])):
        bad.append('E-18: no case with advice-like phrasing')
    check('Each set mixes a normal, a missing/stale/conflicting and a refuse-or-flag case; E-18 has advice-like phrasing', bad)

    bad = [r['Case ID'] for r in rows if not r['Label'].startswith('Seed') or not r['Scored or example'].startswith('Held-out')
           or not r['Pass bar'].startswith('Unknown')]
    check('Every case is labelled seed, held out, with its pass bar Unknown', bad)

    bad = []
    for r in rows:
        dated = re.search(r'\d{4}-\d{2}-\d{2}', r['Confirmed by']) and not r['Confirmed by'].startswith('Pending')
        if r['Answer status'] == 'Unconfirmed' and dated:
            bad.append(r['Case ID'] + ': confirmed but marked Unconfirmed')
        if r['Answer status'] != 'Unconfirmed' and not dated:
            bad.append(r['Case ID'] + ': not Unconfirmed, and no dated confirmation by the Immigration SME role')
        if not r['Made-up input'].strip() or not r['Proposed known answer'].strip():
            bad.append(r['Case ID'] + ': empty input or answer')
    check('Every answer is Unconfirmed until the Immigration SME role confirms it, and no input or answer is empty', bad)

    bad = []
    for r in rows:
        cited = re.findall(r'\bFX-[A-Z0-9]+(?:-[A-Z0-9]+)*\b', r['Fixtures'] + ' ' + r['Made-up input'])
        bad += [f"{r['Case ID']}: {f}" for f in cited if f not in fixtures]
        if not cited:
            bad.append(r['Case ID'] + ': cites no fixture')
    check('Every case cites fixtures, and every cited fixture exists', bad)

    buf = io.StringIO()
    csv.writer(buf, quoting=csv.QUOTE_ALL, lineterminator='\n').writerows(csv.reader(io.StringIO(raw)))
    check('LF line endings and every field quoted (the csv module rewrites the file byte-identically)',
          [] if buf.getvalue() == raw else ['file differs from its QUOTE_ALL, LF rewrite'])

    summary = {'cases': len(rows), 'sets': {s: len(v) for s, v in sorted(by_set.items(), key=lambda kv: (kv[0][:2], int(kv[0].split('-')[1])))},
               'zeroTolerance': sum(1 for r in rows if r['Zero-tolerance item'].startswith('Yes')),
               'adviceLike': sum(1 for r in rows if r['Advice-like phrasing'] == 'Yes'),
               'unconfirmed': sum(1 for r in rows if r['Answer status'] == 'Unconfirmed'),
               'checksPassed': sum(c['pass'] for c in checks), 'checksTotal': len(checks),
               'verdict': 'PASS' if all(c['pass'] for c in checks) else 'FAIL', 'checks': checks}
    if a.json:
        json.dump(summary, open(a.json, 'w', encoding='utf-8'), indent=1)
    print(json.dumps({k: v for k, v in summary.items() if k != 'checks'}))
    for c in checks:
        print(('PASS ' if c['pass'] else 'FAIL ') + c['check'] + ('' if c['pass'] else f" ({c['failures']}): " + '; '.join(c['offenders'][:6])))
    return 0 if summary['verdict'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
