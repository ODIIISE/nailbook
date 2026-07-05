export default function Loading() {
  return (
    <div className="px-4 py-4 space-y-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl">
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-10 w-24 bg-muted rounded-xl animate-pulse" />
            <div className="h-4 w-4 bg-muted rounded animate-pulse" />
            <div className="h-10 w-24 bg-muted rounded-xl animate-pulse" />
          </div>
        </div>
      ))}
      <div className="h-12 w-full bg-muted rounded-xl animate-pulse" />
    </div>
  );
}
