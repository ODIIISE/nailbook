export interface MockService {
  id: string;
  name: string;
  desc: string;
  price: string;
  minutes: string;
  popular?: boolean;
}

export const SERVICES: MockService[] = [
  { id: "s1", name: "مانیکور کلاسیک", desc: "فرمدهی، کوتیکول، لاک ساده", price: "۴۵۰٬۰۰۰", minutes: "۶۰ دقیقه" },
  { id: "s2", name: "پدیکور اسپا", desc: "اسکراب، ماسک، ماساژ", price: "۶۸۰٬۰۰۰", minutes: "۹۰ دقیقه", popular: true },
  { id: "s3", name: "کاشت ناخن", desc: "تیپ یا فرمر، طراحی دلخواه", price: "۱٬۲۰۰٬۰۰۰", minutes: "۱۲۰ دقیقه" },
];

export const TOTAL = { price: "۶۸۰٬۰۰۰", time: "۹۰ دقیقه" };
