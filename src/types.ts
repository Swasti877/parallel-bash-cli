export type TaskStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'TIMED_OUT';
export type REPLState = 'SELECT_PROJECTS' | 'READ_COMMAND' | 'EXECUTING' | 'ACTION_MENU' | 'EXIT';

export interface ProjectEntry {
  readonly name: string;
  readonly path: string;
}

export interface AppConfig {
  readonly reportDir: string;
  readonly projects: readonly ProjectEntry[];
}

export interface TaskConfig {
  readonly name?: string;
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
  readonly name: string;
  readonly path: string;
  readonly command: string;
  readonly timeoutMs?: number;
}

export type TaskPayload = ResolvedTask;

export interface ProjectTaskPayload {
  readonly id: number;
  readonly name: string;
  readonly path: string;
  readonly commands: readonly string[];
}

export interface CommandResult {
  readonly command: string;
  readonly status: Exclude<TaskStatus, 'PENDING' | 'RUNNING'>;
  readonly exitCode: number | null;
  readonly durationMs: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface ProjectExecutionResult {
  readonly name: string;
  readonly path: string;
  readonly commands: readonly CommandResult[];
  readonly totalDurationMs: number;
  readonly passedCount: number;
  readonly failedCount: number;
  readonly allPassed: boolean;
}

export interface SessionSummary {
  readonly timestamp: string;
  readonly totalProjects: number;
  readonly totalCommands: number;
  readonly passedProjects: number;
  readonly failedProjects: number;
  readonly totalWallTimeMs: number;
  readonly results: readonly ProjectExecutionResult[];
}

export type REPLChoice = 'RUN_AGAIN' | 'EXIT';

export interface TaskResult {
  readonly task: ResolvedTask;
  readonly status: TaskStatus;
  readonly exitCode: number | null;
  readonly durationMs: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface LiveWorkerState {
  readonly id: number;
  readonly name: string;
  readonly status: TaskStatus;
  readonly startTime: number;
  readonly durationMs: number;
  readonly latestLogLine: string;
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
