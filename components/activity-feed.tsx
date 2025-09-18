"use client";

import * as React from "react";
import { AlertCircle, BookOpen, CheckCircle, DollarSign, FileText, Loader2, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const ENDPOINTS: Record<string, string> = {
  "super-admin": "/api/super-admin/activity",
  admin: "/api/admin/activity",
  librarian: "/api/super-admin/activity",
};

function resolveEndpoint(role: string | undefined) {
  if (!role) return ENDPOINTS["super-admin"];
  return ENDPOINTS[role] ?? ENDPOINTS["super-admin"];
}
const POLL_INTERVAL = 60_000;

type ActivityType = "user" | "report" | "payment" | "assignment" | "system" | "security";

type ActivityPriority = "low" | "medium" | "high";

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  priority: ActivityPriority;
  user?: string;
}

interface ActivityFeedProps {
  userRole: string;
  className?: string;
}

const TYPE_ICONS: Record<ActivityType, typeof User> = {
  user: User,
  report: FileText,
  payment: DollarSign,
  assignment: BookOpen,
  system: CheckCircle,
  security: AlertCircle,
};

const PRIORITY_STYLES: Record<ActivityPriority, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function ActivityFeed({ userRole, className }: ActivityFeedProps) {
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const endpoint = React.useMemo(() => resolveEndpoint(userRole), [userRole]);

  const fetchActivities = React.useCallback(
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
        const params = new URLSearchParams({ limit: "15" });
        if (userRole) {
          params.set("role", userRole);
        }

        const response = await fetch(`${endpoint}?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error((await response.text()) || "Unable to fetch activity feed");
        }

        const payload = await response.json();
        if (controller.signal.aborted) return;

        const items = Array.isArray(payload.activities) ? (payload.activities as ActivityItem[]) : [];
        const sorted = items
          .slice()
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setActivities(sorted);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Failed to load activity feed";
        setError(message);
      } finally {
        if (controller.signal.aborted) return;
        if (initial) {
          setLoading(false);
        }
        setIsRefreshing(false);
      }
    },
    [endpoint, userRole],
  );

  React.useEffect(() => {
    fetchActivities(true);
    const interval = setInterval(() => fetchActivities(false), POLL_INTERVAL);
    return () => {
      abortRef.current?.abort();
      clearInterval(interval);
    };
  }, [fetchActivities]);

  const refreshManually = React.useCallback(() => fetchActivities(false), [fetchActivities]);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-[#2d682d]">Recent Activity</CardTitle>
          <p className="text-xs text-muted-foreground">Key events that require Super Admin attention</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={refreshManually}
          disabled={loading || isRefreshing}
          className="border-[#2d682d]/20 bg-transparent"
        >
          <Loader2 className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {loading ? "Loading" : isRefreshing ? "Refreshing" : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-10 text-center text-red-600">
            <AlertCircle className="h-10 w-10" />
            <p className="text-sm font-medium">{error}</p>
            <Button onClick={() => fetchActivities(true)} size="sm" className="bg-[#2d682d] hover:bg-[#2d682d]/90">
              Retry
            </Button>
          </div>
        ) : loading && activities.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-[#2d682d]">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Loading activity...</span>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {activities.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <AlertCircle className="mx-auto mb-3 h-10 w-10 opacity-50" />
                  <p>No activity recorded yet.</p>
                </div>
              ) : (
                activities.map((activity) => {
                  const Icon = TYPE_ICONS[activity.type] ?? AlertCircle;
                  const priorityClass = PRIORITY_STYLES[activity.priority] ?? PRIORITY_STYLES.low;

                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 rounded-lg border border-[#2d682d]/15 bg-white p-4 shadow-sm"
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#2d682d]/10 text-[#2d682d]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-[#2d682d]">{activity.title}</h4>
                            <p className="text-xs text-muted-foreground">{activity.user || "System"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${priorityClass} border-0`}>{activity.priority}</Badge>
                            <span className="text-xs text-muted-foreground">{formatTimestamp(activity.timestamp)}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
