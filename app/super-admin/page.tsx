"use client";

import * as React from "react";

import SuperAdminDashboard from "@/components/super-admin-dashboard";
import { ActivityFeed } from "@/components/activity-feed";
import { FinancialReports } from "@/components/financial-reports";
import { NotificationCenter } from "@/components/notification-center";
import { QuickActionsPanel } from "@/components/quick-actions-panel";
import { SystemHealthMonitor } from "@/components/system-health-monitor";
import { SystemStatusIndicator } from "@/components/system-status-indicator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ACTION_META: Record<string, { label: string; description: string; tone: ActionTone }> = {
  "add-user": {
    label: "Launch user onboarding",
    description: "Initiate the guided flow for new administrators, staff or parents.",
    tone: "primary",
  },
  "system-reports": {
    label: "Open analytics reports",
    description: "Review tenant-wide performance, fees, and compliance dashboards.",
    tone: "info",
  },
  "system-settings": {
    label: "Review platform settings",
    description: "Adjust global preferences, authentication policies and integrations.",
    tone: "warning",
  },
  "notifications": {
    label: "Compose broadcast notification",
    description: "Send a message to all panels or targeted user groups.",
    tone: "success",
  },
};

type ActionTone = "primary" | "info" | "success" | "warning";

type ActionLogEntry = {
  id: string;
  actionId: string;
  label: string;
  description: string;
  tone: ActionTone;
  timestamp: string;
};

const ACTION_TONE_CLASSES: Record<ActionTone, string> = {
  primary: "bg-[#2d682d]/10 text-[#2d682d]",
  info: "bg-blue-50 text-blue-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
};

function formatRelative(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function SuperAdminPage() {
  const [actionHistory, setActionHistory] = React.useState<ActionLogEntry[]>([]);

  const handleQuickAction = React.useCallback((actionId: string) => {
    const meta = ACTION_META[actionId] ?? {
      label: "Custom action triggered",
      description: "This action is not yet wired to a workflow.",
      tone: "info" as ActionTone,
    };

    setActionHistory((previous) => {
      const entry: ActionLogEntry = {
        id: `${Date.now()}-${actionId}`,
        actionId,
        label: meta.label,
        description: meta.description,
        tone: meta.tone,
        timestamp: new Date().toISOString(),
      };

      return [entry, ...previous].slice(0, 5);
    });
  }, []);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Badge className="bg-[#2d682d]/10 text-[#2d682d] border-[#2d682d]/20">Super Admin</Badge>
        <h1 className="text-2xl font-bold text-[#2d682d]">Control Centre</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Maintain complete oversight of Victory Educational Academy’s multi-tenant environment. Review live metrics, respond to
          notifications, and coordinate financial and academic operations from a single command surface.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr] xl:grid-cols-[3fr_1.2fr]">
        <div className="space-y-6">
          <SuperAdminDashboard />
          <SystemHealthMonitor />
          <ActivityFeed userRole="super-admin" />
        </div>

        <div className="space-y-6">
          <QuickActionsPanel
            userRole="super-admin"
            onActionClick={handleQuickAction}
            className="border-[#2d682d]/20"
          />

          <Card className="border-[#2d682d]/20">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-[#2d682d]">Recent quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {actionHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Launch a quick action to see it logged here for traceability.</p>
              ) : (
                actionHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-[#2d682d]/15 bg-white/80 p-3 shadow-sm transition hover:border-[#2d682d]/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${ACTION_TONE_CLASSES[entry.tone]}`}>
                        {entry.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatRelative(entry.timestamp)}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{entry.description}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <SystemStatusIndicator />
          <NotificationCenter userRole="super-admin" />
        </div>
      </div>

      <FinancialReports userRole="super-admin" />
    </div>
  );
}
