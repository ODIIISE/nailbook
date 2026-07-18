"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { User, Ban, Clock, CreditCard, Calendar, Settings, UserPlus, Trash2, Edit3, Plus, XCircle } from "lucide-react";
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

const EVENT_CONFIG: Record<string, { icon: typeof User; colorClass: string }> = {
  booking_created: { icon: Calendar, colorClass: "bg-[#E8F5E9] text-[#2E7D32]" },
  booking_cancelled: { icon: XCircle, colorClass: "bg-[#FFEBEE] text-[#C62828]" },
  payment_received: { icon: CreditCard, colorClass: "bg-[#FFF3E0] text-[#E65100]" },
  user_registered: { icon: UserPlus, colorClass: "bg-[#E3F2FD] text-[#1565C0]" },
  user_deleted: { icon: Trash2, colorClass: "bg-[#FFEBEE] text-[#C62828]" },
  service_created: { icon: Plus, colorClass: "bg-[#F3E5F5] text-[#7B1FA2]" },
  service_updated: { icon: Edit3, colorClass: "bg-[#F3E5F5] text-[#7B1FA2]" },
  service_deleted: { icon: Trash2, colorClass: "bg-[#FFEBEE] text-[#C62828]" },
  addon_created: { icon: Plus, colorClass: "bg-[#F3E5F5] text-[#7B1FA2]" },
  addon_updated: { icon: Edit3, colorClass: "bg-[#F3E5F5] text-[#7B1FA2]" },
  addon_deleted: { icon: Trash2, colorClass: "bg-[#FFEBEE] text-[#C62828]" },
  time_blocked: { icon: Ban, colorClass: "bg-[#FFF8E1] text-[#F57F17]" },
  time_unblocked: { icon: Clock, colorClass: "bg-[#FFF8E1] text-[#F57F17]" },
  hours_updated: { icon: Settings, colorClass: "bg-[#ECEFF1] text-[#455A64]" },
  salon_updated: { icon: Settings, colorClass: "bg-[#ECEFF1] text-[#455A64]" },
};

const FILTER_TABS = [
  { key: "all", label: "همه" },
  { key: "booking", label: "نوبت‌ها" },
  { key: "user", label: "کاربران" },
  { key: "payment", label: "پرداخت" },
  { key: "settings", label: "تنظیمات" },
];

function getEventConfig(eventType: string) {
  return EVENT_CONFIG[eventType] || { icon: Clock, colorClass: "bg-gray-100 text-gray-500" };
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return toPersianDigits(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "امروز";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "دیروز";
  }

  const day = date.getDate();
  const month = date.getMonth() + 1;
  return `${toPersianDigits(day)}/${toPersianDigits(month)}`;
}

function groupByDate(logs: ActivityLogEntry[]): Map<string, ActivityLogEntry[]> {
  const groups = new Map<string, ActivityLogEntry[]>();

  for (const log of logs) {
    const dateKey = new Date(log.created_at).toDateString();
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(log);
  }

  return groups;
}

export function ActivityLog({ logs, counts, onFilterChange, activeFilter }: ActivityLogProps) {
  const groupedLogs = useMemo(() => groupByDate(logs), [logs]);

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {FILTER_TABS.map((tab) => {
          const count = counts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap border transition-colors ${
                activeFilter === tab.key
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-muted-foreground border-black/[0.08] hover:bg-black/[0.02]"
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
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-[15px]">فعالیتی ثبت نشده</p>
        </div>
      ) : (
        Array.from(groupedLogs.entries()).map(([dateKey, dateLogs]) => (
          <div key={dateKey}>
            <p className="text-[12px] font-semibold text-muted-foreground mb-2 px-1">
              {formatDate(dateLogs[0].created_at)}
            </p>
            <div className="space-y-2">
              {dateLogs.map((log) => {
                const config = getEventConfig(log.event_type);
                const Icon = config.icon;

                return (
                  <div
                    key={log.id}
                    className="flex gap-3 p-3.5 bg-white border border-black/[0.04] items-start"
                  >
                    <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${config.colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-black leading-snug">
                        {log.description}
                      </p>
                    </div>
                    <span className="text-[11px] text-black/40 whitespace-nowrap shrink-0 mt-0.5">
                      {formatTime(log.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
