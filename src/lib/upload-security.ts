/** Image type sniffing for uploads — the client-declared MIME is advisory. */

export type SafeImageType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

const EXT_BY_TYPE: Record<SafeImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Detect the real image type from magic bytes; null when it matches nothing. */
export function detectImageType(buffer: ArrayBuffer): SafeImageType | null {
  const b = new Uint8Array(buffer.slice(0, 16));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (
    b.length >= 12 &&
    b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46
  ) {
    return "image/gif";
  }
  if (
    b.length >= 12 &&
    b[8] === 0x52 && b[9] === 0x49 && b[10] === 0x46 && b[11] === 0x46 && // RIFF
    b[12] === 0x57 && b[13] === 0x45 && b[14] === 0x42 && b[15] === 0x50 // WEBP
  ) {
    return "image/webp";
  }
  return null;
}

/** File extension derived from the SNIFFED type — never from the client's
 * filename, which is attacker-controlled (["evil.png/../../x"] once yielded
 * a traversal-shaped extension). */
export function extensionFor(type: SafeImageType): string {
  return EXT_BY_TYPE[type];
}
