import { createWriteStream, type WriteStream } from 'node:fs';
import { once } from 'node:events';
import type { TaskResult, WorkerPoolStats } from './types.js';

export class ReportSink {
  private readonly stream: WriteStream;
  private pending: Promise<void>;

  public constructor(private readonly reportPath: string) {
    this.stream = createWriteStream(reportPath, { encoding: 'utf8' });
    this.pending = this.write('Parallel Bash CLI Report\n');
  }

  private async write(content: string): Promise<void> {
    if (this.stream.write(content)) return;
    await once(this.stream, 'drain');
  }

  public append(result: TaskResult): Promise<void> {
    const block = [
      '=== TASK ' + result.task.id + ' ===\n',
      `Path: ${result.task.path}\n`,
      `Command: ${result.task.command}\n`,
      `Status: ${result.status}\n`,
      `Exit Code: ${result.exitCode ?? 'N/A'}\n`,
      `Duration: ${result.durationMs}ms\n`,
      '--- STDOUT ---\n',
      result.stdout.toString('utf8'),
      result.stdout.length > 0 && !result.stdout.toString('utf8').endsWith('\n') ? '\n' : '',
      '--- STDERR ---\n',
      result.stderr.toString('utf8'),
      result.stderr.length > 0 && !result.stderr.toString('utf8').endsWith('\n') ? '\n' : '',
      '---\n',
    ].join('');
    this.pending = this.pending.then(() => this.write(block));
    return this.pending;
  }

  public async close(stats: WorkerPoolStats): Promise<void> {
    this.pending = this.pending.then(() => this.write([
      '\n=== SUMMARY ===\n',
      `Total: ${stats.total}\n`,
      `Passed: ${stats.passed}\n`,
      `Failed: ${stats.failed}\n`,
    ].join('')));
    await this.pending;
    await new Promise<void>((resolve, reject) => {
      this.stream.once('error', reject);
      this.stream.once('close', resolve);
      this.stream.end();
    });
  }
}
