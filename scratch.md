 Honest read after driving ~25 dispatches across 3 waves today:

  The skill earns its keep. The doctrine that actually saved me: arm the watch in the same message as
  the first dispatch (every done/asking event woke me, zero polling), --cwd at spawn,
  reset-before-redispatch, name-by-slice, and "done is a claim" (that habit caught the mangled comment
  and the HostConfig gap). The --all warning on events was load-bearing — I'd have armed a dead watch
  without it.

  What orch itself does well: spawn is genuinely one command; dispatch is durable and returns
  instantly; the push stream never dropped an event; rename not breaking the watch scope is the right
  design; per-event cost is nice; questions/answer flow is clean.

  Friction I actually hit:

  1. reset silently re-pins the spawn-time model, discarding a later orch model change. I set panes to
     :medium, reset them, and they came back :high. I caught it only because the reset output prints
     the pin. Reset should keep the current pin, or say loudly that it reverted.
  2. The pack cap ambushed me. Skill says spawn_cap 8 and "default fleet 6-8"; nothing mentions
     fleet.max_agents_per_pack=10 until a spawn dies mid-batch. The refusal message was good — but
     capacity should be visible before I burn a spawn (e.g. in orch status or a spawn --fit).
  3. The smoke-test advice gave a false negative. orch events --all --since-seq 0 printed nothing on a
     daemon that then pushed every live event perfectly. The skill says "silent replay = broken scope"
     — I armed anyway and it worked. Either replay has a bug or the doctrine needs "empty history is
     normal on a fresh daemon."
  4. The answer race. vocab-mover asked, I answered within seconds, and it still finished on its
     default assumption — the result reads like the answer never entered its turn. No feedback on
     whether an answer was consumed. That cost me a manual HostConfig cleanup.
  5. Giant dispatch prompts through shell quoting is the worst part of the loop. My specs are 300+
     words with code identifiers; one stray apostrophe kills the command. orch dispatch <target> --file
     spec.md (or stdin) would be the single biggest QoL win.
  6. The refill dance is 4 commands per pane (reset, rename, model, dispatch). A composite — orch
     redispatch <t> --name X --model Y "task" — would cut my batch messages by 75%.
  7. Small skill bug: it says "there is no --name flag" in the spawn section, then documents --name
     names the agents two paragraphs later.

  Ease overall: 8/10 — three refactor waves, ~110 files churned, zero lost dispatches, ~$1.20 total.
  Fixes 1, 4, and 5 would get it to 9+.




  Bryans notes:
  --cwd at spawn,reset-before-redispatch can these be made more automatic are they basically always used? if they are the defaul thing shouldn't require a flag only non standard calls shoudl have a flag not sure though disciss with me


  The --all warning on events was load-bearing — I'd have armed a dead watch
  without it.   Again shouldn't --all jsut be default and only remove all the stuff when its for sure needed?







1 - ok for topic one yeah this maybe isn;t great but I also don't want agents getting reset and then using liek high thinking from before on some simple task that should be set to low I wnat each call or dispath or thing after a reset or in a spawn to be intentional so it makes you set the thining to what the task requirses so maybe the default isn;t good either maybe we require thinging as a required thing in the commands ot just make it happen the way I wnatevery time 


2 - Yes we used to have differnt stuff we only have total cap and like total depth or whatveer the skill must get this updated ot the current MAX_AGENT_whatever stuff we have now 


3 - yes we need to investigaet this and get the skill lined up with reality or fix the bugs 


4 - yes when an agent asks they shoud wait for the answer not sure if we can force this in some way through the published extensions or hook sfor each harness? but yeah may just be the agent being dumb??? not sure


5. Giant dispatch prompts through shell quoting is the worst part of the loop. My specs are 300+
     words with code identifiers; one stray apostrophe kills the command. orch dispatch <target> --file
     spec.md (or stdin) would be the single biggest QoL win.
     YESYESYES we need to amke this much betetr I alwasys worried about this, we shoudl for sure allow sending or suing things like temporary files or stdin or whatevewr else makes things much easier for you to use a random apostrphe misplaced shoud never kill the command ever 



6 - redispatch <t> --name X --model Y "task" — would cut my batch messages by 75%.    YES YES YES we need this as well for sure


7 - we used to only name to custom names when using the --name flag so we made name part of the normal spawn and I guess --name was left behind we shoudl see if this needs to just be removed names should really be parameters not flags 
