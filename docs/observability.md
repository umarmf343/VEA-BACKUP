# Observability Guide for Super Admin Dashboards

The Super Admin metrics endpoint (`/api/system/metrics`) now emits structured telemetry for dashboards. Metrics are sourced from real runtime data instead of pseudo-random generators and automatically flow to Datadog and OpenTelemetry (when configured).

## Runtime integrations

### Structured logging
- Logger: [`lib/logger.ts`](../lib/logger.ts) wraps **Pino** with per-request context derived from `x-request-id`.
- API handlers run inside `withRequestContext`, so every log entry carries the same request ID.
- Logs can be forwarded to:
  - **Datadog Logs** – enable with `DATADOG_API_KEY` (and optionally `DATADOG_SITE`, `DATADOG_LOG_URL`).
  - **OpenTelemetry Collector** – configure `OTEL_EXPORTER_OTLP_ENDPOINT` to ship JSON log records.

### Metrics forwarding
- Real-time metrics are collected in [`lib/system-metrics.ts`](../lib/system-metrics.ts) using OS statistics, database aggregates, uptime monitoring, and write queue depth.
- [`lib/observability.ts`](../lib/observability.ts) publishes gauges via `@opentelemetry/api` and forwards numeric series to Datadog.
- Environment flags:
  - `DATADOG_METRICS_URL` (defaults to `https://api.datadoghq.com/api/v2/series`).
  - `SYSTEM_STORAGE_LIMIT_BYTES` for disk utilisation thresholds.

## Suggested dashboards for super admins

> Configure these widgets in Datadog (or any OTLP-compatible dashboard) using the `vea.*` metric namespace.

| Widget | Metric(s) | Notes |
| --- | --- | --- |
| **Uptime Gauge** | `vea.uptime` | Shows system uptime percentage with thresholds: green > 99.9, yellow 99–99.9, red < 99. |
| **User Load Panel** | `vea.active_users`, `vea.database_connections` | Overlay both to correlate active usage with database pool pressure. |
| **Performance Heatmap** | `vea.server_load`, `vea.memory_usage`, `vea.api_response_time` | Surface saturation and slow API responses in the same view. |
| **Latency Trend** | `vea.network_latency` | Display as rolling average. Highlight spikes > 100 ms. |
| **Storage Watcher** | `vea.disk_usage` | Set alert at 80 % to warn super admins about capacity. |

For OpenTelemetry-native dashboards (Grafana, Honeycomb, etc.), subscribe to the same metric names or the OTEL gauges:
- `vea.system.uptime`
- `vea.system.active_users`
- `vea.system.database_connections`
- `vea.system.server_load`
- `vea.system.memory_usage`
- `vea.system.disk_usage`
- `vea.system.network_latency_ms`
- `vea.system.api_response_ms`

## Smoke testing

Run the Jest suite to validate the endpoint contract:

```bash
npm test -- --runTestsByPath __tests__/system-metrics.test.ts
```

The smoke test ensures the endpoint returns numeric metrics, ISO timestamps, and valid status enums.
