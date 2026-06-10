type TLogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<TLogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const minLevel: TLogLevel =
  (process.env.LOG_LEVEL as TLogLevel | undefined) ?? 'info';

export class Logger {
  constructor(private readonly context: string) {}

  info(message: string, ...args: unknown[]): void {
    this.print('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.print('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.print('error', message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.print('debug', message, ...args);
  }

  private print(level: TLogLevel, message: string, ...args: unknown[]): void {
    if (LEVELS[level] < LEVELS[minLevel]) return;

    console[level](`[${this.context}] ${message}`, ...args);
  }
}
