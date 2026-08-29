"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { ActivityLog } from "@/components/owner/activity-log";
import { SalonGuard } from "@/components/ui/salon-guard";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityLogEntry {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ all: 0 });
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchLogs = useCallback(async (type: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/owner/activity-logs?type=${type}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setCounts(data.counts || { all: 0 });
        // A full page means older history may exist behind the server cap.
        setHasMore((data.logs || []).length >= 200);
      }
    } catch {
      toast.error("خطا در دریافت لاگ‌ها");
    } finally {
      setLoading(false);
    }
  }, []);

  // Cursor pagination: older history was previously unreachable beyond the
  // server's 200-row page. The request-id ref discards stale responses so a
  // slow loadMore for a previous filter cannot append wrong-filter rows.
  const loadMoreRequestRef = useRef(0);
  const loadMore = useCallback(async () => {
    const oldest = logs[logs.length - 1];
    if (!oldest || loadingMore) return;
    const requestId = ++loadMoreRequestRef.current;
    const filterAtStart = activeFilter;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/owner/activity-logs?type=${filterAtStart}&before=${encodeURIComponent(oldest.created_at)}`,
        { credentials: "include" }
      );
      if (requestId !== loadMoreRequestRef.current || activeFilter !== filterAtStart) return;
      if (res.ok) {
        const data = await res.json();
        const more: ActivityLogEntry[] = data.logs || [];
        setLogs((prev) => [...prev, ...more]);
        setHasMore(more.length >= 200);
      }
    } catch {
      if (requestId === loadMoreRequestRef.current) toast.error("خطا در دریافت لاگ‌های قدیمی‌تر");
    } finally {
      if (requestId === loadMoreRequestRef.current) setLoadingMore(false);
    }
  }, [logs, activeFilter, loadingMore]);

  useEffect(() => {
    // Fetching initial/filtered data is the standard data-loading pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs(activeFilter);
  }, [activeFilter, fetchLogs]);

  const handleFilterChange = (type: string) => {
    setActiveFilter(type);
  };

  return (
    <SalonGuard>
      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <ActivityLog
              logs={logs}
              counts={counts}
              onFilterChange={handleFilterChange}
              activeFilter={activeFilter}
            />
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-2.5 mt-3 rounded-xl border border-border text-caption font-bold text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                {loadingMore ? "در حال بارگذاری…" : "نمایش لاگ‌های قدیمی‌تر"}
              </button>
            )}
          </>
        )}
      </div>
    </SalonGuard>
  );
}
