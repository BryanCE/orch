Read each live agent's pending question. Answer one with `orch answer <target> "<text>"`.

An unanswered question is re-asked by the daemon every `questions.renag_ms`, up to
`questions.renag_limit` times. Each re-ask is an `asking` event with `askCount`, and the
last sets `gaveUp`. A blocked agent is the most expensive idle, and a steer aimed at one is
accepted and then lost. Answer within seconds.
