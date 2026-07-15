import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @vercel/postgres
const mockSql = vi.fn();
vi.mock("@vercel/postgres", () => ({
  sql: (...args: unknown[]) => mockSql(...args),
}));

describe("POST /api/auth/check-phone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return exists: true and hasPin: true for registered phone with PIN", async () => {
    mockSql.mockResolvedValue({ rows: [{ id: "user-1", has_pin: true }] });

    const request = new Request("http://localhost/api/auth/check-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "09123456789" }),
    });

    const { POST } = await import("./route");
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    const data = await response.json();

    expect(data.exists).toBe(true);
    expect(data.hasPin).toBe(true);
  });

  it("should return exists: true and hasPin: false for registered phone without PIN", async () => {
    mockSql.mockResolvedValue({ rows: [{ id: "user-1", has_pin: false }] });

    const request = new Request("http://localhost/api/auth/check-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "09123456789" }),
    });

    const { POST } = await import("./route");
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    const data = await response.json();

    expect(data.exists).toBe(true);
    expect(data.hasPin).toBe(false);
  });

  it("should return exists: false for unregistered phone", async () => {
    mockSql.mockResolvedValue({ rows: [] });

    const request = new Request("http://localhost/api/auth/check-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "09999999999" }),
    });

    const { POST } = await import("./route");
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    const data = await response.json();

    expect(data.exists).toBe(false);
    expect(data.hasPin).toBe(false);
  });

  it("should return exists: false on database error", async () => {
    mockSql.mockRejectedValue(new Error("DB connection failed"));

    const request = new Request("http://localhost/api/auth/check-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "09123456789" }),
    });

    const { POST } = await import("./route");
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    const data = await response.json();

    expect(data.exists).toBe(false);
    expect(data.hasPin).toBe(false);
  });

  it("should return 400 for missing phone", async () => {
    const request = new Request("http://localhost/api/auth/check-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const { POST } = await import("./route");
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
  });
});
