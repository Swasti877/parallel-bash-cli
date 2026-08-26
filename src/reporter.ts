import type { ResolvedTask, TaskEvents, TaskResult, WorkerPoolStats } from './types.js';

export class Reporter implements TaskEvents {
  private readonly results: TaskResult[] = [];

  public taskStart(_task: ResolvedTask, stats: WorkerPoolStats): void {
    if (process.stdout.isTTY) {
      process.stdout.write(`\r\x1b[K[PROGRESS: ${stats.completed}/${stats.total}] [ACTIVE: ${stats.running}] [PASSED: ${stats.passed}] [FAILED: ${stats.failed}]`);
    }
  }

  public taskComplete(result: TaskResult, stats: WorkerPoolStats): void {
    this.results.push(result);
    const line = `[PROGRESS: ${stats.completed}/${stats.total}] [ACTIVE: ${stats.running}] [PASSED: ${stats.passed}] [FAILED: ${stats.failed}] -> Done: ${result.task.path} (${result.durationMs}ms)`;
    if (process.stdout.isTTY) process.stdout.write(`\r\x1b[K${line}`);
    else process.stdout.write(`${line}\n`);
  }

  public printSummary(reportPath: string, stats: WorkerPoolStats): void {
    if (process.stdout.isTTY) process.stdout.write('\n');
    const rows = this.results.map((result) => ({
      Path: result.task.path,
      Command: result.task.command,
      'Exit Code': result.exitCode ?? 'N/A',
      Duration: `${result.durationMs}ms`,
      Status: result.status,
    }));
    const columns = ['Path', 'Command', 'Exit Code', 'Duration', 'Status'] as const;
    const widths = columns.map((column) => Math.max(column.length, ...rows.map((row) => String(row[column]).length)));
    const format = (values: readonly string[]): string => values.map((value, index) => value.padEnd(widths[index])).join(' | ');
    process.stdout.write(`${format(columns)}\n${widths.map((width) => '-'.repeat(width)).join('-+-')}\n`);
    for (const row of rows) process.stdout.write(`${format(columns.map((column) => String(row[column])))}\n`);
    process.stdout.write(`\nPassed: ${stats.passed}/${stats.total}; Failed: ${stats.failed}\nReport: ${reportPath}\n`);
  }
}
