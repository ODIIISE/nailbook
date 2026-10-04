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

/* ── Video sniffing (hero background) ──────────────────────────────────── */

export type SafeVideoType = "video/mp4" | "video/webm";

const VIDEO_EXT_BY_TYPE: Record<SafeVideoType, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

/* MP4 brands (bytes 8..11, the major_brand + first compatible brand) that mean
 * a real ISO-BMFF video file; WebM starts with the EBML magic. A file that only
 * *claims* to be video is exactly what this guards against, so the check reads
 * the container rather than the client's Content-Type. */
const MP4_BRANDS = new Set([
  "isom", "iso2", "iso4", "iso5", "iso6", "iso8", "iso9",
  "mp41", "mp42", "avc1", "dash", "M4V ", "M4A ", "M4B ", "mmp4",
]);

/** Detect the real video type from magic bytes; null when it matches nothing. */
export function detectVideoType(buffer: ArrayBuffer): SafeVideoType | null {
  const b = new Uint8Array(buffer.slice(0, 16));
  if (b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) {
    return "video/webm"; // EBML magic
  }
  if (b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (MP4_BRANDS.has(brand)) return "video/mp4";
    // 'qt  ' is QuickTime; it plays in Safari/Edge but not every Android
    // browser, so it is not on the allow-list.
    return null;
  }
  return null;
}

/** File extension derived from the SNIFFED video type. */
export function videoExtensionFor(type: SafeVideoType): string {
  return VIDEO_EXT_BY_TYPE[type];
}
