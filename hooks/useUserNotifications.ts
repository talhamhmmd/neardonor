import { useState, useCallback, useEffect } from "react";
import { supabase } from "../services/supabase";
import { toUserFacingMessage } from "../lib/errors";
import type { UserNotification } from "../types";

const PAGE_SIZE = 50;

/**
 * Notification-center inbox (user_notifications). Read/unread aware, with
 * pagination and an unread count. Read state changes through the
 * server-side mark_notification_read RPC.
 */
export function useUserNotifications() {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadUnreadCount = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const { count, error: err } = await supabase
      .from("user_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    if (!err) setUnreadCount(count ?? 0);
  }, []);

  const fetchNotifications = useCallback(
    async (page = 0) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      setLoading(page === 0);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("user_notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (err) {
          setError(toUserFacingMessage(err));
          return;
        }
        const rows = (data as UserNotification[]) ?? [];
        setNotifications((prev) =>
          page === 0 ? rows : [...prev, ...rows],
        );
        setHasMore(rows.length === PAGE_SIZE);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchNotifications(0), loadUnreadCount()]);
  }, [fetchNotifications, loadUnreadCount]);

  const markRead = useCallback(async (notificationId: string) => {
    const { error: err } = await supabase.rpc("mark_notification_read", {
      p_notification_id: notificationId,
    });
    if (err) throw err;

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId && !n.is_read
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    notifications,
    loading,
    refreshing,
    error,
    unreadCount,
    hasMore,
    fetchNotifications,
    refresh,
    markRead,
    loadUnreadCount,
  };
}
