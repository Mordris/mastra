import { MCPClient } from '../client/configuration.js';

// A host application that runs its own graceful shutdown on SIGTERM, with a connected MCPClient.
// Usage: graceful-shutdown-host.ts <registerProcessHooks: true | false | default> <server definition as JSON>
const [, , registerProcessHooks, serverJson] = process.argv;

const mcp = new MCPClient({
  servers: { server: JSON.parse(serverJson!) },
  ...(registerProcessHooks === 'default' ? {} : { registerProcessHooks: registerProcessHooks === 'true' }),
});

process.once('SIGTERM', async () => {
  console.log('host: SIGTERM received, starting cleanup');
  await mcp.disconnect();
  // Stands in for draining in-flight requests.
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('host: cleanup finished');
  process.exit(0);
});

await mcp.listTools();
console.log('host: READY');

// Keeps the process alive until the signal arrives.
setInterval(() => {}, 1000);
