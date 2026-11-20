Send a message to another leading orch: a harness session a human started, not an agent orch
spawned. Name it by its name, its id, or the project it works in (a path, or the directory's
name). `orch orchs` lists who is live.

    orch message lead-3f9a2c1d Is the auth refactor on main yet?
    orch message billing-api "I changed the invoice schema. Pull before you touch it."

Both ends must be leading orchs, and the user must have turned peers on:

    orch settings fleet.orch_peers true

The space wall does not apply between two leading orchs; the switch alone governs them. A
target that names several orchs is refused with the list; name one.

Where it lands is `mail.to_orch`:
- prompt-unless-focused, the default: typed into the other orch's input through its plexer
  pane or bridge, unless the user is in that pane. In that pane means the plexer reports it
  focused on a screen now. Then it skips the input, so it never mixes with a line the user is
  typing, and comes to that orch's `orch monitor` as a MESSAGE line.
- prompt: always typed into the input.
- events: always a MESSAGE line on `orch monitor`, never the input.
Keep `orch monitor` armed while peers are on, or a MESSAGE line waits unread.

Every message opens with who sent it, where it works, and the command to reply with:

    [from orch lead-h16tjo02 in /work/reports; reply with: orch message lead-h16tjo02 "<text>"] ...

A MESSAGE line holds `monitor.summary_chars` of the text. A longer one is cut, and its line opens
with the command that prints all of it:

    MESSAGE (read all: orch message read 42447aaf) [from orch lead-h16tjo02 ...] ...
    orch message read 42447aaf

Read the whole text before you act on a cut line. The code is the start of the message id; give
more of the id when a code names two messages. `--json` prints `{"id","text"}`. Only the sender
and the recipient may read a message, and orchd keeps it for `retention.outbox_days`. The read
works for any mail sent to or by you, a worker's included.
