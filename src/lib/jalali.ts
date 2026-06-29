import * as jalaali from "jalaali-js";

const PERSIAN_WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianDigits(num: number | string): string {
  return String(num)
    .split("")
    .map((d) => PERSIAN_DIGITS[parseInt(d)] || d)
    .join("");
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
  return new Date(g.gy, g.gm - 1, g.gd);
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

export function getJalaliWeekdayName(date: Date): string {
  const dayOfWeek = date.getDay();
  const mapping = [6, 0, 1, 2, 3, 4, 5];
  return PERSIAN_WEEKDAYS[mapping[dayOfWeek]];
}

export function getJalaliMonthName(month: number): string {
  return PERSIAN_MONTHS[month - 1];
}

export function formatJalaliTime(time: string): string {
  const [h, m] = time.split(":");
  return `${toPersianDigits(h)}:${toPersianDigits(m)}`;
}

export { PERSIAN_WEEKDAYS, PERSIAN_MONTHS };
