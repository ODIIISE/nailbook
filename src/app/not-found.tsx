import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl font-bold text-muted-foreground/20 mb-4">۴۰۴</div>
        <h2 className="text-lg font-bold text-foreground mb-2">صفحه یافت نشد</h2>
        <p className="text-sm text-muted-foreground mb-6">
          صفحه‌ای که دنبال آن هستید وجود ندارد یا منتقل شده است.
        </p>
        <Link href="/">
          <Button variant="paper">بازگشت به صفحه اصلی</Button>
        </Link>
      </div>
    </div>
  );
}
