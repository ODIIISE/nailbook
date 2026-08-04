import { describe, expect, it } from "vitest";
import { applyPinInputValue } from "./pin-input";

describe("applyPinInputValue", () => {
  it("keeps digits in visual left-to-right order", () => {
    expect(applyPinInputValue(["", "", "", "", "", ""], 0, "123456", 6)).toEqual([
      "1", "2", "3", "4", "5", "6",
    ]);
  });

  it("normalizes Persian and Arabic digits", () => {
    expect(applyPinInputValue(["", "", "", "", "", ""], 0, "۱۲۳۴۵۶", 6)).toEqual([
      "1", "2", "3", "4", "5", "6",
    ]);
  });

  it("fills from the focused cell without exceeding the PIN length", () => {
    expect(applyPinInputValue(["1", "", "", "", "", ""], 1, "234567", 6)).toEqual([
      "1", "2", "3", "4", "5", "6",
    ]);
  });

  it("clears the focused cell when the value is empty", () => {
    expect(applyPinInputValue(["1", "2", "3", "", "", ""], 1, "", 6)).toEqual([
      "1", "", "3", "", "", "",
    ]);
  });
});
