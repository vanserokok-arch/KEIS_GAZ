export const logger = {
  info(message: string, context?: unknown): void {
    console.log(`[KEIS] ${message}`, context ?? "");
  },
  warn(message: string, context?: unknown): void {
    console.warn(`[KEIS] ${message}`, context ?? "");
  },
  error(message: string, context?: unknown): void {
    console.error(`[KEIS] ${message}`, context ?? "");
  }
};
