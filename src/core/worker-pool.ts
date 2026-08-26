import os from 'node:os';
import { executeProjectPipeline } from './project-pipeline.js';
import type { ProjectExecutionResult, ProjectTaskPayload } from '../types.js';

export async function runProjectPool(
  projects: readonly ProjectTaskPayload[],
  onComplete: (result: ProjectExecutionResult) => Promise<void> | void,
  concurrency = Math.min(8, os.availableParallelism()),
): Promise<ProjectExecutionResult[]> {
  let nextIndex = 0;
  const results: ProjectExecutionResult[] = [];
  const worker = async (): Promise<void> => {
    while (true) {
      const project = projects[nextIndex++];
      if (!project) return;
      const result = await executeProjectPipeline(project);
      results.push(result);
      await onComplete(result);
    }
  };
  const count = Math.min(Math.max(1, concurrency), projects.length);
  await Promise.all(Array.from({ length: count }, () => worker()));
  return results;
}
