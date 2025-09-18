import { NextRequest, NextResponse } from "next/server";

import { getSystemMetrics } from "@/lib/super-admin-service";
import { createRequestLogger, withRequestContext } from "@/lib/logger";
import { forwardMetrics, forwardStructuredLog } from "@/lib/observability";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { logger, requestId } = createRequestLogger(request, {
    route: "/api/system/metrics",
    method: "GET",
  });

  return withRequestContext(requestId, async () => {
    logger.info({ event: "system.metrics.fetch.start" }, "Fetching system metrics snapshot");

    try {
      const metrics = await getSystemMetrics({ refresh: true });

      const response = NextResponse.json(metrics);
      response.headers.set("x-request-id", requestId);

      logger.info(
        {
          event: "system.metrics.fetch.success",
          metrics: {
            uptime: metrics.uptime,
            activeUsers: metrics.activeUsers,
            serverStatus: metrics.serverStatus,
            databaseStatus: metrics.databaseStatus,
            overallStatus: metrics.overallStatus,
          },
        },
        "System metrics snapshot collected",
      );

      await Promise.allSettled([
        forwardMetrics(metrics, { logger, requestId }),
        forwardStructuredLog(
          {
            level: "info",
            message: "System metrics snapshot forwarded",
            requestId,
            fields: {
              uptime: metrics.uptime,
              activeUsers: metrics.activeUsers,
              serverStatus: metrics.serverStatus,
              databaseStatus: metrics.databaseStatus,
              overallStatus: metrics.overallStatus,
            },
          },
          logger,
        ),
      ]);

      return response;
    } catch (error) {
      logger.error({ event: "system.metrics.fetch.error", err: error }, "Failed to fetch system metrics");

      await forwardStructuredLog(
        {
          level: "error",
          message: "Failed to fetch system metrics",
          requestId,
          error,
        },
        logger,
      );

      const response = NextResponse.json({ error: "Failed to fetch system metrics" }, { status: 500 });
      response.headers.set("x-request-id", requestId);
      return response;
    }
  });
}
