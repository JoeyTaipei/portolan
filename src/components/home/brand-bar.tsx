// HOME-1: brand bar. The plan label is display only (no payments). Brand is Portolan only.
export function BrandBar() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-[13px] font-semibold text-ink2">Market entry intelligence</p>
        <span className="rounded-[var(--r-s)] bg-[var(--plan-bg)] px-2 py-[3px] text-[12px] font-bold text-[var(--plan-ink)]">
          Pro plan
        </span>
      </div>
      <p className="m-0 text-[50px] font-bold uppercase leading-[.95] tracking-[.02em] lg:text-[40px]" aria-hidden="true">
        Portolan
      </p>
      <p className="m-0 max-w-[34ch] text-[15.5px] leading-[1.45] text-ink2">
        Charts of who decides in a new market. Every mark traces back to a source you can open.
      </p>
    </div>
  );
}
