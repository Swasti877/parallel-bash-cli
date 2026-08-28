import { PromptFlow } from './ui/prompt-flow.js';
import { printSummary } from './ui/summary-formatter.js';
import { ReportSink } from './core/report-sink.js';
import { runProjectPool } from './core/worker-pool.js';
import { notify } from './core/notifier.js';
import type { AppConfig, NotificationPolicy, ProjectTaskPayload, REPLChoice, SessionSummary } from './types.js';

export class InteractiveSession {
  private readonly prompts: PromptFlow;

  public constructor(private readonly config: AppConfig, private readonly notificationPolicy: NotificationPolicy) {
    this.prompts = new PromptFlow(config);
  }

  public async run(): Promise<void> {
    let action: REPLChoice = 'RUN_AGAIN';
    while (action === 'RUN_AGAIN') {
      const projects = await this.prompts.selectProjects();
      if (!projects) return;
      const tasks = await this.prompts.stageCommands(projects);
      if (!tasks) return;
      await this.execute(tasks);
      action = await this.prompts.chooseAction();
    }
    this.prompts.outro('Parallel Bash session complete');
  }

  private async execute(tasks: readonly ProjectTaskPayload[]): Promise<void> {
    const totalCommands = tasks.reduce((sum, task) => sum + task.commands.length, 0);
    const sink = new ReportSink(this.config.reportDir, tasks.length);
    const spinner = this.prompts.spinner(`Running ${totalCommands} commands across ${tasks.length} projects`);
    const startedAt = Date.now();
    try {
      const results = await runProjectPool(tasks, (result) => sink.append(result));
      const summary: SessionSummary = {
        timestamp: new Date().toISOString(),
        totalProjects: results.length,
        totalCommands,
        passedProjects: results.filter((result) => result.allPassed).length,
        failedProjects: results.filter((result) => !result.allPassed).length,
        totalWallTimeMs: Date.now() - startedAt,
        results,
      };
      await sink.close(summary);
      spinner.stop('Execution complete');
      printSummary(results, sink.paths.sessionFilePath, sink.paths.latestFilePath);
      notify(summary, sink.paths.latestFilePath, this.notificationPolicy);
    } catch (error) {
      spinner.stop('Execution interrupted');
      throw error;
    }
  }
}
