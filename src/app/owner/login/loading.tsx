export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm glass rounded-3xl p-6 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="h-4 w-40 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          <div className="h-12 w-full bg-muted rounded-xl animate-pulse" />
        </div>
        <div className="h-12 w-full bg-muted rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
