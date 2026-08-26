import { createWriteStream, type WriteStream } from 'node:fs';
import { once } from 'node:events';
import path from 'node:path';
import type { ProjectExecutionResult, SessionSummary } from '../types.js';

export interface ReportPaths {
  readonly sessionFilePath: string;
  readonly latestFilePath: string;
}

function timestampForFilename(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', '_').replaceAll(':', '-');
}

export class ReportSink {
  public readonly paths: ReportPaths;
  private readonly streams: readonly WriteStream[];
  private pending = Promise.resolve();

  public constructor(reportDir: string, targetCount: number) {
    const now = new Date();
    this.paths = {
      sessionFilePath: path.join(reportDir, `report_${timestampForFilename(now)}.txt`),
      latestFilePath: path.join(reportDir, 'latest.txt'),
    };
    this.streams = [
      createWriteStream(this.paths.sessionFilePath, { flags: 'w', encoding: 'utf8' }),
      createWriteStream(this.paths.latestFilePath, { flags: 'w', encoding: 'utf8' }),
    ];
    this.pending = this.write([
      '================================================================================\n',
      `PARALLEL EXECUTION SESSION - ${now.toISOString()}\n`,
      `Target Projects: ${targetCount}\n`,
      'Concurrency Ceiling: 8\n',
      '================================================================================\n',
    ].join(''));
  }

  private async write(text: string): Promise<void> {
    await Promise.all(this.streams.map(async (stream) => {
      if (stream.write(text)) return;
      await once(stream, 'drain');
    }));
  }

  public append(result: ProjectExecutionResult): Promise<void> {
    const block = [`\n[PROJECT] ${result.name}\n`, `Path: ${result.path}\n`, `Total Duration: ${result.totalDurationMs}ms\n`];
    result.commands.forEach((command, index) => {
      block.push(`\n--- COMMAND ${index + 1}: ${command.command} ---\n`, `Status: ${command.status}\n`, `Exit Code: ${command.exitCode ?? 'N/A'}\n`, `Duration: ${command.durationMs}ms\n`, '--- STDOUT ---\n', command.stdout, command.stdout && !command.stdout.endsWith('\n') ? '\n' : '', '--- STDERR ---\n', command.stderr, command.stderr && !command.stderr.endsWith('\n') ? '\n' : '', '---\n');
    });
    this.pending = this.pending.then(() => this.write(block.join('')));
    return this.pending;
  }

  public async close(summary: SessionSummary): Promise<void> {
    this.pending = this.pending.then(() => this.write(`\n=== SESSION SUMMARY ===\nProjects: ${summary.totalProjects}\nCommands: ${summary.totalCommands}\nPassed Projects: ${summary.passedProjects}\nFailed Projects: ${summary.failedProjects}\nWall Time: ${summary.totalWallTimeMs}ms\n=== END SESSION ===\n`));
    await this.pending;
    await Promise.all(this.streams.map((stream) => new Promise<void>((resolve, reject) => { stream.once('error', reject); stream.once('close', resolve); stream.end(); })));
  }
}
