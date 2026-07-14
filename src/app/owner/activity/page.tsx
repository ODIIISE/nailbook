"use client";

import { useState, useEffect, useCallback } from "react";
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
      }
    } catch (error) {
      console.error("Failed to fetch activity logs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <ActivityLog
            logs={logs}
            counts={counts}
            onFilterChange={handleFilterChange}
            activeFilter={activeFilter}
          />
        )}
      </div>
    </SalonGuard>
  );
}
