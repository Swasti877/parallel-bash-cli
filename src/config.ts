import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { ProjectManifest, ResolvedTask, TaskConfig } from './types.js';

export interface LoadedConfig {
  readonly reportPath: string;
  readonly tasks: ResolvedTask[];
}

function schemaError(message: string): Error {
  return new Error(`Invalid project manifest: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validateTask(value: unknown, index: number): TaskConfig {
  if (!isRecord(value) || typeof value.path !== 'string' || value.path.trim() === '') {
    throw schemaError(`tasks[${index}].path must be a non-empty string`);
  }
  if (value.command !== undefined && typeof value.command !== 'string') {
    throw schemaError(`tasks[${index}].command must be a string`);
  }
  if (value.timeoutMs !== undefined && (typeof value.timeoutMs !== 'number' || value.timeoutMs <= 0)) {
    throw schemaError(`tasks[${index}].timeoutMs must be a positive number`);
  }
  return value as unknown as TaskConfig;
}

export async function loadConfig(configFile: string): Promise<LoadedConfig> {
  const configPath = path.resolve(configFile);
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(configPath, 'utf8')) as unknown;
  } catch (error) {
    throw new Error(`Unable to read or parse ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!isRecord(parsed) || typeof parsed.reportPath !== 'string' || parsed.reportPath.trim() === '') {
    throw schemaError('reportPath must be a non-empty string');
  }
  if (!Array.isArray(parsed.tasks) || parsed.tasks.length === 0) {
    throw schemaError('tasks must be a non-empty array');
  }
  if (parsed.defaultCommand !== undefined && typeof parsed.defaultCommand !== 'string') {
    throw schemaError('defaultCommand must be a string');
  }

  const manifest = parsed as unknown as ProjectManifest;
  const baseDir = path.dirname(configPath);
  const reportPath = path.resolve(baseDir, manifest.reportPath);
  const tasks: ResolvedTask[] = [];

  for (const [index, rawTask] of manifest.tasks.entries()) {
    const task = validateTask(rawTask, index);
    const command = task.command ?? manifest.defaultCommand;
    if (!command || command.trim() === '') {
      throw schemaError(`tasks[${index}] has no command and defaultCommand is not set`);
    }
    const taskPath = path.resolve(baseDir, task.path);
    try {
      const details = await stat(taskPath);
      if (!details.isDirectory()) throw new Error('path is not a directory');
    } catch (error) {
      throw new Error(`Task directory does not exist: ${taskPath} (${error instanceof Error ? error.message : String(error)})`);
    }
    tasks.push({ id: index + 1, path: taskPath, command, timeoutMs: task.timeoutMs });
  }

  await mkdir(path.dirname(reportPath), { recursive: true });
  return { reportPath, tasks };
}
