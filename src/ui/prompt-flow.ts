import * as p from '@clack/prompts';
import pc from 'picocolors';
import type { AppConfig, ProjectEntry, ProjectTaskPayload, REPLChoice } from '../types.js';

function canceled(value: unknown): value is symbol {
  return p.isCancel(value);
}

export class PromptFlow {
  private selected = new Set<string>();

  public constructor(private readonly config: AppConfig) {}

  public async selectProjects(): Promise<ProjectEntry[] | undefined> {
    const answer = await p.multiselect({
      message: 'Select projects',
      options: this.config.projects.map((project) => ({ value: project.path, label: project.name, hint: project.path })),
      initialValues: [...this.selected],
      required: true,
      maxItems: 7,
    });
    if (canceled(answer)) return undefined;
    this.selected = new Set(answer);
    return this.config.projects.filter((project) => this.selected.has(project.path));
  }

  public async stageCommands(projects: readonly ProjectEntry[]): Promise<ProjectTaskPayload[] | undefined> {
    const tasks: ProjectTaskPayload[] = [];
    for (const [index, project] of projects.entries()) {
      const commands: string[] = [];
      while (true) {
        const answer = await p.text({ message: `Command ${commands.length + 1} for "${project.name}"`, placeholder: 'Press Enter on an empty line to finish' });
        if (canceled(answer)) return undefined;
        const command = (answer ?? '').trim();
        if (!command) break;
        commands.push(command);
      }
      if (commands.length) tasks.push({ id: index + 1, name: project.name, path: project.path, commands });
    }
    return tasks.length ? tasks : undefined;
  }

  public async chooseAction(): Promise<REPLChoice> {
    const answer = await p.select({ message: 'What next?', options: [{ value: 'RUN_AGAIN', label: 'Run another batch', hint: 'Keep the current selection' }, { value: 'EXIT', label: 'Exit' }] });
    return canceled(answer) || answer === 'EXIT' ? 'EXIT' : 'RUN_AGAIN';
  }

  public spinner(message: string): ReturnType<typeof p.spinner> {
    const spinner = p.spinner();
    spinner.start(pc.cyan(message));
    return spinner;
  }
}
