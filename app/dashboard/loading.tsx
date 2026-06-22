function SkeletonBlock({
  className,
}: {
  className: string;
}) {
  return <div className={`animate-pulse rounded-[14px] bg-white/6 ${className}`} />;
}

export default function Loading() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05080F] text-[#F0F4FF] md:h-screen">
      <div className="flex min-h-screen flex-col md:grid md:h-screen md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden h-screen border-r border-white/6 bg-[#0A0F1A] md:flex md:flex-col">
          <div className="border-b border-white/6 px-5 py-6">
            <SkeletonBlock className="h-5 w-24" />
            <SkeletonBlock className="mt-3 h-3 w-28" />
          </div>
          <div className="flex-1 space-y-6 px-3 py-4">
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-9 w-full" />
              <SkeletonBlock className="h-9 w-full" />
              <SkeletonBlock className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-9 w-full" />
              <SkeletonBlock className="h-9 w-full" />
            </div>
          </div>
          <div className="border-t border-white/6 px-5 py-4">
            <SkeletonBlock className="h-14 w-full" />
          </div>
        </aside>

        <div className="relative flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden bg-[#05080F] md:h-screen">
          <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] md:left-[220px]" />

          <div className="relative z-10 flex items-center justify-between gap-4 border-b border-white/6 px-4 py-[18px] sm:px-6 md:px-8">
            <div className="space-y-2">
              <SkeletonBlock className="h-6 w-44" />
              <SkeletonBlock className="h-3 w-56" />
            </div>
            <SkeletonBlock className="h-10 w-28 rounded-[8px]" />
          </div>

          <div className="relative z-10 flex-1 overflow-y-auto px-4 py-7 pb-28 sm:px-6 md:px-8 md:pb-8">
            <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
              <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
                <div className="rounded-[16px] border border-white/6 bg-[#0A0F1A] p-7">
                  <SkeletonBlock className="mx-auto h-3 w-28" />
                  <SkeletonBlock className="mx-auto mt-6 h-[140px] w-[140px] rounded-full" />
                  <SkeletonBlock className="mx-auto mt-4 h-3 w-48" />
                  <div className="mt-6 flex justify-center gap-2">
                    <SkeletonBlock className="h-9 w-24 rounded-[10px]" />
                    <SkeletonBlock className="h-9 w-24 rounded-[10px]" />
                    <SkeletonBlock className="h-9 w-24 rounded-[10px]" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <SkeletonBlock className="h-[140px] w-full" />
                    <SkeletonBlock className="h-[140px] w-full" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <SkeletonBlock className="h-[140px] w-full" />
                    <SkeletonBlock className="h-[140px] w-full" />
                  </div>
                  <SkeletonBlock className="h-[150px] w-full" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SkeletonBlock className="h-[124px] w-full" />
                <SkeletonBlock className="h-[124px] w-full" />
                <SkeletonBlock className="h-[124px] w-full" />
                <SkeletonBlock className="h-[124px] w-full" />
              </div>

              <div className="space-y-3">
                <SkeletonBlock className="h-12 w-48" />
                <SkeletonBlock className="h-[92px] w-full" />
                <SkeletonBlock className="h-[92px] w-full" />
                <SkeletonBlock className="h-[92px] w-full" />
              </div>

              <div className="space-y-3">
                <SkeletonBlock className="h-12 w-40" />
                <SkeletonBlock className="h-[64px] w-full" />
                <SkeletonBlock className="h-[64px] w-full" />
                <SkeletonBlock className="h-[64px] w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
