/** Streams in while a console page waits on the API. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4 px-5 py-5 sm:px-7">
      <div className="h-8 w-56 animate-pulse rounded-control bg-subtle" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-card bg-subtle" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-card bg-subtle" />
    </div>
  );
}
