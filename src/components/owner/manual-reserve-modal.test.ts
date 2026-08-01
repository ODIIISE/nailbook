import { describe, expect, it } from "vitest";
import { calculateEndTime, formatManualServiceLabel } from "./manual-reserve-modal";

describe("manual booking helpers", () => {
  it("formats a service name instead of exposing its id", () => {
    expect(formatManualServiceLabel({ name: "لمینت ناخن", duration_minutes: 60 })).toBe("لمینت ناخن · ۶۰ دقیقه");
    expect(formatManualServiceLabel(null)).toBe("خدمت را انتخاب کنید");
  });

  it("calculates an end time from a valid start and duration", () => {
    expect(calculateEndTime("12:00", 75)).toBe("13:15");
    expect(calculateEndTime("09:05", 30)).toBe("09:35");
  });

  it("rejects malformed times and appointments crossing midnight", () => {
    expect(calculateEndTime("9:00", 30)).toBe("");
    expect(calculateEndTime("23:30", 30)).toBe("");
    expect(calculateEndTime("24:00", 30)).toBe("");
  });

  it("does not allow a negative duration to move the end before the start", () => {
    expect(calculateEndTime("12:00", -30)).toBe("12:00");
  });
});
