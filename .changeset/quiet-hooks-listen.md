---
'@mastra/mcp': minor
---

Added a `registerProcessHooks` option to `MCPClient`, so an application can run its own graceful shutdown. Fixes [#27478](https://github.com/mastra-ai/mastra/issues/27478).

A connected `MCPClient` installs hooks for `SIGINT`, `SIGTERM`, `SIGHUP` and `beforeExit` that disconnect its servers and then end the process. Any shutdown your application runs on the same signals, such as draining in-flight requests, was cut off before it finished, and calling `disconnect()` first did not help. The option defaults to `true`, so nothing changes unless you set it.

```ts
const mcp = new MCPClient({
  servers: { weather: { url: new URL('https://example.com/mcp') } },
  registerProcessHooks: false,
});

process.once('SIGTERM', async () => {
  await drainRequests(); // your own cleanup
  await mcp.disconnect();
  process.exit(0);
});
```

With the hooks off, call `disconnect()` from your own handler: nothing else disconnects the client when the process ends.
