#!/bin/bash
# Decision impact check (P-74): every product decision from P-61 on must become something a person can see and the
# tester can verify — a capability row in qa/CAPABILITIES.md (scheduled now) or a B-row in BACKLOG*.md (scheduled later; the B-rows live in BACKLOG-requirements*.md since 31 Oct).
# B-rows include the Bake's BK-n rows and lettered rows such as B170d (Lead 24, 12 Nov). A mention in a lane note is not enough. Workflow and scope decisions are listed in EXEMPT. Exit 1 if any is missing. Run by the Lead before ending a chat (skill lead) and by
# the qa lane (skill qa). Usage: decision-impact.sh [first P-number, default 61]
PH="$(cd "$(dirname "$0")/.." && pwd)"; first=${1:-61}; bad=0
EXEMPT=" P-548 P-547 P-546 P-545 P-544 P-543 P-542 P-540 P-538 P-537 P-536 P-534 P-533 P-532 P-530 P-529 P-528 P-527 P-524 P-523 P-522 P-521 P-520 P-519 P-517 P-516 P-515 P-514 P-512 P-511 P-509 P-508 P-507 P-506 P-505 P-503 P-502 P-501 P-500 P-499 P-498 P-497 P-487 P-494 P-489 P-488 P-486 P-485 P-482 P-481 P-480 P-479 P-478 P-472 P-468 P-463 P-462 P-461 P-460 P-458 P-457 P-456 P-455 P-454 P-453 P-452 P-451 P-450 P-449 P-448 P-447 P-446 P-445 P-440 P-439 P-436 P-433 P-432 P-431 P-430 P-429 P-428 P-427 P-426 P-424 P-423 P-422 P-421 P-420 P-418 P-416 P-415 P-414 P-413 P-410 P-409 P-407 P-404 P-403 P-402 P-401 P-400 P-399 P-398 P-397 P-396 P-394 P-392 P-391 P-390 P-389 P-388 P-387 P-386 P-385 P-384 P-383 P-382 P-381 P-380 P-379 P-378 P-377 P-376 P-374 P-372 P-371 P-370 P-369 P-368 P-367 P-366 P-365 P-364 P-363 P-362 P-361 P-360 P-359 P-358 P-357 P-356 P-355 P-354 P-347 P-344 P-317 P-338 P-341 P-342 P-335 P-336 P-337 P-320 P-321 P-323 P-324 P-325 P-326 P-327 P-329 P-331 P-332 P-333 P-64 P-200 P-68 P-69 P-70 P-74 P-75 P-81 P-82 P-83 P-84 P-85 P-86 P-87 P-88 P-89 P-91 P-92 P-94 P-101 P-111 P-117 P-124 P-126 P-146 P-153 P-163 P-166 P-167 P-169 P-170 P-173 P-178 P-181 P-182 P-183 P-184 P-185 P-186 P-187 P-188 P-189 P-190 P-191 P-192 P-195 P-199 P-201 P-205 P-196 P-198 P-210 P-211 P-212 P-213 P-197 P-203 P-214 P-204 P-202 P-206 P-215 P-217 P-218 P-219 P-220 P-221 P-224 P-223 P-225 P-228 P-232 P-231 P-234 P-249 P-250 P-251 P-254 P-255 P-257 P-258 P-259 P-260 P-261 P-262 P-263 P-264 P-265 P-267 P-268 P-269 P-276 P-270 P-275 P-277 P-278 P-280 P-281 P-282 P-283 P-285 P-286 P-289 P-290 P-291 P-292 P-293 P-294 P-295 P-296 P-297 P-298 P-299 P-300 P-301 P-302 P-303 P-304 P-305 P-306 P-307 P-308 P-309 P-310 P-311 P-312 P-313 P-314 P-315 P-316 "   # workflow, tooling and scope decisions (no screen of their own); P-487, P-497, P-498: rulings on bug rows already tracked in qa/BUGS.md (Lead 31, 13 Nov)
ids=$(grep -ho '^| ~*P-[0-9]*' "$PH/DECISIONS.md" "$PH"/decisions/*.md | tr -d "~" | tr -d '| ' | sort -t- -k2 -n -u)
for id in $ids; do
  n=${id#P-}; [ "$n" -ge "$first" ] || continue
  case "$EXEMPT" in *" $id "*) echo "$id → workflow or scope (exempt)"; continue;; esac
  rows=$(grep -E "^\| C[0-9.]+ .*\b$id\b" "$PH/qa/CAPABILITIES.md" | cut -d'|' -f2 | tr -d ' ' | tr '\n' ' ')
  later=$(grep -hE "^\| (B[0-9]+[a-z]?|BK-[0-9]+[a-z]?) .*\b$id\b" "$PH"/BACKLOG*.md | cut -d'|' -f2 | tr -d ' ' | tr '\n' ' ')
  if [ -z "$rows$later" ]; then echo "NO CAPABILITY: $id — nothing a person can see or the tester can check"; bad=1
  else echo "$id → ${rows:+capabilities $rows}${later:+ backlog $later}"; fi
done
exit $bad
