"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { ActivityLog } from "@/components/owner/activity-log";
import { SalonGuard } from "@/components/ui/salon-guard";

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
  const [query, setQuery] = useState("");

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
    void fetchLogs(activeFilter);
  }, [activeFilter, fetchLogs]);

  const handleFilterChange = (type: string) => {
    setActiveFilter(type);
  };

  /* Client-side search over loaded logs + CSV export (v-2 خروجی CSV).
     Formula-leading cells are apostrophe-prefixed like the admin export so a
     crafted description cannot become a spreadsheet formula. */
  const trimmedQuery = query.trim();
  const visibleLogs = trimmedQuery
    ? logs.filter((l) =>
        l.description.includes(trimmedQuery)
        || l.event_type.includes(trimmedQuery)
        || (l.entity_id || "").includes(trimmedQuery))
    : logs;
  const exportCsv = () => {
    const cell = (v: unknown) => {
      const raw = String(v ?? "");
      const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
      return safe.includes(",") || safe.includes('"') || safe.includes("\n")
        ? `"${safe.replace(/"/g, '""')}"`
        : safe;
    };
    const rows = [
      ["time", "event_type", "entity_type", "entity_id", "description"].join(","),
      ...visibleLogs.map((l) => [l.created_at, l.event_type, l.entity_type, l.entity_id || "", l.description].map(cell).join(",")),
    ];
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "forehand-activity.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <SalonGuard>
      <div className="page-gutter space-y-3 pb-8 pt-2">
        <h2 className="h-m">فعالیت‌ها</h2>
        <div className="row" style={{ gap: 8 }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو در فعالیت‌ها"
            aria-label="جستجو در فعالیت‌ها"
            className="input"
            style={{ flex: 1, minWidth: 0 }}
          />
          <button
            type="button"
            onClick={exportCsv}
            disabled={visibleLogs.length === 0}
            className="btn gl sm"
            style={{ flex: "none" }}
          >
            خروجی CSV
          </button>
        </div>
        {loading ? (
          <div className="panel center">در حال بارگذاری...</div>
        ) : (
          <>
            <ActivityLog
              logs={visibleLogs}
              counts={counts}
              onFilterChange={handleFilterChange}
              activeFilter={activeFilter}
            />
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="btn gl block"
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
