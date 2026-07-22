const FA_TO_EN: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

const EN_TO_FA: Record<string, string> = {
  "0": "۰", "1": "۱", "2": "۲", "3": "۳", "4": "۴",
  "5": "۵", "6": "۶", "7": "۷", "8": "۸", "9": "۹",
};

export function normalizeDigits(input: string): string {
  return input
    .split("")
    .map((ch) => FA_TO_EN[ch] || ch)
    .join("")
    .replace(/[^0-9]/g, "")
    .replace(/^(0098|98|0)/, "0"); // Strip country code prefix, ensure starts with 0
}

export function isValidIranianPhone(phone: string): boolean {
  const clean = normalizeDigits(phone);
  return /^09\d{9}$/.test(clean);
}

export function displayDigits(input: string): string {
  return input
    .split("")
    .map((ch) => EN_TO_FA[ch] || ch)
    .join("");
}
