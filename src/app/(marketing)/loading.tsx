export default function Loading() {
  return (
    <div
      className="section-dark flex min-h-[calc(100dvh-4.5rem)] items-center justify-center px-4"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div
        className="mx-auto h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"
        aria-hidden="true"
      />
      <span className="sr-only">Loading</span>
    </div>
  );
}
