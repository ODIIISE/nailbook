import * as jalaali from "jalaali-js";

const PERSIAN_WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];
const DAYS_IN_MONTH = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
const JS_TO_IRAN_DAY = [1, 2, 3, 4, 5, 6, 0];

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianDigits(num: number | string): string {
  return String(num)
    .split("")
    .map((d) => PERSIAN_DIGITS[parseInt(d)] || d)
    .join("");
}

export function formatPrice(price: number): string {
  const withSeparators = price.toLocaleString("en-US");
  return toPersianDigits(withSeparators);
}

export function getJalaliDate(date: Date = new Date()) {
  const j = jalaali.toJalaali(date);
  return {
    year: j.jy,
    month: j.jm,
    day: j.jd,
  };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  const g = jalaali.toGregorian(jy, jm, jd);
  // Use UTC noon to avoid timezone drift when getTehranDateKey() converts the date
  return new Date(Date.UTC(g.gy, g.gm - 1, g.gd, 12, 0, 0));
}

export function gregorianToJalali(date: Date) {
  return jalaali.toJalaali(date);
}

export function getJalaliMonthDays(year: number, month: number) {
  return jalaali.jalaaliMonthLength(year, month);
}

export function formatJalaliDate(
  year: number,
  month: number,
  day: number
): string {
  return `${toPersianDigits(day)} ${PERSIAN_MONTHS[month - 1]} ${toPersianDigits(year)}`;
}

export function formatJalaliDateShort(
  year: number,
  month: number,
  day: number
): string {
  return `${toPersianDigits(day)} ${PERSIAN_MONTHS[month - 1]}`;
}

export function getJalaliMonthName(month: number): string {
  return PERSIAN_MONTHS[month - 1];
}

export function formatJalaliTime(time: string): string {
  const [h, m] = time.split(":");
  return `${toPersianDigits(h)}:${toPersianDigits(m)}`;
}

export { PERSIAN_WEEKDAYS, PERSIAN_MONTHS, DAYS_IN_MONTH, JS_TO_IRAN_DAY };
// NOTE: JS_TO_IRAN_DAY maps JS getDay() (0=Sun) → Persian weekday index (0=Sat);
// reuse it with PERSIAN_WEEKDAYS for weekday names instead of local mappings.

export function isJalaliLeapYear(jy: number): boolean {
  return jalaali.isLeapJalaaliYear(jy);
}
