import { exec } from 'node:child_process';
import notifier from 'node-notifier';
import type { NotificationPolicy, SessionSummary } from '../types.js';

export function shouldNotify(summary: SessionSummary, policy: NotificationPolicy): boolean {
  if (!policy.enabled || summary.totalWallTimeMs < policy.durationThresholdMs) return false;
  return !policy.notifyOnFailOnly || summary.failedProjects > 0;
}

export function notify(summary: SessionSummary, latestFilePath: string, policy: NotificationPolicy): void {
  if (!shouldNotify(summary, policy)) return;

  const failed = summary.failedProjects > 0;
  process.stdout.write('\x07');
  notifier.notify({
    title: failed ? 'Parallel Bash CLI Failed' : 'Parallel Bash CLI Succeeded',
    message: `${summary.passedProjects}/${summary.totalProjects} projects passed in ${(summary.totalWallTimeMs / 1000).toFixed(2)}s`,
    sound: true,
    wait: failed,
    appID: 'Parallel.Bash.Runner',
    ...(failed ? { actions: 'Open Report' } : {}),
  }, (error, response) => {
    if (!error && failed && response === 'activate') exec(`start "" "${latestFilePath}"`);
  });
}
