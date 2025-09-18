"use client";

import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BookOpen,
  Check,
  CheckCircle,
  DollarSign,
  Info,
  Loader2,
  User,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const ENDPOINTS: Record<string, string> = {
  "super-admin": "/api/super-admin/notifications",
  admin: "/api/admin/notifications",
  librarian: "/api/admin/notifications",
};
const POLL_INTERVAL = 90_000;

function resolveEndpoint(role: string | undefined) {
  if (!role) return ENDPOINTS["super-admin"];
  return ENDPOINTS[role] ?? ENDPOINTS["super-admin"];
}

type NotificationType = "info" | "success" | "warning" | "error";

type NotificationCategory = "system" | "academic" | "payment" | "user" | "security";

type NotificationAction =
  | "mark-read"
  | "mark-unread"
  | "mark-all-read"
  | "mark-all-unread"
  | "archive";

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  category: NotificationCategory;
  actionRequired?: boolean;
  readAt?: string | null;
}

interface NotificationCenterProps {
  userRole: string;
}

const TYPE_CLASSES: Record<NotificationType, string> = {
  info: "text-blue-600 bg-blue-50 border-blue-200",
  success: "text-green-600 bg-green-50 border-green-200",
  warning: "text-yellow-600 bg-yellow-50 border-yellow-200",
  error: "text-red-600 bg-red-50 border-red-200",
};

const CATEGORY_ICONS: Partial<Record<NotificationCategory, typeof User>> = {
  payment: DollarSign,
  academic: BookOpen,
  user: User,
  security: AlertTriangle,
};

function getIcon(type: NotificationType, category: NotificationCategory) {
  if (CATEGORY_ICONS[category]) {
    return CATEGORY_ICONS[category]!;
  }
  switch (type) {
    case "success":
      return CheckCircle;
    case "warning":
      return AlertTriangle;
    case "error":
      return AlertCircle;
    default:
      return Info;
  }
}

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

export function NotificationCenter({ userRole }: NotificationCenterProps) {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [showUnreadOnly, setShowUnreadOnly] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [isMutating, setIsMutating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const endpoint = React.useMemo(() => resolveEndpoint(userRole), [userRole]);

  const fetchNotifications = React.useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const url = userRole ? `${endpoint}?role=${encodeURIComponent(userRole)}` : endpoint;
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!response.ok) {
        throw new Error((await response.text()) || "Unable to load notifications");
      }

      const payload = await response.json();
      if (controller.signal.aborted) return;
      const items = Array.isArray(payload.notifications)
        ? (payload.notifications as NotificationItem[])
        : [];
      const sorted = items
        .slice()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(sorted);
      setError(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [endpoint, userRole]);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => {
      abortRef.current?.abort();
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const mutateNotifications = React.useCallback(
    async (action: NotificationAction, ids?: string[]) => {
      setIsMutating(true);
      try {
        const response = await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ids, role: userRole }),
        });
        if (!response.ok) {
          throw new Error((await response.text()) || "Notification update failed");
        }

        const payload = await response.json();
        const items = Array.isArray(payload.notifications)
          ? (payload.notifications as NotificationItem[])
          : [];
        const sorted = items
          .slice()
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setNotifications(sorted);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Notification update failed");
      } finally {
        setIsMutating(false);
      }
    },
    [endpoint, userRole],
  );

  const markAsRead = React.useCallback((id: string) => mutateNotifications("mark-read", [id]), [mutateNotifications]);
  const markAsUnread = React.useCallback((id: string) => mutateNotifications("mark-unread", [id]), [mutateNotifications]);
  const markAllAsRead = React.useCallback(() => mutateNotifications("mark-all-read"), [mutateNotifications]);
  const archiveNotification = React.useCallback((id: string) => mutateNotifications("archive", [id]), [mutateNotifications]);

  const unreadNotifications = notifications.filter((notification) => !notification.read);
  const filteredNotifications = showUnreadOnly ? unreadNotifications : notifications;

  return (
    <Card className="border-[#2d682d]/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="h-5 w-5 text-[#2d682d]" />
              {unreadNotifications.length > 0 && (
                <Badge className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center bg-red-500 text-white text-xs">
                  {unreadNotifications.length}
                </Badge>
              )}
            </div>
            <CardTitle className="text-[#2d682d]">Notifications</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowUnreadOnly((prev) => !prev)}
              variant="outline"
              size="sm"
              disabled={loading || isMutating}
              className="border-[#2d682d]/20"
            >
              {showUnreadOnly ? "Show All" : "Unread Only"}
            </Button>
            <Button
              onClick={markAllAsRead}
              variant="outline"
              size="sm"
              disabled={loading || isMutating || unreadNotifications.length === 0}
              className="border-[#2d682d]/20 bg-transparent"
            >
              <Check className="mr-1 h-4 w-4" />
              Mark All Read
            </Button>
          </div>
        </div>
        <CardDescription>
          {loading && notifications.length === 0
            ? "Loading notifications..."
            : unreadNotifications.length > 0
              ? `${unreadNotifications.length} unread notifications`
              : "All notifications are up to date"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {loading && notifications.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-[#2d682d]">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Loading notifications...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <Bell className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No notifications to display</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {filteredNotifications.map((notification) => {
                const Icon = getIcon(notification.type, notification.category);
                const colorClass = TYPE_CLASSES[notification.type];

                return (
                  <div
                    key={notification.id}
                    className={`rounded-lg border p-4 transition-all duration-200 ${
                      notification.read ? "bg-gray-50 border-gray-200" : "bg-white border-[#2d682d]/20 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-semibold text-[#2d682d]">{notification.title}</h4>
                            <span className="text-xs text-muted-foreground">{formatTimestamp(notification.timestamp)}</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                          {notification.actionRequired && (
                            <Badge className="mt-2 w-fit bg-[#b29032]/10 text-[#b29032] border-[#b29032]/20">Action Required</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {!notification.read ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isMutating}
                            onClick={() => markAsRead(notification.id)}
                            className="text-[#2d682d]"
                          >
                            Mark Read
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isMutating}
                            onClick={() => markAsUnread(notification.id)}
                            className="text-[#2d682d]"
                          >
                            Unread
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isMutating}
                          onClick={() => archiveNotification(notification.id)}
                          className="text-red-500"
                        >
                          <X className="mr-1 h-4 w-4" />
                          Archive
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
