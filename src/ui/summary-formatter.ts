import pc from 'picocolors';
import type { ProjectExecutionResult } from '../types.js';

export function printSummary(results: readonly ProjectExecutionResult[], sessionFilePath: string, latestFilePath: string): void {
  const rows = results.map((result) => ({
    Project: result.name,
    Commands: result.commands.length,
    Passed: result.passedCount,
    Failed: result.failedCount,
    Duration: `${result.totalDurationMs}ms`,
    Status: result.allPassed ? pc.green('SUCCESS') : pc.red('FAILED'),
  }));
  const columns = ['Project', 'Commands', 'Passed', 'Failed', 'Duration', 'Status'] as const;
  const widths = columns.map((column) => Math.max(column.length, ...rows.map((row) => String(row[column]).length)));
  const format = (values: readonly string[]): string => values.map((value, index) => value.padEnd(widths[index])).join(' | ');
  process.stdout.write(`\n${format(columns)}\n${widths.map((width) => '-'.repeat(width)).join('-+-')}\n`);
  for (const row of rows) process.stdout.write(`${format(columns.map((column) => String(row[column])))}\n`);
  for (const result of results) {
    for (const command of result.commands.filter((item) => item.status !== 'SUCCESS')) {
      const source = command.stderr || command.stdout;
      const tail = source.split(/\r?\n/).filter(Boolean).slice(-3).join('\n');
      process.stdout.write(`\n${pc.red(`Failure: ${result.name} | ${command.command}`)}\n${pc.red(tail || 'No output captured')}\n`);
    }
  }
  process.stdout.write(`\n${pc.green(`Session report: ${sessionFilePath}`)}\n`);
  process.stdout.write(`${pc.green(`Latest report: ${latestFilePath}`)}\n`);
}
