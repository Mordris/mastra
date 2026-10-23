---
'@mastra/core': patch
---

Fixed a client tool result being lost when the response that made the call was stored as several messages. With `workingMemory.useStateSignals`, or any other state signal, a signal added in the middle of a response stores the rest of that response as a new message. When the client sent the tool's result together with the next user message, the result was matched against the response's first stored message, which doesn't hold the call, and was discarded. The stored call stayed pending and dropped out of every later prompt. The result now reaches the stored message that holds the call, the same as when the response is stored as one message.

Fixes #28258.
