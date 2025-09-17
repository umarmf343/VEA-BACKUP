"use client";

import * as React from "react";
import { Activity, AlertTriangle, CheckCircle, Cpu, Loader2, RefreshCw, Server, Users, Wifi, Database } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const METRICS_ENDPOINT = "/api/system/metrics";

type StatusLevel = "healthy" | "warning" | "critical";

interface Metrics {
  uptime: number;
  activeUsers: number;
  databaseConnections: number;
  serverLoad: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  apiResponseTime: number;
  lastBackupAt: string;
  serverStatus: StatusLevel;
  databaseStatus: StatusLevel;
  overallStatus: StatusLevel;
  updatedAt: string;
}

const STATUS_STYLES: Record<StatusLevel, { icon: typeof CheckCircle; badge: string }> = {
  healthy: { icon: CheckCircle, badge: "bg-green-100 text-green-700" },
  warning: { icon: AlertTriangle, badge: "bg-yellow-100 text-yellow-700" },
  critical: { icon: AlertTriangle, badge: "bg-red-100 text-red-700" },
};

const INITIAL_METRICS: Metrics = {
  uptime: 99.97,
  activeUsers: 1977,
  databaseConnections: 18,
  serverLoad: 52,
  memoryUsage: 61,
  diskUsage: 72,
  networkLatency: 24,
  apiResponseTime: 210,
  lastBackupAt: new Date(Date.now() - 1000 * 60 * 37).toISOString(),
  serverStatus: "healthy",
  databaseStatus: "healthy",
  overallStatus: "healthy",
  updatedAt: new Date().toISOString(),
};

