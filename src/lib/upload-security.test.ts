import { describe, expect, it } from "vitest";
import {
  detectImageType,
  detectVideoType,
  extensionFor,
  videoExtensionFor,
} from "./upload-security";

/** Build a buffer that starts with the given ASCII header. */
const head = (ascii: string, extra = 0): ArrayBuffer => {
  const bytes = new Uint8Array(12 + extra);
  for (let i = 0; i < ascii.length; i++) bytes[i] = ascii.charCodeAt(i);
  return bytes.buffer;
};

describe("detectVideoType — container magic, not the client's MIME type", () => {
  it("accepts a real ISO-BMFF (mp4) container", () => {
    expect(detectVideoType(head("....ftypisom"))).toBe("video/mp4");
    expect(detectVideoType(head("....ftypmp42"))).toBe("video/mp4");
    expect(detectVideoType(head("....ftypavc1"))).toBe("video/mp4");
  });

  it("accepts WebM (EBML magic)", () => {
    expect(detectVideoType(head("\x1aE\xdf\xa3"))).toBe("video/webm");
  });

  it("rejects a PNG renamed to .mp4 — the allow-list must survive a re-upload", () => {
    expect(detectVideoType(head("\x89PNG\r\n\x1a\n"))).toBeNull();
  });

  it("rejects GIF, ZIP-ish and empty input", () => {
    expect(detectVideoType(head("GIF89a"))).toBeNull();
    expect(detectVideoType(head("PK\x03\x04"))).toBeNull();
    expect(detectVideoType(new ArrayBuffer(0))).toBeNull();
    expect(detectVideoType(head("....ftypqt  "))).toBeNull(); // QuickTime
  });

  it("maps sniffed types to extensions", () => {
    expect(videoExtensionFor("video/mp4")).toBe("mp4");
    expect(videoExtensionFor("video/webm")).toBe("webm");
  });
});

describe("detectImageType — unchanged image sniffing", () => {
  it("still identifies the supported image containers", () => {
    expect(detectImageType(head("\xff\xd8\xff\xe0"))).toBe("image/jpeg");
    expect(detectImageType(head("\x89PNG\r\n\x1a\n"))).toBe("image/png");
    expect(detectImageType(head("GIF89a"))).toBe("image/gif");
    expect(extensionFor("image/webp")).toBe("webp");
  });
});