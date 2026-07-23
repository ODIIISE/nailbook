"use client";

import { Card } from "@/components/ui/card";

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-4">
          <div className="h-3 w-20 bg-muted rounded animate-pulse mb-2" />
          <div className="h-7 w-12 bg-muted rounded animate-pulse" />
        </Card>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-3 w-24 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-6 w-16 bg-muted rounded animate-pulse" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <Card className="p-4">
      <div className="h-4 w-32 bg-muted rounded animate-pulse mb-4" />
      <div className="h-48 bg-muted rounded animate-pulse" />
    </Card>
  );
}
