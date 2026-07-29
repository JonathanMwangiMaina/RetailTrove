declare module "@sentry/node" {
  import { Handler as H } from "express";
  export function init(options: {
    dsn?: string;
    environment?: string;
    tracesSampleRate?: number;
  }): void;
  export const Handlers: {
    requestHandler(): H;
    errorHandler(): H;
  };
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
