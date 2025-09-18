import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { Logger, LoggerOptions } from "pino";
import pino from "pino";

const REQUEST_ID_HEADER = "x-request-id";
const FALLBACK_REQUEST_HEADERS = ["x-vercel-id", "x-amzn-trace-id", "traceparent"];

interface RequestLike {
  headers?: Pick<Headers, "get">;
}

interface RequestContext {
  requestId: string;
}

const context = new AsyncLocalStorage<RequestContext>();

const defaultOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: {
    service: process.env.SERVICE_NAME ?? "vea-portal",
    environment: process.env.NODE_ENV ?? "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  mixin() {
    const store = context.getStore();
    return store?.requestId ? { requestId: store.requestId } : {};
  },
};

const rootLogger = pino(defaultOptions);

export function getRootLogger(): Logger {
  return rootLogger;
}

export function getCurrentRequestId(): string | undefined {
  return context.getStore()?.requestId;
}

export function ensureRequestId(source?: RequestLike | string | null): string {
  if (typeof source === "string" && source.trim().length > 0) {
    return source;
  }

  if (source && "headers" in source && source.headers) {
    const direct = source.headers.get(REQUEST_ID_HEADER);
    if (direct && direct.length > 0) {
      return direct;
    }

    for (const header of FALLBACK_REQUEST_HEADERS) {
      const value = source.headers.get(header);
      if (value && value.length > 0) {
        return value;
      }
    }
  }

  return randomUUID();
}

export function withRequestContext<T>(requestId: string, fn: () => T): T;
export function withRequestContext<T>(requestId: string, fn: () => Promise<T>): Promise<T>;
export function withRequestContext<T>(requestId: string, fn: () => T | Promise<T>): T | Promise<T> {
  return context.run({ requestId }, fn);
}

export function getLogger(bindings?: Record<string, unknown>): Logger {
  if (!bindings || Object.keys(bindings).length === 0) {
    return rootLogger;
  }

  return rootLogger.child(bindings);
}

export function getRequestLogger(bindings?: Record<string, unknown>): Logger {
  const store = context.getStore();
  if (!store) {
    return getLogger(bindings);
  }

  return rootLogger.child({ ...(bindings ?? {}), requestId: store.requestId });
}

export function createRequestLogger(source?: RequestLike, bindings?: Record<string, unknown>): {
  logger: Logger;
  requestId: string;
} {
  const requestId = ensureRequestId(source);
  const logger = rootLogger.child({ ...(bindings ?? {}), requestId });
  return { logger, requestId };
}

export type { Logger } from "pino";
