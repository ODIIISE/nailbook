"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Ban, Clock, CreditCard, Calendar, Settings, UserPlus, Trash2, Edit3, Plus, XCircle, Copy } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";

interface ActivityLogEntry {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ActivityLogProps {
  logs: ActivityLogEntry[];
  counts: Record<string, number>;
  onFilterChange: (type: string) => void;
  activeFilter: string;
}

const EVENT_CONFIG: Record<string, { icon: typeof User; dot: string; label: string }> = {
  booking_created: { icon: Calendar, dot: "bg-green-500", label: "نوبت" },
  booking_cancelled: { icon: XCircle, dot: "bg-red-500", label: "نوبت" },
  booking_deleted: { icon: Trash2, dot: "bg-red-500", label: "نوبت" },
  payment_received: { icon: CreditCard, dot: "bg-orange-500", label: "پرداخت" },
  payment_reverted: { icon: CreditCard, dot: "bg-orange-500", label: "پرداخت" },
  user_registered: { icon: UserPlus, dot: "bg-blue-500", label: "کاربر" },
  user_updated: { icon: Edit3, dot: "bg-blue-500", label: "کاربر" },
  user_deleted: { icon: Trash2, dot: "bg-red-500", label: "کاربر" },
  user_login: { icon: User, dot: "bg-blue-500", label: "ورود" },
  user_pin_reset: { icon: Edit3, dot: "bg-blue-500", label: "کاربر" },
  service_created: { icon: Plus, dot: "bg-purple-500", label: "خدمت" },
  service_updated: { icon: Edit3, dot: "bg-purple-500", label: "خدمت" },
  service_deleted: { icon: Trash2, dot: "bg-red-500", label: "خدمت" },
  addon_created: { icon: Plus, dot: "bg-purple-500", label: "افزودنی" },
  addon_updated: { icon: Edit3, dot: "bg-purple-500", label: "افزودنی" },
  addon_deleted: { icon: Trash2, dot: "bg-red-500", label: "افزودنی" },
  highlight_uploaded: { icon: Plus, dot: "bg-pink-500", label: "هایلایت" },
  logo_updated: { icon: Edit3, dot: "bg-gray-500", label: "لوگو" },
  time_blocked: { icon: Ban, dot: "bg-yellow-500", label: "زمان" },
  time_unblocked: { icon: Clock, dot: "bg-yellow-500", label: "زمان" },
  hours_updated: { icon: Settings, dot: "bg-gray-500", label: "ساعات" },
  salon_updated: { icon: Settings, dot: "bg-gray-500", label: "سالن" },
  database_migrated: { icon: Settings, dot: "bg-gray-500", label: "سیستم" },
  owner_login: { icon: User, dot: "bg-blue-500", label: "ورود" },
};

const FILTER_TABS = [
  { key: "all", label: "همه" },
  { key: "booking", label: "نوبت‌ها" },
  { key: "user", label: "کاربران" },
  { key: "payment", label: "پرداخت" },
  { key: "settings", label: "تنظیمات" },
];

function getEventConfig(eventType: string) {
  return EVENT_CONFIG[eventType] || { icon: Clock, dot: "bg-gray-400", label: "سیستم" };
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return toPersianDigits(`${h}:${m}`);
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "امروز";
  if (date.toDateString() === yesterday.toDateString()) return "دیروز";

  const day = date.getDate();
  const month = date.getMonth() + 1;
  return `${toPersianDigits(day)}/${toPersianDigits(month)}`;
}

function formatFullDate(isoString: string): string {
  const date = new Date(isoString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${toPersianDigits(y)}/${toPersianDigits(m)}/${toPersianDigits(d)} — ${toPersianDigits(h)}:${toPersianDigits(min)}`;
}

function groupByDate(logs: ActivityLogEntry[]): Map<string, ActivityLogEntry[]> {
  const groups = new Map<string, ActivityLogEntry[]>();
  for (const log of logs) {
    const dateKey = new Date(log.created_at).toDateString();
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(log);
  }
  return groups;
}

function MetadataDisplay({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata).filter(([_, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return <p className="text-[12px] text-muted-foreground">اطلاعات اضافی موجود نیست</p>;

  return (
    <div className="space-y-1.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center justify-between py-1 border-b border-black/[0.04] last:border-0">
          <span className="text-[11px] text-muted-foreground">{key}</span>
          <span className="text-[12px] font-medium text-foreground" dir="ltr">{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

export function ActivityLog({ logs, counts, onFilterChange, activeFilter }: ActivityLogProps) {
  const [selectedLog, setSelectedLog] = useState<ActivityLogEntry | null>(null);
  const groupedLogs = useMemo(() => groupByDate(logs), [logs]);

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {FILTER_TABS.map((tab) => {
          const count = counts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors ${
                activeFilter === tab.key
                  ? "bg-primary text-white"
                  : "bg-white text-muted-foreground border border-black/[0.06]"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="text-[10px] opacity-60 mr-1">({toPersianDigits(count)})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Log entries */}
      {logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-[13px]">فعالیتی ثبت نشده</p>
        </div>
      ) : (
        Array.from(groupedLogs.entries()).map(([dateKey, dateLogs]) => (
          <div key={dateKey}>
            <p className="text-[11px] font-semibold text-muted-foreground mb-1 px-0.5">
              {formatDate(dateLogs[0].created_at)}
            </p>
            <div className="divide-y divide-black/[0.04] bg-white border border-black/[0.04] overflow-hidden">
              {dateLogs.map((log) => {
                const config = getEventConfig(log.event_type);
                return (
                  <button
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-black/[0.02] transition-colors text-right"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-foreground truncate leading-tight">{log.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground/60 bg-black/[0.03] px-1.5 py-0.5 rounded">
                        {config.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50" dir="ltr">
                        {formatTime(log.created_at)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px]">جزئیات فعالیت</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              {/* Event + Entity badges */}
              <div className="flex gap-2 flex-wrap">
                <span className="text-[11px] font-medium bg-primary/10 text-primary px-2 py-1 rounded-md">
                  {getEventConfig(selectedLog.event_type).label}
                </span>
                <span className="text-[11px] font-medium bg-black/[0.04] text-muted-foreground px-2 py-1 rounded-md">
                  {selectedLog.entity_type}
                </span>
                {selectedLog.entity_id && (
                  <span className="text-[10px] font-mono text-muted-foreground/60 bg-black/[0.03] px-2 py-1 rounded-md">
                    {selectedLog.entity_id.slice(0, 8)}...
                  </span>
                )}
              </div>

              {/* Description */}
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">توضیحات</p>
                <p className="text-[13px] text-foreground leading-relaxed">{selectedLog.description}</p>
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span dir="ltr">{formatFullDate(selectedLog.created_at)}</span>
              </div>

              {/* Metadata */}
              <div>
                <p className="text-[11px] text-muted-foreground mb-2">اطلاعات تکمیلی</p>
                <div className="bg-black/[0.02] rounded-lg p-3">
                  <MetadataDisplay metadata={selectedLog.metadata} />
                </div>
              </div>

              {/* Raw ID */}
              <div className="flex items-center justify-between pt-2 border-t border-black/[0.04]">
                <span className="text-[10px] text-muted-foreground/40 font-mono">{selectedLog.id}</span>
                <button
                  onClick={() => navigator.clipboard?.writeText(selectedLog.id)}
                  className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  کپی
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
