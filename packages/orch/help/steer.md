Correct a running agent mid-task. orchd sends the text down the agent's bridge, and the reply
says whether the agent applied it.

    orch steer api-routes Keep the handlers in routes/v2.

Steer a running agent once. A change big enough to explain twice is a new `orch dispatch`.
An agent waiting on a question refuses a steer; answer it with `orch answer`.
