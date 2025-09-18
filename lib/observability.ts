import { metrics as otelMetrics } from "@opentelemetry/api";

import type { Logger } from "./logger";
import type { SystemMetricsSnapshot } from "./super-admin-service";

const serviceName = process.env.SERVICE_NAME ?? "vea-portal";
const environment = process.env.NODE_ENV ?? "development";

const meter = otelMetrics.getMeter("vea-portal");

const uptimeGauge = meter.createObservableGauge("vea.system.uptime", {
  description: "Portal uptime percentage",
});
const activeUsersGauge = meter.createObservableGauge("vea.system.active_users", {
  description: "Active user count",
});
const databaseConnectionsGauge = meter.createObservableGauge("vea.system.database_connections", {
  description: "Estimated active database connections",
});
const serverLoadGauge = meter.createObservableGauge("vea.system.server_load", {
  description: "Server load percentage",
});
const memoryUsageGauge = meter.createObservableGauge("vea.system.memory_usage", {
  description: "Memory usage percentage",
});
const diskUsageGauge = meter.createObservableGauge("vea.system.disk_usage", {
  description: "Disk usage percentage",
});
const networkLatencyGauge = meter.createObservableGauge("vea.system.network_latency_ms", {
  description: "Network latency in milliseconds",
});
const apiResponseGauge = meter.createObservableGauge("vea.system.api_response_ms", {
  description: "API response time in milliseconds",
});

let otelRegistered = false;
let latestSnapshot: SystemMetricsSnapshot | null = null;

function ensureOtelObservers() {
  if (otelRegistered) {
    return;
  }

  meter.addBatchObservableCallback((observableResult) => {
    if (!latestSnapshot) return;

    observableResult.observe(uptimeGauge, latestSnapshot.uptime);
    observableResult.observe(activeUsersGauge, latestSnapshot.activeUsers);
    observableResult.observe(databaseConnectionsGauge, latestSnapshot.databaseConnections);
    observableResult.observe(serverLoadGauge, latestSnapshot.serverLoad);
    observableResult.observe(memoryUsageGauge, latestSnapshot.memoryUsage);
    observableResult.observe(diskUsageGauge, latestSnapshot.diskUsage);
    observableResult.observe(networkLatencyGauge, latestSnapshot.networkLatency);
    observableResult.observe(apiResponseGauge, latestSnapshot.apiResponseTime);
  }, [
    uptimeGauge,
    activeUsersGauge,
    databaseConnectionsGauge,
    serverLoadGauge,
    memoryUsageGauge,
    diskUsageGauge,
    networkLatencyGauge,
    apiResponseGauge,
  ]);

  otelRegistered = true;
}

function toOtelAnyValue(value: unknown): any {
  if (value === null || value === undefined) {
    return { stringValue: String(value) };
  }

  if (typeof value === "string") {
    return { stringValue: value };
  }

  if (typeof value === "boolean") {
    return { boolValue: value };
  }

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return { intValue: value };
    }

    return { doubleValue: value };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: { values: value.map((entry) => toOtelAnyValue(entry)) },
    };
  }

  if (value instanceof Error) {
    return toOtelAnyValue({
      message: value.message,
      stack: value.stack,
      name: value.name,
    });
  }

  if (typeof value === "object") {
    return {
      kvlistValue: {
        values: Object.entries(value as Record<string, unknown>).map(([key, entry]) => ({
          key,
          value: toOtelAnyValue(entry),
        })),
      },
    };
  }

  return { stringValue: JSON.stringify(value) };
}

