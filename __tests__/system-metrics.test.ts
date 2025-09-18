/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";

import { GET } from "@/app/api/system/metrics/route";

describe("System metrics API", () => {
  it("returns validated numeric metrics", async () => {
    const request = new NextRequest("http://localhost/api/system/metrics");
    const response = await GET(request);

    expect(response.status).toBe(200);

    const payload = (await response.json()) as Record<string, unknown>;
    const numericFields = [
      "uptime",
      "activeUsers",
      "databaseConnections",
      "serverLoad",
      "memoryUsage",
      "diskUsage",
      "networkLatency",
      "apiResponseTime",
    ];

    for (const field of numericFields) {
      expect(typeof payload[field]).toBe("number");
      expect(Number.isFinite(payload[field] as number)).toBe(true);
    }

    expect(typeof payload.lastBackupAt).toBe("string");
    expect(typeof payload.updatedAt).toBe("string");
    expect(["healthy", "warning", "critical"]).toContain(payload.serverStatus);
    expect(["healthy", "warning", "critical"]).toContain(payload.databaseStatus);
    expect(["healthy", "warning", "critical"]).toContain(payload.overallStatus);
  });
});
