"use client";

import { useState, useMemo } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Clock, Copy } from "lucide-react";
import { toPersianDigits, gregorianToJalali, PERSIAN_MONTHS } from "@/lib/jalali";
import { getActivityEventMeta } from "@/lib/design-tokens";

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

const FILTER_TABS = [
  { key: "all", label: "همه" },
  { key: "booking", label: "نوبت‌ها" },
  { key: "user", label: "کاربران" },
  { key: "payment", label: "پرداخت" },
  { key: "settings", label: "تنظیمات" },
];

function getEventConfig(eventType: string) {
  const meta = getActivityEventMeta(eventType);
  return { dot: meta.dot, label: meta.label };
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return toPersianDigits(`${h}:${m}`);
}

/** Jalali group header: "۲۱ شهریور" with year for non-current years. */
function formatJalaliDayHeader(isoString: string): string {
  const j = gregorianToJalali(new Date(isoString));
  const nowJ = gregorianToJalali(new Date());
  const base = `${toPersianDigits(j.jd)} ${PERSIAN_MONTHS[j.jm - 1]}`;
  return j.jy === nowJ.jy ? base : `${base} ${toPersianDigits(j.jy)}`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "امروز";
  if (date.toDateString() === yesterday.toDateString()) return "دیروز";

  return formatJalaliDayHeader(isoString);
}

/** Full Jalali timestamp for the detail modal: "۲۱ شهریور ۱۴۰۵، ۱۴:۳۰" */
function formatFullDate(isoString: string): string {
  const j = gregorianToJalali(new Date(isoString));
  const date = new Date(isoString);
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${toPersianDigits(j.jd)} ${PERSIAN_MONTHS[j.jm - 1]} ${toPersianDigits(j.jy)}، ${toPersianDigits(h)}:${toPersianDigits(min)}`;
}

/** Gregorian date key for grouping (stable across render). */
function dateKeyOf(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function groupByDate(logs: ActivityLogEntry[]): Map<string, ActivityLogEntry[]> {
  const groups = new Map<string, ActivityLogEntry[]>();
  for (const log of logs) {
    const dateKey = dateKeyOf(log.created_at);
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(log);
  }
  return groups;
}

function MetadataDisplay({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return <p className="t-s">اطلاعات اضافی موجود نیست</p>;

  return (
    <div>
      {entries.map(([key, value]) => (
        <div key={key} className="sum">
          <span className="mute">{key}</span>
          <span className="ltr" style={{ fontSize: 14 }}>{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

export function ActivityLog({ logs, counts, onFilterChange, activeFilter }: ActivityLogProps) {
  const [selectedLog, setSelectedLog] = useState<ActivityLogEntry | null>(null);
  const groupedLogs = useMemo(() => groupByDate(logs), [logs]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Filter tabs */}
      <div className="row" style={{ gap: 8, overflowX: "auto" }} role="group" aria-label="فیلتر فعالیت">
        {FILTER_TABS.map((tab) => {
          const count = counts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={activeFilter === tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={`chip num${activeFilter === tab.key ? " on" : ""}`}
              style={{ flex: "none" }}
            >
              {tab.label}
              {count > 0 && (
                <span className="mute">({toPersianDigits(count)})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Log entries */}
      {logs.length === 0 ? (
        <div className="panel center">
          <Clock size={28} strokeWidth={1.2} aria-hidden="true" style={{ margin: "0 auto 8px", color: "var(--faint)" }} />
          <p className="mute">فعالیتی ثبت نشده</p>
        </div>
      ) : (
        Array.from(groupedLogs.entries()).map(([dateKey, dateLogs]) => (
          <div key={dateKey}>
            <p className="t-s" style={{ marginBottom: 4 }}>
              {formatDate(dateLogs[0].created_at)}
            </p>
            <div className="list">
              {dateLogs.map((log) => {
                const config = getEventConfig(log.event_type);
                return (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setSelectedLog(log)}
                    className="row"
                    style={{ width: "100%", gap: 10, padding: "11px 0", textAlign: "start" }}
                  >
                    <span className={config.dot} style={{ width: 8, height: 8, borderRadius: "50%", flex: "none" }} aria-hidden="true" />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.description}</span>
                    </span>
                    <span className="badge tone-mute" style={{ flex: "none" }}>
                      {config.label}
                    </span>
                    <span className="t-s ltr num" style={{ flex: "none" }}>
                      {formatTime(log.created_at)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Detail Sheet */}
      <BottomSheet open={!!selectedLog} onClose={() => setSelectedLog(null)} title="جزئیات فعالیت">
        {selectedLog && (
          <div style={{ display: "grid", gap: 14 }}>
            {/* Event + Entity badges */}
            <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
              <span className="badge">
                {getEventConfig(selectedLog.event_type).label}
              </span>
              <span className="badge tone-mute">
                {selectedLog.entity_type}
              </span>
              {selectedLog.entity_id && (
                <span className="badge tone-mute ltr">
                  {selectedLog.entity_id.slice(0, 8)}...
                </span>
              )}
            </div>

            {/* Description */}
            <div>
              <p className="t-s">توضیحات</p>
              <p style={{ fontSize: 15, lineHeight: 1.9, marginTop: 2 }}>{selectedLog.description}</p>
            </div>

            {/* Timestamp */}
            <p className="t-s row num" style={{ gap: 8 }}>
              <Clock size={15} strokeWidth={1.5} aria-hidden="true" />
              <span className="ltr">{formatFullDate(selectedLog.created_at)}</span>
            </p>

            {/* Metadata */}
            <div>
              <p className="t-s" style={{ marginBottom: 4 }}>اطلاعات تکمیلی</p>
              <div className="panel">
                <MetadataDisplay metadata={selectedLog.metadata} />
              </div>
            </div>

            {/* Raw ID */}
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="t-s ltr" style={{ fontSize: 12 }}>{selectedLog.id}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(selectedLog.id)}
                className="btn ghost sm"
              >
                <Copy size={15} strokeWidth={1.5} />
                کپی
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
