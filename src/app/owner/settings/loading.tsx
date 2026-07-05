export default function Loading() {
  return (
    <div className="px-4 py-4 space-y-6">
      <div className="p-5 bg-muted/30 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 bg-muted rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="p-5 bg-muted/30 rounded-2xl space-y-4">
        <div className="h-5 w-28 bg-muted rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
            <div className="h-12 w-full bg-muted rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-12 w-full bg-muted rounded-xl animate-pulse" />
    </div>
  );
}
