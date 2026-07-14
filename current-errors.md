 × typescript(no-unsafe-member-access): Unsafe member access .question on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:746:54]
 745 │         } catch {}
 746 │         atomicWrite(questionFile, { question: params.question, ts, id });
     ·                                                      ────────
 747 │         askingPreviousState = state.state;
     ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string.
     ╭─[extensions/orchestrator-bridge.ts:748:45]
 747 │         askingPreviousState = state.state;
 748 │         state.asking = { question: truncate(params.question, 200), id, ts };
     ·                                             ───────────────
 749 │         state.state = "blocked";
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .question on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:748:52]
 747 │         askingPreviousState = state.state;
 748 │         state.asking = { question: truncate(params.question, 200), id, ts };
     ·                                                    ────────
 749 │         state.state = "blocked";
     ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string.
     ╭─[extensions/orchestrator-bridge.ts:751:60]
 750 │         writeStatus();
 751 │         const notificationTitle = blockedNotificationTitle(params.question);
     ·                                                            ───────────────
 752 │         const notificationBody = truncate(params.question, 60);
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .question on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:751:67]
 750 │         writeStatus();
 751 │         const notificationTitle = blockedNotificationTitle(params.question);
     ·                                                                   ────────
 752 │         const notificationBody = truncate(params.question, 60);
     ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string.
     ╭─[extensions/orchestrator-bridge.ts:752:43]
 751 │         const notificationTitle = blockedNotificationTitle(params.question);
 752 │         const notificationBody = truncate(params.question, 60);
     ·                                           ───────────────
 753 │         notifyHerdr(notificationTitle, notificationBody);
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .question on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:752:50]
 751 │         const notificationTitle = blockedNotificationTitle(params.question);
 752 │         const notificationBody = truncate(params.question, 60);
     ·                                                  ────────
 753 │         notifyHerdr(notificationTitle, notificationBody);
     ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type AbortSignal | undefined.
     ╭─[extensions/orchestrator-bridge.ts:755:68]
 754 │ 
 755 │         const answer = await waitForOrchestratorAnswer(answerFile, signal, () => {
     ·                                                                    ──────
 756 │           notifyHerdr(notificationTitle, notificationBody);
     ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
     ╭─[extensions/orchestrator-bridge.ts:779:3]
 778 │ 
 779 │   pi.registerTool({
     ·   ───────────────
 780 │     name: "orch_agents",
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .registerTool on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:779:6]
 778 │ 
 779 │   pi.registerTool({
     ·      ────────────
 780 │     name: "orch_agents",
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .all_workspaces on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:794:18]
 793 │           ownPresenceKey(ctx),
 794 │           params.all_workspaces === true || params.allWorkspaces === true,
     ·                  ──────────────
 795 │         )),
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .allWorkspaces on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:794:52]
 793 │           ownPresenceKey(ctx),
 794 │           params.all_workspaces === true || params.allWorkspaces === true,
     ·                                                    ─────────────
 795 │         )),
     ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
     ╭─[extensions/orchestrator-bridge.ts:801:3]
 800 │ 
 801 │   pi.registerTool({
     ·   ───────────────
 802 │     name: "orch_send",
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .registerTool on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:801:6]
 800 │ 
 801 │   pi.registerTool({
     ·      ────────────
 802 │     name: "orch_send",
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .cross_workspace on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:815:37]
 814 │     async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
 815 │       const crossWorkspace = params.cross_workspace === true || params.allWorkspaces === true;
     ·                                     ───────────────
 816 │       return executeTool(
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .allWorkspaces on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:815:72]
 814 │     async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
 815 │       const crossWorkspace = params.cross_workspace === true || params.allWorkspaces === true;
     ·                                                                        ─────────────
 816 │       return executeTool(
     ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string.
     ╭─[extensions/orchestrator-bridge.ts:817:31]
 816 │       return executeTool(
 817 │         () => sendPeerMessage(params.target, params.text, ownPresenceKey(ctx), crossWorkspace),
     ·                               ─────────────
 818 │         "error: unable to send peer message",
     ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string.
     ╭─[extensions/orchestrator-bridge.ts:817:46]
 816 │       return executeTool(
 817 │         () => sendPeerMessage(params.target, params.text, ownPresenceKey(ctx), crossWorkspace),
     ·                                              ───────────
 818 │         "error: unable to send peer message",
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .target on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:817:38]
 816 │       return executeTool(
 817 │         () => sendPeerMessage(params.target, params.text, ownPresenceKey(ctx), crossWorkspace),
     ·                                      ──────
 818 │         "error: unable to send peer message",
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .text on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:817:53]
 816 │       return executeTool(
 817 │         () => sendPeerMessage(params.target, params.text, ownPresenceKey(ctx), crossWorkspace),
     ·                                                     ────
 818 │         "error: unable to send peer message",
     ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
     ╭─[extensions/orchestrator-bridge.ts:823:3]
 822 │ 
 823 │   pi.registerTool({
     ·   ───────────────
 824 │     name: "orch_read",
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .registerTool on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:823:6]
 822 │ 
 823 │   pi.registerTool({
     ·      ────────────
 824 │     name: "orch_read",
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .cross_workspace on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:836:37]
 835 │     async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
 836 │       const crossWorkspace = params.cross_workspace === true || params.allWorkspaces === true;
     ·                                     ───────────────
 837 │       return executeTool(() => {
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .allWorkspaces on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:836:72]
 835 │     async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
 836 │       const crossWorkspace = params.cross_workspace === true || params.allWorkspaces === true;
     ·                                                                        ─────────────
 837 │       return executeTool(() => {
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .hasUI on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:838:27]
 837 │       return executeTool(() => {
 838 │         initPresence(ctx?.hasUI === true);
     ·                           ─────
 839 │         const ownKey = state.key || computeKey(ctx?.hasUI === true);
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .hasUI on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:839:53]
 838 │         initPresence(ctx?.hasUI === true);
 839 │         const ownKey = state.key || computeKey(ctx?.hasUI === true);
     ·                                                     ─────
 840 │         const resolved = resolvePeer(params.target, ownKey, crossWorkspace);
     ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string.
     ╭─[extensions/orchestrator-bridge.ts:840:38]
 839 │         const ownKey = state.key || computeKey(ctx?.hasUI === true);
 840 │         const resolved = resolvePeer(params.target, ownKey, crossWorkspace);
     ·                                      ─────────────
 841 │         if (resolved.error) return resolved.error;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .target on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:840:45]
 839 │         const ownKey = state.key || computeKey(ctx?.hasUI === true);
 840 │         const resolved = resolvePeer(params.target, ownKey, crossWorkspace);
     ·                                             ──────
 841 │         if (resolved.error) return resolved.error;
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ╭─[extensions/orchestrator-bridge.ts:842:15]
 841 │         if (resolved.error) return resolved.error;
 842 │         const result = readJson(path.join(resolved.peer.dir, "result.json"));
     ·               ──────────────────────────────────────────────────────────────
 843 │         return JSON.stringify({
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ╭─[extensions/orchestrator-bridge.ts:846:11]
 845 │           workspace: workspaceOf(resolved.peer.key),
 846 │           state: resolved.peer.status.state,
     ·           ─────────────────────────────────
 847 │           model: peerModel(resolved.peer.status),
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ╭─[extensions/orchestrator-bridge.ts:848:11]
 847 │           model: peerModel(resolved.peer.status),
 848 │           text: result?.text ?? resolved.peer.status.lastText ?? "",
     ·           ─────────────────────────────────────────────────────────
 849 │         });
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .state on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:846:39]
 845 │           workspace: workspaceOf(resolved.peer.key),
 846 │           state: resolved.peer.status.state,
     ·                                       ─────
 847 │           model: peerModel(resolved.peer.status),
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .text on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:848:25]
 847 │           model: peerModel(resolved.peer.status),
 848 │           text: result?.text ?? resolved.peer.status.lastText ?? "",
     ·                         ────
 849 │         });
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .lastText on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:848:54]
 847 │           model: peerModel(resolved.peer.status),
 848 │           text: result?.text ?? resolved.peer.status.lastText ?? "",
     ·                                                      ────────
 849 │         });
     ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
     ╭─[extensions/orchestrator-bridge.ts:855:3]
 854 │   // ---- lifecycle ----
 855 │   pi.on("session_start", (_event, ctx) => {
     ·   ─────
 856 │     lastCtx = ctx;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .on on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:855:6]
 854 │   // ---- lifecycle ----
 855 │   pi.on("session_start", (_event, ctx) => {
     ·      ──
 856 │     lastCtx = ctx;
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ╭─[extensions/orchestrator-bridge.ts:856:5]
 855 │   pi.on("session_start", (_event, ctx) => {
 856 │     lastCtx = ctx;
     ·     ─────────────
 857 │     initPresence(ctx?.hasUI === true);
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .hasUI on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:857:23]
 856 │     lastCtx = ctx;
 857 │     initPresence(ctx?.hasUI === true);
     ·                       ─────
 858 │     updateSessionRef(ctx);
     ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
     ╭─[extensions/orchestrator-bridge.ts:876:3]
 875 │ 
 876 │   pi.on("model_select", (event) => {
     ·   ─────
 877 │     if (event?.model?.id) state.model = { provider: event.model.provider, id: event.model.id };
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .on on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:876:6]
 875 │ 
 876 │   pi.on("model_select", (event) => {
     ·      ──
 877 │     if (event?.model?.id) state.model = { provider: event.model.provider, id: event.model.id };
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .model on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:877:16]
 876 │   pi.on("model_select", (event) => {
 877 │     if (event?.model?.id) state.model = { provider: event.model.provider, id: event.model.id };
     ·                ─────
 878 │     writeStatus();
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ╭─[extensions/orchestrator-bridge.ts:877:43]
 876 │   pi.on("model_select", (event) => {
 877 │     if (event?.model?.id) state.model = { provider: event.model.provider, id: event.model.id };
     ·                                           ──────────────────────────────
 878 │     writeStatus();
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ╭─[extensions/orchestrator-bridge.ts:877:75]
 876 │   pi.on("model_select", (event) => {
 877 │     if (event?.model?.id) state.model = { provider: event.model.provider, id: event.model.id };
     ·                                                                           ──────────────────
 878 │     writeStatus();
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .model on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:877:59]
 876 │   pi.on("model_select", (event) => {
 877 │     if (event?.model?.id) state.model = { provider: event.model.provider, id: event.model.id };
     ·                                                           ─────
 878 │     writeStatus();
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .model on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:877:85]
 876 │   pi.on("model_select", (event) => {
 877 │     if (event?.model?.id) state.model = { provider: event.model.provider, id: event.model.id };
     ·                                                                                     ─────
 878 │     writeStatus();
     ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
     ╭─[extensions/orchestrator-bridge.ts:881:3]
 880 │ 
 881 │   pi.on("thinking_level_select", (event) => {
     ·   ─────
 882 │     if (typeof event?.level === "string") state.thinking = event.level;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .on on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:881:6]
 880 │ 
 881 │   pi.on("thinking_level_select", (event) => {
     ·      ──
 882 │     if (typeof event?.level === "string") state.thinking = event.level;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .level on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:882:23]
 881 │   pi.on("thinking_level_select", (event) => {
 882 │     if (typeof event?.level === "string") state.thinking = event.level;
     ·                       ─────
 883 │     writeStatus();
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ╭─[extensions/orchestrator-bridge.ts:882:43]
 881 │   pi.on("thinking_level_select", (event) => {
 882 │     if (typeof event?.level === "string") state.thinking = event.level;
     ·                                           ────────────────────────────
 883 │     writeStatus();
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .level on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:882:66]
 881 │   pi.on("thinking_level_select", (event) => {
 882 │     if (typeof event?.level === "string") state.thinking = event.level;
     ·                                                                  ─────
 883 │     writeStatus();
     ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
     ╭─[extensions/orchestrator-bridge.ts:886:3]
 885 │ 
 886 │   pi.on("before_agent_start", (event, ctx) => {
     ·   ─────
 887 │     lastCtx = ctx;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .on on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:886:6]
 885 │ 
 886 │   pi.on("before_agent_start", (event, ctx) => {
     ·      ──
 887 │     lastCtx = ctx;
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ╭─[extensions/orchestrator-bridge.ts:887:5]
 886 │   pi.on("before_agent_start", (event, ctx) => {
 887 │     lastCtx = ctx;
     ·     ─────────────
 888 │     if (typeof event?.prompt === "string" && event.prompt.trim()) {
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .prompt on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:888:23]
 887 │     lastCtx = ctx;
 888 │     if (typeof event?.prompt === "string" && event.prompt.trim()) {
     ·                       ──────
 889 │       state.task = truncate(event.prompt, TASK_MAX);
     ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
     ╭─[extensions/orchestrator-bridge.ts:888:46]
 887 │     lastCtx = ctx;
 888 │     if (typeof event?.prompt === "string" && event.prompt.trim()) {
     ·                                              ─────────────────
 889 │       state.task = truncate(event.prompt, TASK_MAX);
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .prompt on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:888:52]
 887 │     lastCtx = ctx;
 888 │     if (typeof event?.prompt === "string" && event.prompt.trim()) {
     ·                                                    ──────
 889 │       state.task = truncate(event.prompt, TASK_MAX);
     ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string.
     ╭─[extensions/orchestrator-bridge.ts:889:29]
 888 │     if (typeof event?.prompt === "string" && event.prompt.trim()) {
 889 │       state.task = truncate(event.prompt, TASK_MAX);
     ·                             ────────────
 890 │     }
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .prompt on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:889:35]
 888 │     if (typeof event?.prompt === "string" && event.prompt.trim()) {
 889 │       state.task = truncate(event.prompt, TASK_MAX);
     ·                                   ──────
 890 │     }
     ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
     ╭─[extensions/orchestrator-bridge.ts:893:3]
 892 │ 
 893 │   pi.on("agent_start", (_event, ctx) => {
     ·   ─────
 894 │     lastCtx = ctx;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .on on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:893:6]
 892 │ 
 893 │   pi.on("agent_start", (_event, ctx) => {
     ·      ──
 894 │     lastCtx = ctx;
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ╭─[extensions/orchestrator-bridge.ts:894:5]
 893 │   pi.on("agent_start", (_event, ctx) => {
 894 │     lastCtx = ctx;
     ·     ─────────────
 895 │     initPresence(ctx?.hasUI === true);
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .hasUI on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:895:23]
 894 │     lastCtx = ctx;
 895 │     initPresence(ctx?.hasUI === true);
     ·                       ─────
 896 │     state.state = "working";
     ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
     ╭─[extensions/orchestrator-bridge.ts:907:3]
 906 │ 
 907 │   pi.on("turn_end", (_event, ctx) => {
     ·   ─────
 908 │     lastCtx = ctx;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .on on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:907:6]
 906 │ 
 907 │   pi.on("turn_end", (_event, ctx) => {
     ·      ──
 908 │     lastCtx = ctx;
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ╭─[extensions/orchestrator-bridge.ts:908:5]
 907 │   pi.on("turn_end", (_event, ctx) => {
 908 │     lastCtx = ctx;
     ·     ─────────────
 909 │     state.turns += 1;
     ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
     ╭─[extensions/orchestrator-bridge.ts:914:3]
 913 │ 
 914 │   pi.on("message_end", (event, ctx) => {
     ·   ─────
 915 │     lastCtx = ctx;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .on on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:914:6]
 913 │ 
 914 │   pi.on("message_end", (event, ctx) => {
     ·      ──
 915 │     lastCtx = ctx;
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ╭─[extensions/orchestrator-bridge.ts:915:5]
 914 │   pi.on("message_end", (event, ctx) => {
 915 │     lastCtx = ctx;
     ·     ─────────────
 916 │     const message = event?.message;
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ╭─[extensions/orchestrator-bridge.ts:916:11]
 915 │     lastCtx = ctx;
 916 │     const message = event?.message;
     ·           ────────────────────────
 917 │     if (message?.role !== "assistant") return;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .message on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:916:28]
 915 │     lastCtx = ctx;
 916 │     const message = event?.message;
     ·                            ───────
 917 │     if (message?.role !== "assistant") return;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .role on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:917:18]
 916 │     const message = event?.message;
 917 │     if (message?.role !== "assistant") return;
     ·                  ────
 918 │     const text = extractText(message.content);
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .content on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:918:38]
 917 │     if (message?.role !== "assistant") return;
 918 │     const text = extractText(message.content);
     ·                                      ───────
 919 │     if (text.trim()) {
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ╭─[extensions/orchestrator-bridge.ts:924:11]
 923 │     }
 924 │     const usage = message.usage;
     ·           ─────────────────────
 925 │     if (usage) {
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .usage on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:924:27]
 923 │     }
 924 │     const usage = message.usage;
     ·                           ─────
 925 │     if (usage) {
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .input on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:926:35]
 925 │     if (usage) {
 926 │       state.tokens.input += usage.input ?? 0;
     ·                                   ─────
 927 │       state.tokens.output += usage.output ?? 0;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .output on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:927:36]
 926 │       state.tokens.input += usage.input ?? 0;
 927 │       state.tokens.output += usage.output ?? 0;
     ·                                    ──────
 928 │       state.tokens.cacheRead += usage.cacheRead ?? 0;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .cacheRead on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:928:39]
 927 │       state.tokens.output += usage.output ?? 0;
 928 │       state.tokens.cacheRead += usage.cacheRead ?? 0;
     ·                                       ─────────
 929 │       state.tokens.cacheWrite += usage.cacheWrite ?? 0;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .cacheWrite on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:929:40]
 928 │       state.tokens.cacheRead += usage.cacheRead ?? 0;
 929 │       state.tokens.cacheWrite += usage.cacheWrite ?? 0;
     ·                                        ──────────
 930 │       state.cost += usage.cost?.total ?? 0;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .cost on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:930:27]
 929 │       state.tokens.cacheWrite += usage.cacheWrite ?? 0;
 930 │       state.cost += usage.cost?.total ?? 0;
     ·                           ────
 931 │     }
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ╭─[extensions/orchestrator-bridge.ts:936:11]
 935 │   function currentFileCandidate(args: any): string | undefined {
 936 │     const candidate = args.path ?? args.file_path ?? args.filePath;
     ·           ────────────────────────────────────────────────────────
 937 │     return typeof candidate === "string" ? candidate : undefined;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .path on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:936:28]
 935 │   function currentFileCandidate(args: any): string | undefined {
 936 │     const candidate = args.path ?? args.file_path ?? args.filePath;
     ·                            ────
 937 │     return typeof candidate === "string" ? candidate : undefined;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .file_path on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:936:41]
 935 │   function currentFileCandidate(args: any): string | undefined {
 936 │     const candidate = args.path ?? args.file_path ?? args.filePath;
     ·                                         ─────────
 937 │     return typeof candidate === "string" ? candidate : undefined;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .filePath on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:936:59]
 935 │   function currentFileCandidate(args: any): string | undefined {
 936 │     const candidate = args.path ?? args.file_path ?? args.filePath;
     ·                                                           ────────
 937 │     return typeof candidate === "string" ? candidate : undefined;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .toolName on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:949:32]
 948 │   function handleToolExecutionStart(event: any): void {
 949 │     const name = String(event?.toolName ?? "");
     ·                                ────────
 950 │     const previousTool = state.lastTool;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .args on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:952:46]
 951 │     if (name) state.lastTool = name;
 952 │     const file = currentFileCandidate(event?.args ?? {});
     ·                                              ────
 953 │     if (file && file !== state.currentFile) {
     ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
     ╭─[extensions/orchestrator-bridge.ts:961:3]
 960 │ 
 961 │   pi.on("tool_execution_start", handleToolExecutionStart);
     ·   ─────
 962 │ 
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .on on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:961:6]
 960 │ 
 961 │   pi.on("tool_execution_start", handleToolExecutionStart);
     ·      ──
 962 │ 
     ╰────

  × typescript(no-redundant-type-constituents): 'any' overrides all other types in this union type.
     ╭─[extensions/orchestrator-bridge.ts:963:58]
 962 │ 
 963 │   function finalFailedAssistantMessage(messages: any[]): any | undefined {
     ·                                                          ───
 964 │     for (let i = messages.length - 1; i >= 0; i--) {
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ╭─[extensions/orchestrator-bridge.ts:965:13]
 964 │     for (let i = messages.length - 1; i >= 0; i--) {
 965 │       const message = messages[i];
     ·             ─────────────────────
 966 │       if (message?.role !== "assistant") continue;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .role on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:966:20]
 965 │       const message = messages[i];
 966 │       if (message?.role !== "assistant") continue;
     ·                    ────
 967 │       if (message.stopReason !== "error" && message.stopReason !== "aborted") return undefined;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .stopReason on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:967:19]
 966 │       if (message?.role !== "assistant") continue;
 967 │       if (message.stopReason !== "error" && message.stopReason !== "aborted") return undefined;
     ·                   ──────────
 968 │       return message;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .stopReason on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:967:53]
 966 │       if (message?.role !== "assistant") continue;
 967 │       if (message.stopReason !== "error" && message.stopReason !== "aborted") return undefined;
     ·                                                     ──────────
 968 │       return message;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .errorMessage on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:974:24]
 973 │   function failedAssistantError(message: any): string {
 974 │     if (typeof message.errorMessage === "string" && message.errorMessage.trim()) {
     ·                        ────────────
 975 │       return message.errorMessage;
     ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
     ╭─[extensions/orchestrator-bridge.ts:974:53]
 973 │   function failedAssistantError(message: any): string {
 974 │     if (typeof message.errorMessage === "string" && message.errorMessage.trim()) {
     ·                                                     ─────────────────────────
 975 │       return message.errorMessage;
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .errorMessage on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:974:61]
 973 │   function failedAssistantError(message: any): string {
 974 │     if (typeof message.errorMessage === "string" && message.errorMessage.trim()) {
     ·                                                             ────────────
 975 │       return message.errorMessage;
     ╰────

  × typescript(no-unsafe-return): Unsafe return of a value of type `any`.
     ╭─[extensions/orchestrator-bridge.ts:975:7]
 974 │     if (typeof message.errorMessage === "string" && message.errorMessage.trim()) {
 975 │       return message.errorMessage;
     ·       ────────────────────────────
 976 │     }
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .errorMessage on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:975:22]
 974 │     if (typeof message.errorMessage === "string" && message.errorMessage.trim()) {
 975 │       return message.errorMessage;
     ·                      ────────────
 976 │     }
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .stopReason on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:977:20]
 976 │     }
 977 │     return message.stopReason === "aborted" ? "aborted" : "error";
     ·                    ──────────
 978 │   }
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ╭─[extensions/orchestrator-bridge.ts:981:11]
 980 │   function recordFailedAgentRun(message: any, ctx: any): void {
 981 │     const stopReason = message.stopReason;
     ·           ───────────────────────────────
 982 │     const errorText = failedAssistantError(message);
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .stopReason on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:981:32]
 980 │   function recordFailedAgentRun(message: any, ctx: any): void {
 981 │     const stopReason = message.stopReason;
     ·                                ──────────
 982 │     const errorText = failedAssistantError(message);
     ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .content on an `any` value.
     ╭─[extensions/orchestrator-bridge.ts:983:41]
 982 │     const errorText = failedAssistantError(message);
 983 │     const partial = extractText(message.content);
     ·                                         ───────
 984 │     state.state = stopReason === "aborted" ? "aborted" : "error";
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
     ╭─[extensions/orchestrator-bridge.ts:995:45]
 994 │       state.lastText = truncate(text, LAST_TEXT_MAX);
 995 │       writeResult(text, { error: errorText, stopReason });
     ·                                             ──────────
 996 │     }
     ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
      ╭─[extensions/orchestrator-bridge.ts:1004:5]
 1003 │   function handleAgentEnd(event: any, ctx: any): void {
 1004 │     lastCtx = ctx;
      ·     ─────────────
 1005 │     const messages = event?.messages;
      ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
      ╭─[extensions/orchestrator-bridge.ts:1005:11]
 1004 │     lastCtx = ctx;
 1005 │     const messages = event?.messages;
      ·           ──────────────────────────
 1006 │     if (!Array.isArray(messages)) return;
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .messages on an `any` value.
      ╭─[extensions/orchestrator-bridge.ts:1005:29]
 1004 │     lastCtx = ctx;
 1005 │     const messages = event?.messages;
      ·                             ────────
 1006 │     if (!Array.isArray(messages)) return;
      ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
      ╭─[extensions/orchestrator-bridge.ts:1007:11]
 1006 │     if (!Array.isArray(messages)) return;
 1007 │     const message = finalFailedAssistantMessage(messages);
      ·           ───────────────────────────────────────────────
 1008 │     if (message) recordFailedAgentRun(message, ctx);
      ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
      ╭─[extensions/orchestrator-bridge.ts:1011:3]
 1010 │ 
 1011 │   pi.on("agent_end", handleAgentEnd);
      ·   ─────
 1012 │ 
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .on on an `any` value.
      ╭─[extensions/orchestrator-bridge.ts:1011:6]
 1010 │ 
 1011 │   pi.on("agent_end", handleAgentEnd);
      ·      ──
 1012 │ 
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .hasUI on an `any` value.
      ╭─[extensions/orchestrator-bridge.ts:1021:71]
 1020 │     if (pendingHandoff && runFullText) {
 1021 │       deliverPendingHandoff(runFullText, state.key || computeKey(ctx?.hasUI === true));
      ·                                                                       ─────
 1022 │     }
      ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
      ╭─[extensions/orchestrator-bridge.ts:1029:5]
 1028 │   function handleAgentSettled(_event: any, ctx: any): void {
 1029 │     lastCtx = ctx;
      ·     ─────────────
 1030 │     // agent_end already recorded an error/abort for this run — do not clobber it
      ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
      ╭─[extensions/orchestrator-bridge.ts:1040:3]
 1039 │ 
 1040 │   pi.on("agent_settled", handleAgentSettled);
      ·   ─────
 1041 │ 
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .on on an `any` value.
      ╭─[extensions/orchestrator-bridge.ts:1040:6]
 1039 │ 
 1040 │   pi.on("agent_settled", handleAgentSettled);
      ·      ──
 1041 │ 
      ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
      ╭─[extensions/orchestrator-bridge.ts:1042:3]
 1041 │ 
 1042 │   pi.events?.on?.("herdr:blocked", (data) => {
      ·   ─────────────
 1043 │     if (data?.active) {
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .events on an `any` value.
      ╭─[extensions/orchestrator-bridge.ts:1042:6]
 1041 │ 
 1042 │   pi.events?.on?.("herdr:blocked", (data) => {
      ·      ──────
 1043 │     if (data?.active) {
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .active on an `any` value.
      ╭─[extensions/orchestrator-bridge.ts:1043:15]
 1042 │   pi.events?.on?.("herdr:blocked", (data) => {
 1043 │     if (data?.active) {
      ·               ──────
 1044 │       if (blockedCount === 0 && !blockedNotified) {
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .label on an `any` value.
      ╭─[extensions/orchestrator-bridge.ts:1045:49]
 1044 │       if (blockedCount === 0 && !blockedNotified) {
 1045 │         const notificationSummary = String(data.label ?? "");
      ·                                                 ─────
 1046 │         notifyHerdr(blockedNotificationTitle(notificationSummary), truncate(notificationSummary, 60));
      ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
      ╭─[extensions/orchestrator-bridge.ts:1050:7]
 1049 │       blockedCount += 1;
 1050 │       blockedMessage = data.label;
      ·       ───────────────────────────
 1051 │     } else {
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .label on an `any` value.
      ╭─[extensions/orchestrator-bridge.ts:1050:29]
 1049 │       blockedCount += 1;
 1050 │       blockedMessage = data.label;
      ·                             ─────
 1051 │     } else {
      ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
      ╭─[extensions/orchestrator-bridge.ts:1061:3]
 1060 │ 
 1061 │   pi.on("session_shutdown", () => {
      ·   ─────
 1062 │     if (heartbeat) clearInterval(heartbeat);
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .on on an `any` value.
      ╭─[extensions/orchestrator-bridge.ts:1061:6]
 1060 │ 
 1061 │   pi.on("session_shutdown", () => {
      ·      ──
 1062 │     if (heartbeat) clearInterval(heartbeat);
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a ternary expression, as it is simpler to read.
      ╭─[src/commands.ts:1771:9]
 1770 │   const configuredBackend = flags.backendFlag
 1771 │     ?? (process.env.ORCH_BACKEND !== undefined ? process.env.ORCH_BACKEND : config.defaults.backend);
      ·         ───────────────────────────────────────────────────────────────────────────────────────────
 1772 │   const backend = configuredBackend ?? (herdrAvailable() ? herdrBackend.id : headlessBackend.id);
      ╰────

  × typescript(require-await): Function has no 'await' expression.
      ╭─[src/commands.ts:1920:1]
 1919 │ 
 1920 │ async function launchAdditionalAgents(settings: SpawnSettings, root: SpawnRoot, created: CreatedAgent[]): Promise<void> {
      · ─────────────────────────────────────
 1921 │   for (let i = 2; i <= settings.n; i++) {
      ╰────

  × typescript(no-unsafe-return): Unsafe return of a value of type error.
      ╭─[src/commands.ts:2038:42]
 2037 │   const status = readJSON(path.join(presenceAgentDir(pane), "status.json"));
 2038 │   if (typeof status?.state === "string") return status.state;
      ·                                          ────────────────────
 2039 │   return paneStatus(pane);
      ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type error typed assigned to a parameter of type number | undefined.
      ╭─[src/commands.ts:2269:41]
 2268 │     const st = readJSON(statusPath);
 2269 │     if (st?.pid === old.pid && pidAlive(st.pid) && Date.parse(st.updatedAt) > Date.parse(old.updatedAt)) return true;
      ·                                         ──────
 2270 │   }
      ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type error typed assigned to a parameter of type string.
      ╭─[src/commands.ts:2269:63]
 2268 │     const st = readJSON(statusPath);
 2269 │     if (st?.pid === old.pid && pidAlive(st.pid) && Date.parse(st.updatedAt) > Date.parse(old.updatedAt)) return true;
      ·                                                               ────────────
 2270 │   }
      ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type error typed assigned to a parameter of type string.
      ╭─[src/commands.ts:2269:90]
 2268 │     const st = readJSON(statusPath);
 2269 │     if (st?.pid === old.pid && pidAlive(st.pid) && Date.parse(st.updatedAt) > Date.parse(old.updatedAt)) return true;
      ·                                                                                          ─────────────
 2270 │   }
      ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
      ╭─[src/commands.ts:2279:9]
 2278 │   const statusPath = path.join(presenceAgentDir(pane), "status.json");
 2279 │   const oldPid = readJSON(statusPath)?.pid ?? null;
      ·         ──────────────────────────────────────────
 2280 │   herdrBestEffort(["pane", "send-keys", pane, "Escape"]);
      ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type error typed assigned to a parameter of type number | undefined.
      ╭─[src/commands.ts:2297:55]
 2296 │     const st = readJSON(statusPath);
 2297 │     if (st && st.pid && st.pid !== oldPid && pidAlive(st.pid)) return true;
      ·                                                       ──────
 2298 │   }
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read.
      ╭─[src/commands.ts:2556:5]
 2555 │     }
 2556 │     if (!workspace) workspace = herdrPanes()[0]?.workspace_id ?? null;
      ·     ──────────────────────────────────────────────────────────────────
 2557 │     if (!workspace) die("Could not determine workspace id (herdr down?). Pass --workspace <id>.");
      ╰────

  × typescript(require-await): Function has no 'await' expression.
      ╭─[src/commands.ts:2766:1]
 2765 │ 
 2766 │ async function waitForDispatchCompletion(pane: string, json = false): Promise<void> {
      · ────────────────────────────────────────
 2767 │   try {
      ╰────

  × typescript(no-unsafe-return): Unsafe return of a value of type error.
      ╭─[src/commands.ts:2829:3]
 2828 │   const lock = readJSON(path.join(orchDir(), "orchd.lock"));
 2829 │   return Number.isInteger(lock?.pid) && lock.pid > 0 ? lock.pid : undefined;
      ·   ──────────────────────────────────────────────────────────────────────────
 2830 │ }
      ╰────

  × typescript(no-floating-promises): Promises must be awaited, add void operator to ignore.
      ╭─[src/commands.ts:3111:33]
 3110 │     default:
 3111 │       if (cmd.startsWith("--")) cmdStatus(argv);
      ·                                 ────────────────
 3112 │       else { process.stderr.write(`Unknown command: ${cmd}\n\n`); usage(); process.exit(1); }
      ╰────
  help: The promise must end with a call to .catch, or end with a call to .then with a rejection handler, or be explicitly marked as ignored with the `void` operator.

Found 2 warnings and 575 errors.
Finished in 9.3s on 66 files with 65 rules using 8 threads.
error: script "check" exited with code 1
orch > 