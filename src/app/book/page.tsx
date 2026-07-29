import { Suspense } from "react";
import type { Metadata } from "next";
import BookContent from "./content";

export const metadata: Metadata = {
  title: "رزرو نوبت | Forehand Nail Studio",
  description: "رزرو آنلاین نوبت ناخن در استدیو تخصصی ناخن فورهند — انتخاب خدمت، تاریخ و ساعت در چند مرحله ساده",
};

export default function BookPage() {
  return (
    <Suspense>
      <BookContent />
    </Suspense>
  );
}
