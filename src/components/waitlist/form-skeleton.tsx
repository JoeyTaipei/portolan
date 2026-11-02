/** Placeholder shaped like the waitlist form, so nothing jumps when it appears. */
export function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="skel h-16" />
      <div className="skel h-16" />
      <div className="skel h-20" />
      <div className="skel h-10" />
      <div className="skel h-11" />
    </div>
  );
}
