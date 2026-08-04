export default function Loading() {
  // The root splash screen owns the initial loading experience. Keeping a
  // second homepage skeleton here creates a distracting flash after the splash
  // has already finished, so the route fallback stays visually quiet.
  return <div className="min-h-screen bg-background" aria-hidden="true" />;
}
