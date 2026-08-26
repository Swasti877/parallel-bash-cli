import { executeTask } from './process-runner.js';
import type { CommandResult, ProjectExecutionResult, ProjectTaskPayload, ResolvedTask } from '../types.js';

export async function executeProjectPipeline(project: ProjectTaskPayload): Promise<ProjectExecutionResult> {
  const startedAt = Date.now();
  const commands: CommandResult[] = [];
  for (const [index, command] of project.commands.entries()) {
    const task: ResolvedTask = { id: project.id * 100000 + index, name: project.name, path: project.path, command };
    const result = await executeTask(task);
    const status = result.status === 'SUCCESS' ? 'SUCCESS' : result.status === 'TIMED_OUT' ? 'TIMED_OUT' : 'FAILED';
    commands.push({ command, status, exitCode: result.exitCode, durationMs: result.durationMs, stdout: result.stdout, stderr: result.stderr });
  }
  const failedCount = commands.filter((result) => result.status !== 'SUCCESS').length;
  return {
    name: project.name,
    path: project.path,
    commands,
    totalDurationMs: Date.now() - startedAt,
    passedCount: commands.length - failedCount,
    failedCount,
    allPassed: failedCount === 0,
  };
}
