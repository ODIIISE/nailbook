import { Suspense } from "react";
import type { Metadata } from "next";
import SheetsHarness from "./harness";

export const metadata: Metadata = {
  title: "Sheet prototypes",
  robots: { index: false, follow: false },
};

export default function SheetPrototypesPage() {
  return (
    <Suspense fallback={null}>
      <SheetsHarness />
    </Suspense>
  );
}
