import { spawn } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Resolve the tsx CLI binary from the workspace instead of using npx -y, which can be flaky in CI.
const tsxCli = path.join(path.dirname(require.resolve('tsx/package.json')), 'dist', 'cli.mjs');
const packageRoot = path.join(__dirname, '..', '..');
const hostScript = path.join(__dirname, '..', '__fixtures__/graceful-shutdown-host.ts');
const stdioServer = {
  command: process.execPath,
  args: [tsxCli, path.join(__dirname, '..', '__fixtures__/noisy-server.ts')],
  stderr: 'pipe',
};

/**
 * Runs the host in its own process (plain node with the tsx loader: the tsx CLI would sit between the
 * test and the host, and end itself on SIGTERM), waits until its MCPClient is connected, sends SIGTERM and
 * reports how the process ended. Signals can only be delivered to a child on POSIX, so the suite
 * is skipped on Windows.
 */
async function sigtermHost(registerProcessHooks: 'true' | 'false' | 'default') {
  const host = spawn(
    process.execPath,
    ['--import', 'tsx', hostScript, registerProcessHooks, JSON.stringify(stdioServer)],
    { cwd: packageRoot, stdio: ['ignore', 'pipe', 'inherit'] },
  );
  let stdout = '';
  const ready = new Promise<void>((resolve, reject) => {
    host.stdout.on('data', chunk => {
      stdout += String(chunk);
      if (stdout.includes('host: READY')) resolve();
    });
    host.once('error', reject);
    host.once('exit', () => reject(new Error(`host exited before it was ready:\n${stdout}`)));
  });
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(resolve => {
    host.once('exit', (code, signal) => resolve({ code, signal }));
  });
  try {
    await ready;
    host.kill('SIGTERM');
    return { ...(await exited), stdout };
  } finally {
    host.kill('SIGKILL');
  }
}

// https://github.com/mastra-ai/mastra/issues/27478
describe.skipIf(process.platform === 'win32')('MCPClient process hooks and the host shutdown', () => {
  it('lets the host finish its own graceful shutdown when registerProcessHooks is false', async () => {
    const result = await sigtermHost('false');

    expect(result.stdout).toContain('host: SIGTERM received, starting cleanup');
    expect(result.stdout).toContain('host: cleanup finished');
    expect(result.code).toBe(0);
  }, 30000);

  it('still ends the process on SIGTERM by default, before the host finishes its cleanup', async () => {
    const result = await sigtermHost('default');

    expect(result.stdout).not.toContain('host: cleanup finished');
    expect(result.code).toBe(143);
  }, 30000);
});
