declare module "@sentry/node" {
  import type { Express } from "express";
  export function init(options: {
    dsn?: string;
    environment?: string;
    tracesSampleRate?: number;
  }): void;
  export function setupExpressErrorHandler(app: Express): void;
}

declare module "@sentry/react" {
  export function init(options: {
    dsn?: string;
    environment?: string;
    tracesSampleRate?: number;
    integrations?: unknown[];
  }): void;
  export function browserTracingIntegration(): unknown;
}

declare module "../scripts/refresh-mpesa-allowlist.mjs" {
  export function refreshMpesaAllowlist(): Promise<{ success: boolean; ranges: string[] }>;
}
