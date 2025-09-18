"use client";

import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_ENDPOINT = "/api/super-admin/status";
const REFRESH_INTERVAL = 45_000;

type OperationalStatus = "operational" | "degraded" | "maintenance" | "outage";

type ServiceStatus = {
  id: string;
  name: string;
  status: OperationalStatus;
  summary: string;
  uptime: number;
  dependencies: string[];
  incidents: {
    open: number;
    total: number;
  };
  updatedAt: string;
};

type StatusSnapshot = {
  updatedAt: string;
  overallStatus: OperationalStatus;
  services: ServiceStatus[];
};

interface SystemStatusIndicatorProps {
  className?: string;
}

const STATUS_BADGES: Record<OperationalStatus, string> = {
  operational: "bg-[#2d682d]/10 text-[#2d682d]",
  degraded: "bg-amber-50 text-amber-700",
  maintenance: "bg-blue-50 text-blue-700",
  outage: "bg-red-50 text-red-700",
};

const STATUS_ICONS: Record<OperationalStatus, typeof CheckCircle> = {
  operational: CheckCircle,
  degraded: AlertTriangle,
  maintenance: Clock,
  outage: XCircle,
};

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

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function formatStatusLabel(status: OperationalStatus) {
  return status
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function SystemStatusIndicator({ className }: SystemStatusIndicatorProps) {
  const [snapshot, setSnapshot] = React.useState<StatusSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const fetchStatus = React.useCallback(async (initial = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (initial) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch(STATUS_ENDPOINT, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error((await response.text()) || "Unable to load system status");
      }

      const payload = (await response.json()) as Partial<StatusSnapshot>;
      if (controller.signal.aborted) return;

      const services = Array.isArray(payload.services) ? (payload.services as ServiceStatus[]) : [];
      const overallStatus: OperationalStatus = STATUS_BADGES[payload.overallStatus as OperationalStatus]
        ? (payload.overallStatus as OperationalStatus)
        : "operational";
      setSnapshot({
        updatedAt: payload.updatedAt ?? new Date().toISOString(),
        overallStatus,
        services,
      });
      setError(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load system status");
    } finally {
      if (controller.signal.aborted) return;
      if (initial) {
        setLoading(false);
      }
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStatus(true);
    const interval = setInterval(() => fetchStatus(false), REFRESH_INTERVAL);
    return () => {
      abortRef.current?.abort();
      clearInterval(interval);
    };
  }, [fetchStatus]);

  const refreshManually = React.useCallback(() => fetchStatus(false), [fetchStatus]);

  return (
    <Card className={className}>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#2d682d]">System Status</h3>
              {snapshot && (
                <Badge className={`px-2 py-1 text-xs font-medium ${STATUS_BADGES[snapshot.overallStatus]}`}>
                  {formatStatusLabel(snapshot.overallStatus)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {snapshot
                ? `Updated ${formatRelativeTime(snapshot.updatedAt)}`
                : "Live health view of Victory Educational Academy core services"}
            </p>
          </div>
          <Button
            onClick={refreshManually}
            variant="outline"
            size="sm"
            disabled={loading || isRefreshing}
            className="self-start border-[#2d682d]/20 bg-transparent"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {loading ? "Loading" : isRefreshing ? "Refreshing" : "Refresh"}
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {loading && !snapshot ? (
          <div className="flex h-32 items-center justify-center gap-2 text-[#2d682d]">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading system status…</span>
          </div>
        ) : !snapshot ? null : snapshot.services.length === 0 ? (
          <div className="flex h-28 flex-col items-center justify-center text-sm text-muted-foreground">
            <AlertCircle className="mb-2 h-5 w-5" />
            <span>No monitored services available.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {snapshot.services.map((service) => {
              const Icon = STATUS_ICONS[service.status];
              const badgeClass = STATUS_BADGES[service.status];
              return (
                <div
                  key={service.id}
                  className="rounded-lg border border-[#2d682d]/15 bg-white/80 p-3 shadow-sm transition hover:border-[#2d682d]/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#2d682d]/10 text-[#2d682d]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-[#2d682d]">{service.name}</h4>
                        <p className="mt-1 text-xs text-muted-foreground">{service.summary}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`px-2 py-1 text-xs font-medium ${badgeClass}`}>
                        {formatStatusLabel(service.status)}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">Uptime {formatPercent(service.uptime)}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {service.incidents.open > 0
                        ? `${service.incidents.open} open incident${service.incidents.open === 1 ? "" : "s"}`
                        : "No open incidents"}
                    </span>
                    {service.dependencies.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        Depends on {service.dependencies.join(", ")}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Updated {formatRelativeTime(service.updatedAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
