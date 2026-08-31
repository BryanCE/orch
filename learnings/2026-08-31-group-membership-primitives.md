# Group-membership primitives: how real systems build the wall between who-may-subscribe-to-whom

Outside research, 2026-08-31. Question: for a boundary entity ("space") gating event subscription between
agents, what do established systems do — is the wall a named entity with lifecycle, or just ACL rules; how
does a newborn process land in its group; and how are human vs automated principals distinguished? Sources
are the systems' own specs, manuals, and papers; each claim links to the source that owns it.

## 1. The wall: entity or ACL?

### DDS (OMG Data Distribution Service)

Two walls, one hard and one soft. The hard wall is the **domain**: "A DDS domain is identified by a unique
integer value known as a domain ID … An application participates in a DDS domain by creating a
DomainParticipant for that domain ID," and "DomainParticipants in different DDS domains will never exchange
messages" ([RTI Connext users manual, Fundamentals of DDS Domains and DomainParticipants](https://community.rti.com/static/documentation/connext-dds/current/doc/manuals/connext_dds_professional/users_manual/users_manual/Fundamentals_of_DDS_Domains_and_DomainPa.htm)).
The domain has **no creation step and no lifecycle** — it is a rendezvous integer that exists exactly while
participants declare it. The soft wall is the **PARTITION QoS**: "a set of partition names … These names are
simply strings" on Publishers/Subscribers, and matching requires "at least one matching partition name"
([RTI PARTITION QosPolicy](https://community.rti.com/static/documentation/connext-dds/6.1.0/doc/manuals/connext_dds_professional/users_manual/users_manual/PARTITION_QosPolicy.htm)).
Partitions are mutable at runtime with no allocation cost, and every entity always belongs to at least the
empty-string partition. So: DDS's wall is a *name* (integer or string), never an object — and notably the
soft wall is cooperative visibility scoping, not security.

### NATS accounts

The wall is a **named entity**: "An account is an isolated tenant with its own subject space. Two accounts on
the same server never see each other's traffic" ([NATS docs, Accounts](https://docs.nats.io/running-a-nats-service/configuration/securing_nats/accounts)).
Accounts are declared in server config (or minted as JWTs in operator mode), carry policy (exports/imports:
"letting exactly one subject cross the boundary is a deliberate act"), and "a user lives in exactly one
account." A server with no accounts block puts every connection in the default account `$G`. Isolation is
structural — messages don't cross, rather than being permission-checked pair by pair.

### MQTT brokers

The MQTT v5.0 spec itself defines **no authorization mechanism**: security chapter 5 is non-normative, and
topic access control is left entirely to implementations ([OASIS MQTT v5.0 spec](https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html)).
Mosquitto's implementation is a flat per-user, per-topic rule file — `user <username>` / `topic
[read|write|readwrite|deny] <topic>` with wildcard patterns — and **no group or namespace entity at all**
([mosquitto.conf(5)](https://mosquitto.org/man/mosquitto-conf-5.html)). This is the purest ACL-only design in
the survey: the "group" exists only in the administrator's head, materialized as N parallel rule lines.

### Erlang `pg`

Groups are **named but implicit**: "Groups are automatically created when any process joins, and are removed
when all processes leave the group"; "Non-existing group is considered empty"; "If a member terminates, it is
automatically removed from the group" ([erlang.org, kernel/pg](https://www.erlang.org/doc/apps/kernel/pg.html)).
Groups live inside **scopes** — independent overlay namespaces, each a named process (`pg` is the default
scope, startable via Kernel config). So the group is an entity only in the weakest sense: a key in a
membership table, born on first join, reaped on empty, with no metadata and no policy.

### JGroups

Same shape as `pg`, plus membership views: "To join a group and send messages, a process has to create a
JChannel and connect to it using the group name (all channels with the same name form a group)" and "Groups
do not have to be created explicitly; when a process joins a non-existing group, that group will be created
automatically." Membership is first-class: "Whenever a process joins or leaves a group, or when a crashed
process has been detected, a new *view* is sent to all existing (and new) members"
([JGroups manual, overview](https://raw.githubusercontent.com/belaban/JGroups/master/doc/manual/overview.adoc)).

### Matrix rooms

The strongest entity in the survey. A room has a permanent opaque ID (`!opaque_id:domain`), optional aliases,
is **created by an explicit act** (`createRoom` producing an `m.room.create` event), and membership is
explicit state (`m.room.member`: invite/join/leave/ban, gated by power levels)
([Matrix spec v1.11](https://spec.matrix.org/v1.11/), [client-server API](https://spec.matrix.org/v1.11/client-server-api/)).
"Room data is replicated across all of the homeservers whose users are participating" — the room is durable
shared state, the spec defines **no room-deletion operation**, and even room *upgrades* work by tombstoning
the old room and pointing at a successor rather than deleting anything. Events flow only to participants
with sufficient access. The room outlives all of its members.

### Virtual synchrony (Isis)

Process groups are named entities created and joined explicitly: "process p creates a process group, which is
subsequently joined by process q"; "Process groups … can have names, much like files, and this allows them to
be treated like topics in a publish-subscribe system" ([Birman, A History of the Virtual Synchrony
Replication Model](https://www.cs.cornell.edu/ken/History.pdf)). The model's signature contribution is making
membership itself an ordered event: "the system tracks group members, and informs members each time the
membership changes, an event called a view change … All members are guaranteed to see the same view
contents," and a multicast concurrent with a membership change is serialized so "the membership change seems
atomic and the multicast occurs in a well-defined view." Joins trigger *state transfer* to initialize the
newcomer. The group is the unit of addressing, ordering, and fault reporting simultaneously.

### Per-system comparison

| System | Wall | Entity or name? | Created by | Dies when |
|---|---|---|---|---|
| DDS domain | domain_id (integer) | bare name | first participant declaring it | last participant gone (implicit) |
| DDS partition | string label set | bare name, mutable live | any pub/sub declaring it | never existed as a thing |
| NATS account | account | named entity + policy | admin config / operator JWT | admin removes it (persistent) |
| MQTT (mosquitto) | none | ACL rules only | admin edits acl_file | admin removes rules |
| Erlang pg | group in a scope | name in a table | first join (implicit) | last leave (auto-reaped) |
| JGroups | cluster name | name + live View | first connect (implicit) | last disconnect |
| Matrix room | room | durable entity + policy | explicit createRoom | never (tombstone only) |
| Isis / virtual synchrony | process group | named entity + views | explicit create, then joins | implementation-defined |
| Kubernetes namespace | namespace | durable API object | explicit create (4 built-ins) | explicit delete (cascades) |

## 2. Landing in a group at birth

- **Explicit name, no discovery**: DDS participants are constructed *with* a domain_id; JGroups channels
  connect *with* a cluster name; Isis processes join a *named* group. The name comes from code or config —
  never inferred from where the process is running.
- **Environment supplies only a default name**: Kubernetes resources with no namespace land in `default`,
  which exists "so that you can start using your new cluster without first creating a namespace" — and the
  docs immediately advise production clusters to *not* use it ([k8s Namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/)).
  NATS connections with no accounts configured land in `$G` ([NATS Accounts](https://docs.nats.io/running-a-nats-service/configuration/securing_nats/accounts)).
  Erlang's default scope `pg` starts via Kernel config ([pg docs](https://www.erlang.org/doc/apps/kernel/pg.html)).
  In every case the environment picks a *name to pass*, and the mechanism downstream is identical to the
  explicit path. No surveyed system derives the boundary from cwd/host/topology.
- **Inheritance**: Unix is the one system where group placement is inherited: a forked child keeps its
  parent's process group ID and session ID until it calls `setpgid(2)`/`setsid(2)`
  ([credentials(7)](https://man7.org/linux/man-pages/man7/credentials.7.html)). Spawn-time inheritance with an
  explicit opt-out is the established shape for "child lands where the parent is."
- **Empty-group fate splits cleanly by whether the wall carries policy.** Pure rendezvous names (pg groups,
  JGroups clusters, DDS domains) are auto-reaped on empty — there is nothing to keep. Walls that carry
  policy or history (Matrix rooms, k8s namespaces, NATS accounts) persist until an explicit administrative
  act, and Matrix goes further: no delete exists, only tombstoning. Erlang adds a caveat worth noting for a
  daemon-backed registry: "Local membership is not preserved if scope process exits and restarts."

## 3. Principal types: human vs automated

The pattern is unanimous: **principal type is declared by credential kind, never detected.**

- **Kubernetes** is the sharpest statement. "Kubernetes does not have objects which represent normal user
  accounts. Normal users cannot be added to a cluster through an API call" — humans authenticate with
  externally issued certificates/tokens and exist only as the subject string those credentials assert. "In
  contrast, service accounts are users managed by the Kubernetes API … bound to specific namespaces …
  credentials … mounted into pods" ([k8s Authentication](https://kubernetes.io/docs/reference/access-authn-authz/authentication/)).
  The automated principal is a namespaced row in the database; the human principal is deliberately *not*.
- **SPIFFE** draws the same line by scoping itself: SPIFFE IDs identify *workloads* via attestation ("the
  Workload API does not require that a calling workload have any knowledge of its own identity"), and human
  authentication is explicitly out of scope ([SPIFFE concepts](https://spiffe.io/docs/latest/spiffe-about/spiffe-concepts/)).
  Workload identity is attested from provable facts at issuance time — then carried as a credential (SVID),
  not re-inferred per interaction.
- **Unix**: identity is the uid, set at login by a credential check; real vs effective uid separates "who
  owns this process" from "what it may currently do" ([credentials(7)](https://man7.org/linux/man-pages/man7/credentials.7.html)).
  The closest thing anywhere to *detecting* a human is the controlling terminal: "the controlling terminal is
  established when the session leader first opens a terminal." But that marks a session's interactivity, not
  the principal's type — a daemon calls `setsid()` precisely to shed it. Even Unix treats "attached to a
  human" as session state, distinct from identity.
- **NATS**: a user is a credential that "lives in exactly one account" — the human/service distinction, where
  operators want it, is just which credential file a connector holds.

Nothing surveyed sniffs tty-ness, process ancestry, or environment to decide "this is a human." Where such
signals exist (Unix controlling terminal), they are advisory session facts layered *on top of* a
credential-established identity.

## 4. No-entity designs and where they hurt

Two real systems gate (or don't) without any group entity:

- **MQTT + mosquitto ACLs** work at small scale because one administrator owns one static file. The costs are
  visible in the mechanism itself: adding a member to a "team" means editing O(topics) rule lines for that
  user, `deny` lines interleave with grants and are order-sensitive ("Any 'deny' topics are handled before
  topics that grant read/write access" — [mosquitto.conf(5)](https://mosquitto.org/man/mosquitto-conf-5.html)),
  and there is no way to *ask* the broker "who is in this team" — membership is the emergent intersection of
  rules, not a queryable fact. No self-service join/leave exists; every membership change is an admin config
  change.
- **ZeroMQ** simply refuses the problem: "a ZeroMQ system can run without a dedicated message broker"
  ([zeromq.org](https://zeromq.org/get-started/)) — peers connect to endpoints they were told about, and any
  grouping or authorization is the application's job. ZeroMQ is what "no boundary entity" looks like taken to
  the limit: the wall moves into every application's own code.
- **Unix process groups** sit in between: the PGID is a real kernel fact used for signal fan-out and job
  control, but it is *only* an inherited number — no name, no policy, no membership query beyond scanning
  /proc — and nobody builds subscription control on it.

The pattern: ACL-only works when membership is static and admin-owned. The moment members join and leave at
runtime and need to *discover* each other, every ACL-only system grows an implicit group anyway (the acl_file
stanza, the ZeroMQ app's peer list) — unnamed, unqueryable, and maintained by hand. The group entity is not
an optimization over pair rules; it is the thing that makes membership a fact rather than an inference.

## 5. Synthesis

Recurring primitives across all nine systems:

1. **Every wall that gates visibility is named.** Entity-ness varies (Matrix room vs DDS domain_id), but no
   system gates subscription on an anonymous or location-derived boundary. The name is the rendezvous.
2. **Entity-ness tracks policy-carrying.** Pure rendezvous (pg, JGroups, DDS domains) = implicit creation,
   auto-reap on empty, no metadata. Policy-carrying walls (Matrix rooms, NATS accounts, k8s namespaces) =
   explicit creation, persistence, and an owner. A "space" that stores *who may subscribe* is by definition
   in the second family.
3. **Birth placement is explicit-or-inherited; environment only ever names a default.** k8s `default`, NATS
   `$G`, pg's default scope — the environment resolves to a *name*, then the normal join path runs. Unix
   contributes the inheritance rule: children land in the parent's group until they explicitly move.
4. **Membership-as-events is the proven upgrade.** Virtual synchrony's view change — membership deltas
   delivered *in order with* the message stream, same view seen by all — is exactly the discipline a
   subscription system needs so "X joined the space" and X's first event can't race.
5. **Human vs process is credential-declared, never inferred** — and the human need not be a row (k8s), while
   the automated principal always is.

**Implication for orch's shape** (single machine, single human, agents living minutes-to-hours): the survey
comes down firmly on a **named space entity with explicit membership, separate from subscription rows**. The
wall must carry policy (who may subscribe to whom), which per finding 2 puts it in the entity family, not the
rendezvous family — and MQTT shows what the ACL-only alternative costs even at tiny scale once join/leave is
dynamic and self-serve, which orch's spawn-time inheritance is. A newborn root's environment (herdr
workspace, tmux session, cwd) should follow finding 3: it may *resolve to a default space name* — never
constitute the boundary itself — mirroring how k8s and NATS treat their defaults, including their warning
that the default is a bootstrap convenience, not the intended home. Slaves land by Unix-style inheritance
from their spawner. Empty-space fate can follow the rendezvous half of finding 2 only if the space carries no
policy worth keeping; since orch's does, explicit close/reap (k8s delete-cascades) fits better than pg-style
auto-vanish. And per finding 5, "human at the CLI" vs "harness agent on the same CLI" is a property of the
credential presented at connect, declared at session start — never sniffed from tty, ancestry, or
environment; the k8s precedent even licenses keeping the human out of the agent table entirely, as a
principal type rather than a peer row.
