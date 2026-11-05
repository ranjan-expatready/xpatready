#!/usr/bin/env bash
# Factory board (founder, 5 Nov, A137): every open row's station, how long since its last push, and a red flag.
# Read-only, from GitHub only. Station is worked out from the PR's state, so a Mac lane with no PR yet does not show:
# read STATE "In flight" for those. Usage: bash product/tools/factory-board.sh
now=$(date -u +%s)
repo=$(gh repo view --json owner,name -q '.owner.login+" "+.name'); dates=$(gh api graphql -F o="${repo% *}" -F r="${repo#* }" -f query='query($o:String!,$r:String!){repository(owner:$o,name:$r){pullRequests(states:OPEN,first:60){nodes{number commits(last:1){nodes{commit{committedDate}}}}}}}' \
  --jq '.data.repository.pullRequests.nodes[]|"\(.number) \(.commits.nodes[0].commit.committedDate)"')
gh pr list --state open --limit 60 --json number,title,isDraft,labels,statusCheckRollup,comments,body \
  --jq '.[]|select(.title|test("^(lead|qa):")|not)|[
      .number,
      (.title|sub("^[a-z]+: ";"")|.[0:44]),
      .isDraft,
      ((.labels|map(.name)|index("review: approved"))!=null),
      ((.statusCheckRollup|map(.conclusion)|map(select(.=="FAILURE"))|length)),
      ((.statusCheckRollup|map(select((.status//"")=="IN_PROGRESS" or (.status//"")=="QUEUED"))|length)),
      (((.comments|map(select(.body|test("Question for the tech lead")))|last|.createdAt)//"") as $q
        | ((.comments|map(select(.body|test("^## Tech lead|^\\*\\*Tech lead|Tech lead.s (ruling|answer)")))|last|.createdAt)//"") as $a
        | if $q!="" and $q>$a then "open" else "-" end),
      ((.body|test("Design only|Design stage|Concept stage|concept for the tech lead"))),
      ((.title|test("C4\\.11|C10\\.1|B8[0-9]|B7[0-9]"))|if . then "M2" else "M3?" end)
    ]|@tsv' |
while IFS=$'\t' read -r n title draft label red running q design ms; do
  pushed=$(printf '%s\n' "$dates" | awk -v n="$n" '$1==n{print $2}')
  mins=$(( (now - $(date -ju -f '%Y-%m-%dT%H:%M:%SZ' "$pushed" +%s)) / 60 ))
  if   [ "$label" = true ];  then st="Merge queue"
  elif [ "$q" = open ];      then st="Question to Lead"
  elif [ "$design" = true ]; then st="Concept"
  elif [ "$draft" = true ];  then st="Building"
  elif [ "$running" != 0 ];  then st="CI running"
  elif [ "$red" != 0 ];      then st="CI red"
  else st="Ready for label"; fi
  flag=""; [ "$red" != 0 ] && flag="red checks: $red"; [ "$mins" -gt 90 ] && flag="$flag no push ${mins}m"
  printf '#%-5s %-3s %-17s %5sm  %-44s %s\n' "$n" "$ms" "$st" "$mins" "$title" "$flag"
done | sort -k3
