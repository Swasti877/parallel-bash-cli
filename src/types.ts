export type TaskStatus = 'SUCCESS' | 'FAILED' | 'TIMED_OUT';

export interface TaskConfig {
  readonly path: string;
  readonly command?: string;
  readonly timeoutMs?: number;
}

export interface ProjectManifest {
  readonly reportPath: string;
  readonly defaultCommand?: string;
  readonly tasks: readonly TaskConfig[];
}

export interface ResolvedTask {
  readonly id: number;
  readonly path: string;
  readonly command: string;
  readonly timeoutMs?: number;
}

export interface TaskResult {
  readonly task: ResolvedTask;
  readonly status: TaskStatus;
  readonly exitCode: number | null;
  readonly durationMs: number;
  readonly stdout: Buffer;
  readonly stderr: Buffer;
}

export interface WorkerPoolStats {
  readonly total: number;
  readonly queued: number;
  readonly running: number;
  readonly completed: number;
  readonly passed: number;
  readonly failed: number;
}

export interface TaskEvents {
  taskStart(task: ResolvedTask, stats: WorkerPoolStats): void;
  taskComplete(result: TaskResult, stats: WorkerPoolStats): void;
}
