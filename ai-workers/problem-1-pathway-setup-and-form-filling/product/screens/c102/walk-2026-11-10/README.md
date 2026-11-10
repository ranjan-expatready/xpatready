# C10.2 walk at 1440 px, 10 Nov (#1482, head 0a343b605)

A fresh isolated copy of the branch: Demo › Load the finished story by screens, the result, the family case page. 0 console errors.

* `01-result.png`: stages move=done facts=done paper=partial forms=partial signed=done documents=done ready=partial record=partial, as on 9 Nov: paper, forms, ready and record wait for the Paper IMM 5257 copy validated in Adobe on the Mac (P-349 row 12b; never simulated).
* `03-how-each-form-is-filed.png`: the case page after the load (the UI is unchanged by #1482).
* The Paper IMM 5257's four 10 Nov boxes, read from the copy's own record after the walk (the result a page reads):

```
BackgroundInfo2[0].Details[0].refusedDetails[0]|not written|Not needed: written only when the person answered Yes to Background Information question 2 a), 2 b) or 2 c)
DetailsOfVisit[0].PurposeRow1[0].Other[0].Other[0]|not written|Not needed: written only when the purpose of the visit is Other
PageWrapper[0].BackgroundInfo3[0].details[0]|not written|Not needed: written only when the person answered Yes to Background Information question 3 a)
PageWrapper[0].Military[0].militaryServiceDetails[0]|not written|Not needed: written only when the person answered Yes to Background Information question 4 a) (military, militia, civil defence, security organization or police service)
```

`walk.cjs` is the Playwright script (1440 x 900; `PW_CHROMIUM=/opt/pw-browsers/chromium` in a cloud session).
