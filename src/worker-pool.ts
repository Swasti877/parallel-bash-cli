import os from 'node:os';
import { executeTask } from './process-runner.js';
import type { ResolvedTask, TaskEvents, TaskResult, WorkerPoolStats } from './types.js';

export type ResultConsumer = (result: TaskResult) => Promise<void>;

export class WorkerPool {
  private nextIndex = 0;
  private running = 0;
  private completed = 0;
  private passed = 0;
  private failed = 0;

  public constructor(
    private readonly tasks: readonly ResolvedTask[],
    private readonly events: TaskEvents,
    private readonly consume: ResultConsumer,
    private readonly concurrency = Math.min(8, os.availableParallelism()),
  ) {}

  private stats(): WorkerPoolStats {
    return {
      total: this.tasks.length,
      queued: this.tasks.length - this.nextIndex,
      running: this.running,
      completed: this.completed,
      passed: this.passed,
      failed: this.failed,
    };
  }

  public async run(): Promise<WorkerPoolStats> {
    const workerCount = Math.min(Math.max(1, this.concurrency), this.tasks.length);
    const worker = async (): Promise<void> => {
      while (true) {
        const task = this.tasks[this.nextIndex++];
        if (!task) return;
        this.running++;
        this.events.taskStart(task, this.stats());
        const result = await executeTask(task);
        await this.consume(result);
        this.running--;
        this.completed++;
        if (result.status === 'SUCCESS') this.passed++;
        else this.failed++;
        this.events.taskComplete(result, this.stats());
      }
    };
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return this.stats();
  }
}
