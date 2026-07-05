export default function Loading() {
  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <div className="h-9 w-24 bg-muted rounded-xl animate-pulse" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 bg-muted/30 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
              <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
            </div>
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            <div className="flex gap-4">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
