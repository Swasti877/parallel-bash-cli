export const ansi = {
  cyan: '\u001b[36m',
  green: '\u001b[32m',
  red: '\u001b[31m',
  yellow: '\u001b[33m',
  gray: '\u001b[90m',
  dim: '\u001b[2m',
  bold: '\u001b[1m',
  reset: '\u001b[0m',
  hideCursor: '\u001b[?25l',
  showCursor: '\u001b[?25h',
  clearLine: '\u001b[2K',
  moveToStart: '\r',
  moveUp: (count: number) => `\u001b[${count}A`,
};

export const box = { topLeft: '╭', topRight: '╮', bottomLeft: '╰', bottomRight: '╯', horizontal: '─', vertical: '│' };

export function truncate(value: string, width: number): string {
  if (width <= 0) return '';
  return value.length <= width ? value : `${value.slice(0, Math.max(0, width - 1))}…`;
}
