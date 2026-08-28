import { loadConfig } from './config.js';
import { terminateActiveProcesses } from './core/process-runner.js';
import { InteractiveSession } from './interactive-session.js';
import type { NotificationPolicy } from './types.js';

function getConfigPath(args: readonly string[]): string {
  const configIndex = args.indexOf('--config');
  if (configIndex >= 0) {
    const configPath = args[configIndex + 1];
    if (!configPath || configPath.startsWith('--')) throw new Error('--config requires a file path');
    return configPath;
  }
  return 'projects.json';
}

function getNotificationPolicy(args: readonly string[], configEnabled: boolean): NotificationPolicy {
  const forceNotify = args.includes('--notify') || args.includes('-n');
  const notifyOnFailOnly = args.includes('--notify-on-fail');
  return {
    enabled: forceNotify || configEnabled || notifyOnFailOnly,
    notifyOnFailOnly,
    durationThresholdMs: forceNotify ? 0 : 2000,
  };
}

async function main(): Promise<void> {
  const config = await loadConfig(getConfigPath(process.argv.slice(2)));
  const policy = getNotificationPolicy(process.argv.slice(2), config.notify);
  let interrupted = false;
  const handleSignal = (): void => {
    interrupted = true;
    terminateActiveProcesses();
    process.exitCode = 130;
  };
  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);

  try {
    await new InteractiveSession(config, policy).run();
    process.exitCode = interrupted ? 130 : 0;
  } finally {
    process.removeListener('SIGINT', handleSignal);
    process.removeListener('SIGTERM', handleSignal);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
