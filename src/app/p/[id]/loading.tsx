import { SiteHeader } from "@/components/site-header";

export default function LoadingPaper() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 pt-14">
          <p className="text-base text-neutral-600 sm:text-sm">
            Reading the neighborhood. First visit takes a few seconds.
          </p>
          <div className="mt-8 h-10 max-w-md rounded-lg bg-neutral-50" />
          <div className="mt-4 h-24 max-w-xl rounded-lg bg-neutral-50" />
          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="h-40 rounded-xl bg-neutral-50" />
            <div className="h-40 rounded-xl bg-neutral-50" />
            <div className="h-40 rounded-xl bg-neutral-50" />
          </div>
        </div>
      </main>
    </div>
  );
}