function isStatusLevel(value: unknown): value is StatusLevel {
  return value === "healthy" || value === "warning" || value === "critical";
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "Just now";
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function StatusPill({ status }: { status: StatusLevel }) {
  const config = STATUS_STYLES[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${config.badge}`}>
      <Icon className="h-3 w-3" />
      <span className="capitalize">{status}</span>
    </span>
  );
}

export function SystemHealthMonitor() {
  const [metrics, setMetrics] = React.useState<Metrics>(INITIAL_METRICS);
  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const fetchMetrics = React.useCallback(
    async (initial = false) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (initial) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const response = await fetch(METRICS_ENDPOINT, { cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          throw new Error((await response.text()) || "Unable to fetch system metrics");
        }

        const payload = (await response.json()) as Partial<Metrics>;
        if (controller.signal.aborted) return;

        setMetrics((previous) => ({
          uptime: typeof payload.uptime === "number" ? payload.uptime : previous.uptime,
          activeUsers: typeof payload.activeUsers === "number" ? payload.activeUsers : previous.activeUsers,
          databaseConnections:
            typeof payload.databaseConnections === "number" ? payload.databaseConnections : previous.databaseConnections,
          serverLoad: typeof payload.serverLoad === "number" ? payload.serverLoad : previous.serverLoad,
          memoryUsage: typeof payload.memoryUsage === "number" ? payload.memoryUsage : previous.memoryUsage,
          diskUsage: typeof payload.diskUsage === "number" ? payload.diskUsage : previous.diskUsage,
          networkLatency: typeof payload.networkLatency === "number" ? payload.networkLatency : previous.networkLatency,
          apiResponseTime:
            typeof payload.apiResponseTime === "number" ? payload.apiResponseTime : previous.apiResponseTime,
          lastBackupAt: typeof payload.lastBackupAt === "string" ? payload.lastBackupAt : previous.lastBackupAt,
          serverStatus: isStatusLevel(payload.serverStatus) ? payload.serverStatus : previous.serverStatus,
          databaseStatus: isStatusLevel(payload.databaseStatus) ? payload.databaseStatus : previous.databaseStatus,
          overallStatus: isStatusLevel(payload.overallStatus) ? payload.overallStatus : previous.overallStatus,
          updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : new Date().toISOString(),
        }));
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Failed to fetch system metrics";
        setError(message);
      } finally {
        if (controller.signal.aborted) return;
        if (initial) {
          setLoading(false);
        }
        setIsRefreshing(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    fetchMetrics(true);
    const interval = setInterval(() => fetchMetrics(false), 30_000);
    return () => {
      abortRef.current?.abort();
      clearInterval(interval);
    };
  }, [fetchMetrics]);

  const overallStatus = metrics.overallStatus ?? "healthy";
  const overallConfig = STATUS_STYLES[overallStatus];
  const OverallIcon = overallConfig.icon;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#2d682d]">System Health Monitor</h3>
          <p className="text-sm text-gray-600">Real-time system performance metrics</p>
          <p className="text-xs text-muted-foreground">Updated {formatRelativeTime(metrics.updatedAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${overallConfig.badge} border-0 flex items-center gap-1 px-3 py-1`}> 
            <OverallIcon className="h-4 w-4" />
            <span className="capitalize">{overallStatus}</span>
          </Badge>
          <Button
            onClick={() => fetchMetrics(false)}
            disabled={loading || isRefreshing}
            size="sm"
            variant="outline"
            className="border-[#2d682d]/20 bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {loading ? "Loading" : isRefreshing ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[#2d682d]/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">System Uptime</CardTitle>
              <Activity className="h-4 w-4 text-[#2d682d]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2d682d]">{formatPercent(metrics.uptime)}</div>
            <p className="text-xs text-gray-500 mt-1">Rolling 30 days</p>
          </CardContent>
        </Card>

        <Card className="border-[#2d682d]/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
              <Users className="h-4 w-4 text-[#2d682d]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2d682d]">{metrics.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card className="border-[#2d682d]/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">DB Connections</CardTitle>
              <Database className="h-4 w-4 text-[#2d682d]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2d682d]">{metrics.databaseConnections}</div>
            <p className="text-xs text-gray-500 mt-1">Active connections</p>
          </CardContent>
        </Card>

        <Card className="border-[#2d682d]/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Last Backup</CardTitle>
              <Server className="h-4 w-4 text-[#2d682d]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-[#2d682d]">{formatRelativeTime(metrics.lastBackupAt)}</div>
            <p className="text-xs text-gray-500 mt-1">Automated backup status</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-[#2d682d]/20">
          <CardHeader>
            <CardTitle className="text-[#2d682d] flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Server Performance
            </CardTitle>
            <CardDescription>Current resource utilisation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Server Load</span>
                <span>{metrics.serverLoad}%</span>
              </div>
              <Progress value={metrics.serverLoad} className="h-2" />
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Memory Usage</span>
                <span>{metrics.memoryUsage}%</span>
              </div>
              <Progress value={metrics.memoryUsage} className="h-2" />
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Disk Usage</span>
                <span>{metrics.diskUsage}%</span>
              </div>
              <Progress value={metrics.diskUsage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#2d682d]/20">
          <CardHeader>
            <CardTitle className="text-[#2d682d] flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Network & Connectivity
            </CardTitle>
            <CardDescription>Latency, API responsiveness and cluster status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Network Latency</span>
              <Badge variant="outline" className="border-[#2d682d]/30 text-[#2d682d]">
                {metrics.networkLatency} ms
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">API Response</span>
              <Badge variant="outline" className="border-[#2d682d]/30 text-[#2d682d]">
                {metrics.apiResponseTime} ms
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border border-[#2d682d]/15 bg-[#2d682d]/5 px-3 py-2 text-sm">
                <span>Server</span>
                <StatusPill status={metrics.serverStatus} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[#b29032]/15 bg-[#b29032]/5 px-3 py-2 text-sm">
                <span>Database</span>
                <StatusPill status={metrics.databaseStatus} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(loading || isRefreshing) && (
        <div className="flex items-center gap-2 text-sm text-[#2d682d]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loading ? "Loading live metrics..." : "Refreshing metrics..."}</span>
        </div>
      )}
    </div>
  );
}
