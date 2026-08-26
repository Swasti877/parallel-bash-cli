import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { AppConfig, ProjectEntry } from './types.js';

export interface LoadedConfig {
  readonly reportDir: string;
  readonly projects: ProjectEntry[];
}

function schemaError(message: string): Error {
  return new Error(`Invalid project manifest: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validateProject(value: unknown, index: number): ProjectEntry {
  if (!isRecord(value) || typeof value.name !== 'string' || value.name.trim() === '') throw schemaError(`projects[${index}].name must be a non-empty string`);
  if (typeof value.path !== 'string' || value.path.trim() === '') throw schemaError(`projects[${index}].path must be a non-empty string`);
  return { name: value.name.trim(), path: value.path };
}

export async function loadConfig(configFile: string): Promise<LoadedConfig> {
  const configPath = path.resolve(configFile);
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(configPath, 'utf8')) as unknown;
  } catch (error) {
    throw new Error(`Unable to read or parse ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!isRecord(parsed) || typeof parsed.reportDir !== 'string' || parsed.reportDir.trim() === '') {
    throw schemaError('reportDir must be a non-empty string');
  }
  const rawProjects = parsed.projects;
  if (!Array.isArray(rawProjects) || rawProjects.length === 0) throw schemaError('projects must be a non-empty array');

  const baseDir = path.dirname(configPath);
  const reportDir = path.resolve(baseDir, parsed.reportDir);
  const projects: ProjectEntry[] = [];

  for (const [index, rawProject] of rawProjects.entries()) {
    const project = validateProject(rawProject, index);
    const taskPath = path.resolve(baseDir, project.path);
    try {
      const details = await stat(taskPath);
      if (!details.isDirectory()) throw new Error('path is not a directory');
    } catch (error) {
      throw new Error(`Task directory does not exist: ${taskPath} (${error instanceof Error ? error.message : String(error)})`);
    }
    projects.push({ name: project.name, path: taskPath });
  }

  await mkdir(reportDir, { recursive: true });
  return { reportDir, projects };
}
