What was rough
- Monitor DONE events truncate mid-sentence, like "0 passed, 7 failed beca", so I had to read the diff or run orch result anyway. And orch result refused with "has not settled (done)" on an agent that orch status already showed as done. The summary line and the result command should agree.
- A done state whose payload says pending: is two signals in one word. A distinct pending state would be greppable and would stop me from reading a blocked report as a landed one.
- Luna medium does the literal thing. Two of four agents inlined constants or hardcoded ids where the deleted line used a constant. That is a spec gap on my side, but it means every mechanical spec needs an explicit "reuse the constant the old line used" sentence.
- I dispatched a test-running wave before confirming the DB had the tables. The agents handled it, but the round was wasted. A one-line environment precheck before any wave that runs tests belongs in my loop.

Suggestions
- Widen or un-truncate the DONE event text, or make orch result work as soon as status says done.
- Add a pending state so blocked-on-others is visible without reading the report.
- I'll add a "preserve existing constants and locals" line to my task template so it stops recurring.