async function sendLogToDatadog(payload: StructuredLogPayload, logger?: Logger) {
  const apiKey = process.env.DATADOG_API_KEY;
  if (!apiKey) return;
  if (typeof fetch !== "function") return;

  const site = process.env.DATADOG_SITE ?? "datadoghq.com";
  const url = process.env.DATADOG_LOG_URL ?? `https://http-intake.logs.${site}/api/v2/logs`;
  const tags = [`service:${serviceName}`, `env:${environment}`];
  if (payload.requestId) {
    tags.push(`request_id:${payload.requestId}`);
  }

  const body = [
    {
      ddsource: serviceName,
      ddtags: tags.join(","),
      level: payload.level,
      message: payload.message,
      timestamp: new Date().toISOString(),
      request_id: payload.requestId,
      ...payload.fields,
      error:
        payload.error instanceof Error
          ? { message: payload.error.message, stack: payload.error.stack, name: payload.error.name }
          : payload.error,
    },
  ];

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      logger?.warn({ status: response.status, detail: text }, "Failed to forward log to Datadog");
    }
  } catch (error) {
    logger?.warn({ err: error }, "Unable to forward log to Datadog");
  }
}

async function sendLogToOpenTelemetry(payload: StructuredLogPayload, logger?: Logger) {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/$/, "");
  if (!endpoint) return;
  if (typeof fetch !== "function") return;

  const url = `${endpoint}/v1/logs`;
  const record = {
    timeUnixNano: `${BigInt(Date.now()) * 1_000_000n}`,
    severityText: payload.level.toUpperCase(),
    body: { stringValue: payload.message },
    attributes: [
      ...(payload.requestId ? [{ key: "request.id", value: { stringValue: payload.requestId } }] : []),
      ...Object.entries(payload.fields ?? {}).map(([key, value]) => ({
        key,
        value: toOtelAnyValue(value),
      })),
    ],
  };

  if (payload.error) {
    record.attributes.push({
      key: "error",
      value: toOtelAnyValue(
        payload.error instanceof Error
          ? { message: payload.error.message, stack: payload.error.stack, name: payload.error.name }
          : payload.error,
      ),
    });
  }

  const body = {
    resourceLogs: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: serviceName } },
            { key: "deployment.environment", value: { stringValue: environment } },
          ],
        },
        scopeLogs: [
          {
            scope: { name: "vea-portal" },
            logRecords: [record],
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      logger?.warn({ status: response.status, detail: text }, "Failed to forward log to OpenTelemetry endpoint");
    }
  } catch (error) {
    logger?.warn({ err: error }, "Unable to forward log to OpenTelemetry endpoint");
  }
}

async function sendMetricsToDatadog(snapshot: SystemMetricsSnapshot, logger?: Logger) {
  const apiKey = process.env.DATADOG_API_KEY;
  if (!apiKey) return;
  if (typeof fetch !== "function") return;

  const site = process.env.DATADOG_SITE ?? "datadoghq.com";
  const url = process.env.DATADOG_METRICS_URL ?? `https://api.${site}/api/v2/series`;
  const timestamp = Math.round(Date.now() / 1000);
  const tags = [
    `service:${serviceName}`,
    `env:${environment}`,
    `server_status:${snapshot.serverStatus}`,
    `database_status:${snapshot.databaseStatus}`,
    `overall_status:${snapshot.overallStatus}`,
  ];

  const series = Object.entries(snapshot)
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
    .map(([name, value]) => ({
      metric: `vea.${name.replace(/([A-Z])/g, (_, letter: string) => `_${letter.toLowerCase()}`)}`,
      type: 0,
      points: [[timestamp, value as number]],
      tags,
    }));

  if (series.length === 0) {
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": apiKey,
      },
      body: JSON.stringify({ series }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      logger?.warn({ status: response.status, detail: text }, "Failed to forward metrics to Datadog");
    }
  } catch (error) {
    logger?.warn({ err: error }, "Unable to forward metrics to Datadog");
  }
}

export interface StructuredLogPayload {
  level: string;
  message: string;
  requestId?: string;
  fields?: Record<string, unknown>;
  error?: unknown;
}

export async function forwardStructuredLog(payload: StructuredLogPayload, logger?: Logger) {
  await Promise.allSettled([
    sendLogToDatadog(payload, logger),
    sendLogToOpenTelemetry(payload, logger),
  ]);
}

export async function forwardMetrics(snapshot: SystemMetricsSnapshot, context: { logger?: Logger; requestId?: string } = {}) {
  latestSnapshot = snapshot;
  ensureOtelObservers();

  await Promise.allSettled([
    sendMetricsToDatadog(snapshot, context.logger),
  ]);
}
