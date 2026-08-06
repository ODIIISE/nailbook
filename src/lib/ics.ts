/**
 * Add-to-calendar helpers (real, not decorative).
 *
 * Times are treated as Tehran wall-clock times: the booking engine works in
 * Asia/Tehran, so we write the local time into the ICS with an explicit
 * TZID=Asia/Tehran and let the calendar app convert to the user's zone.
 */

export interface CalendarEvent {
  title: string;
  start: string; // "YYYY-MM-DDTHH:mm" — Tehran wall clock
  end: string;   // "YYYY-MM-DDTHH:mm" — Tehran wall clock
  location?: string;
  description?: string;
}

/** Escape text per RFC 5545 (backslash, comma, semicolon, newlines). */
function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function formatIcsDateTime(dt: string): string {
  // "2026-08-07T10:00" → "20260807T100000"
  const [date, time] = dt.split("T");
  const [y, m, d] = date.split("-");
  const [hh, mm] = time.split(":");
  return `${y}${m}${d}T${hh}${mm}00`;
}

/** Build a RFC-5545 .ics document for a single event. */
export function buildIcs(event: CalendarEvent): string {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}@nailbook`;
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nailbook//Booking//FA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Asia/Tehran:${formatIcsDateTime(event.start)}`,
    `DTEND;TZID=Asia/Tehran:${formatIcsDateTime(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** Download the event as an .ics file the phone calendar can open. */
export function downloadIcs(event: CalendarEvent): void {
  const blob = new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "rezerv-rasto.ics";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Google Calendar "create event" link. */
export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatIcsDateTime(event.start).replace("T", "T")}/${formatIcsDateTime(event.end).replace("T", "T")}`,
    ctz: "Asia/Tehran",
  });
  if (event.location) params.set("location", event.location);
  if (event.description) params.set("details", event.description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
