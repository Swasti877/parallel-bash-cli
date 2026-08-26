import { ansi } from './ansi.js';

export class FrameBuffer {
  private previousLines = 0;
  private timer: NodeJS.Timeout | undefined;

  public constructor(private readonly render: () => string[]) {}

  public start(): void {
    if (!process.stdout.isTTY || this.timer) return;
    process.stdout.write(ansi.hideCursor);
    this.flush();
    this.timer = setInterval(() => this.flush(), 40);
  }

  public stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.flush();
    process.stdout.write(ansi.showCursor);
  }

  private flush(): void {
    const lines = this.render().map((line) => line.slice(0, Math.max(20, (process.stdout.columns || 120) - 1)));
    const prefix = this.previousLines > 0 ? `${ansi.moveUp(this.previousLines)}\r` : '';
    process.stdout.write(`${prefix}${lines.map((line) => `${ansi.clearLine}${line}`).join('\n')}\n`);
    this.previousLines = lines.length + 1;
  }
}
