import path from 'node:path';
import { loadConfig } from './config.js';
import { terminateActiveProcesses } from './process-runner.js';
import { ReportSink } from './report-sink.js';
import { Reporter } from './reporter.js';
import { WorkerPool } from './worker-pool.js';

function getConfigPath(args: readonly string[]): string {
  const configIndex = args.indexOf('--config');
  if (configIndex >= 0) {
    const configPath = args[configIndex + 1];
    if (!configPath || configPath.startsWith('--')) throw new Error('--config requires a file path');
    return configPath;
  }
  return path.resolve('projects.json');
}

async function main(): Promise<void> {
  const config = await loadConfig(getConfigPath(process.argv.slice(2)));
  const sink = new ReportSink(config.reportPath);
  const reporter = new Reporter();
  let interrupted = false;
  const handleSignal = (): void => {
    interrupted = true;
    terminateActiveProcesses();
  };
  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);

  try {
    const pool = new WorkerPool(config.tasks, reporter, (result) => sink.append(result));
    const stats = await pool.run();
    await sink.close(stats);
    reporter.printSummary(config.reportPath, stats);
    process.exitCode = interrupted ? 130 : stats.failed > 0 ? 1 : 0;
  } finally {
    process.removeListener('SIGINT', handleSignal);
    process.removeListener('SIGTERM', handleSignal);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
