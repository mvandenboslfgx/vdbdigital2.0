export default function Loading() {
  return (
    <div
      className="section-dark min-h-[40vh] flex items-center justify-center px-4"
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
