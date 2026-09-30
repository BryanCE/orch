List each live agent's pending question, then answer each one within seconds. A blocked agent
does no work and refuses a steer.

    orch questions
    orch answer api-routes "Use the v2 schema."

The daemon re-asks an unanswered question every `questions.renag_ms`, up to
`questions.renag_limit` times.
