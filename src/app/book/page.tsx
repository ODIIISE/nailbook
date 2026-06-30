import { Suspense } from "react";
import BookContent from "./content";

export default function BookPage() {
  return (
    <Suspense>
      <BookContent />
    </Suspense>
  );
}
