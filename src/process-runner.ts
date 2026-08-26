import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import type { ResolvedTask, TaskResult } from './types.js';

const activeProcesses = new Set<ChildProcess>();
let bashPathPromise: Promise<string> | undefined;

async function usable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function findBash(): Promise<string> {
  const candidates = [
    process.env.SHELL,
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'Git', 'bin', 'bash.exe') : undefined,
    process.env['ProgramW6432'] ? path.join(process.env['ProgramW6432'], 'Git', 'bin', 'bash.exe') : undefined,
  ].filter((candidate): candidate is string => Boolean(candidate));
  for (const candidate of candidates) {
    if (await usable(candidate)) return candidate;
  }
  return 'bash';
}

function getBashPath(): Promise<string> {
  bashPathPromise ??= findBash();
  return bashPathPromise;
}

function terminateProcess(child: ChildProcess): void {
  if (process.platform === 'win32' && child.pid) {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true });
  } else {
    child.kill('SIGTERM');
    setTimeout(() => {
      if (child.exitCode === null && !child.killed) child.kill('SIGKILL');
    }, 2000).unref();
  }
}

export async function executeTask(task: ResolvedTask): Promise<TaskResult> {
  const bash = await getBashPath();
  const startedAt = Date.now();
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  let timedOut = false;
  let timeout: NodeJS.Timeout | undefined;
  let forceKillTimer: NodeJS.Timeout | undefined;

  return new Promise((resolve) => {
    const child = spawn(bash, ['-c', task.command], { cwd: task.path, env: process.env, windowsHide: true });
    activeProcesses.add(child);
    child.stdout?.on('data', (chunk: Buffer) => stdout.push(Buffer.from(chunk)));
    child.stderr?.on('data', (chunk: Buffer) => stderr.push(Buffer.from(chunk)));

    const stopOnTimeout = (): void => {
      timedOut = true;
      terminateProcess(child);
      forceKillTimer = setTimeout(() => {
        if (child.exitCode === null) terminateProcess(child);
      }, 2000);
      forceKillTimer.unref();
    };
    if (task.timeoutMs) timeout = setTimeout(stopOnTimeout, task.timeoutMs);

    child.once('error', (error) => {
      stderr.push(Buffer.from(error.message));
    });
    child.once('close', (exitCode) => {
      if (timeout) clearTimeout(timeout);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      activeProcesses.delete(child);
      resolve({
        task,
        status: timedOut ? 'TIMED_OUT' : exitCode === 0 ? 'SUCCESS' : 'FAILED',
        exitCode,
        durationMs: Date.now() - startedAt,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
      });
    });
  });
}

export function terminateActiveProcesses(): void {
  for (const child of activeProcesses) terminateProcess(child);
}
